import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { seckeySigner, verifier } from '@rx-nostr/crypto';
import { NostrEvent } from 'nostr-tools';
import {
  createRxForwardReq,
  createRxNostr,
  EventPacket,
  LazyFilter,
  now,
  RxNostr,
  RxReq,
  RxReqPipeable,
} from 'rx-nostr';
import { catchError, delay, filter, of, take, tap } from 'rxjs';
import WebSocket from 'ws';
import {
  buildReplyMessage,
  countReplacedLinks,
  nowInUnixTime,
  parseRedditUrls,
  parseTwitterUrls,
} from './util';
import { Cache } from './cache';
import { logConnectionState } from './connection.util';

@Injectable()
export class NostrService implements OnModuleInit {
  private secretKey: string;
  private publicKey: string;
  private nip05Url: string;
  private rxNostr: RxNostr;
  private nip05Email: string;
  private isDebugMode: boolean;

  private nostrRelays: string[];
  private RECONNECTION_DELAY_MS: number;
  private ignoredNpubs: string[];

  private logger = new Logger(NostrService.name);
  private cache: Cache;

  private readonly redditAlts = {
    troddit: 'https://www.troddit.com',
    'redlib.privacyredirect (FIN)': 'https://redlib.privacyredirect.com',
    'redlib.catsarch (US)': 'https://redlib.catsarch.com',
  };
  private readonly twitterAlts = {
    XCancel: 'https://xcancel.com',
    Poast: 'https://nitter.poast.org',
    Nitter: 'https://nitter.net',
  };

  rxReq: RxReq<'forward'> & {
    emit(filters: LazyFilter | LazyFilter[]): void;
  } & RxReqPipeable;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.isDebugMode =
      this.configService.get<string>('IS_DEBUG_MODE') === 'true';

    this.secretKey = this.configService.getOrThrow<string>(
      'NOSTR_BOT_PRIVATE_KEY',
    );
    this.publicKey = this.configService.getOrThrow<string>(
      'NOSTR_BOT_PUBLIC_KEY',
    );
    this.nip05Url = this.configService.getOrThrow<string>(
      'NIP05_VERIFICATION_DOMAIN_URL',
    );
    this.nip05Email = this.configService.getOrThrow<string>(
      'NIP05_VERIFICATION_DOMAIN_EMAIL',
    );
    this.nostrRelays = this.configService
      .get<string>('NOSTR_RELAYS', '')
      .split(',')
      .map((r) => r.trim())
      .filter((r) => r.length > 0);

    // Initialize blocked npubs
    const configBlockedNpubs = this.configService
      .get<string>('IGNORED_AUTHORS', '')
      .split(',')
      .map((npub) => npub.trim())
      .filter((npub) => npub.length > 0);

    this.ignoredNpubs = [
      this.publicKey, // Always block self
      ...configBlockedNpubs,
    ];

    this.logger.log(`Blocked npubs: ${this.ignoredNpubs.length} total`);
    if (this.isDebugMode) {
      this.logger.debug(`Blocked npubs: ${this.ignoredNpubs.join(', ')}`);
    }

    // Configuration values with defaults
    const cacheTtl =
      parseInt(this.configService.get<string>('CACHE_TTL_MINUTES', '30')) *
      60 *
      1000;
    this.RECONNECTION_DELAY_MS =
      parseInt(
        this.configService.get<string>('RECONNECTION_DELAY_SECONDS', '60'),
      ) * 1000;

    this.cache = new Cache(cacheTtl);

    this.initializeNostr();
  }

  initializeNostr() {
    this.rxNostr = createRxNostr({
      signer: seckeySigner(this.secretKey),
      verifier,
      websocketCtor: WebSocket as unknown as { new (url: string): WebSocket },
    });

    const defaultRelays = [
      'wss://relay.damus.io',
      'wss://nostr.mom',
      'wss://relay.nostr.band',
    ];
    const hasCustomRelays = this.nostrRelays.length > 0;
    this.logger.log(
      `Using Nostr relays: ${
        hasCustomRelays
          ? this.nostrRelays.join(', ')
          : `${defaultRelays.join(', ')} (default)`
      }`,
    );

    this.rxNostr.setDefaultRelays(
      hasCustomRelays ? this.nostrRelays : defaultRelays,
    );

    this.rxReq = createRxForwardReq();

    // Reconnection handling
    this.rxNostr
      .createConnectionStateObservable()
      .pipe(
        logConnectionState(this.logger),
        // only emit error state
        filter((packet) => packet.state === 'error'),
        // Wait configured time before reconnect.
        delay(this.RECONNECTION_DELAY_MS),
      )
      .subscribe((packet) => {
        // Reconnect to the relay on error after delay
        this.logger.debug('Reconnecting to relay:', packet.from);
        this.rxNostr.reconnect(packet.from);
      });

    this.listenForAllEventsWithReplacableLinks();

    this.logger.log('Initialized');

    const relays = this.rxNostr.getAllRelayStatus();
    this.logger.log('Active relays:');
    this.logger.log(JSON.stringify(relays, null, 2));
  }

  private listenForAllEventsWithReplacableLinks() {
    this.rxNostr.use(this.rxReq).subscribe((packet) => {
      try {
        if (packet.event.kind === 1) {
          // Check if author is blocked (including self)
          if (this.isAuthorIgnored(packet.event.pubkey)) {
            this.logger.debug(
              `Skipping event ${packet.event.id} from blocked author: ${packet.event.pubkey}`,
            );
            return;
          }

          const wasAlreadyRepliedTo = this.cache.hasBeenRepliedTo(
            packet.event.id,
          );
          if (wasAlreadyRepliedTo) {
            return;
          }

          const twitterUrlMappings = parseTwitterUrls(
            packet.event.content,
            this.twitterAlts,
          );

          const redditUrlMappings = parseRedditUrls(
            packet.event.content,
            this.redditAlts,
          );

          const hasReplacedLinks =
            Object.keys(twitterUrlMappings).length > 0 ||
            Object.keys(redditUrlMappings).length > 0;

          if (hasReplacedLinks) {
            this.handleReplacedUrlsFound(
              packet,
              twitterUrlMappings,
              redditUrlMappings,
            );
          }
        }
      } catch (error) {
        this.logger.warn(`Failed to reply/transform. See info below:`);
        this.logger.error(error);
      }
    });

    // listen for events
    this.rxReq.emit({
      since: now,
      authors: [], // Empty array means listen to all authors
      kinds: [1], // Only listen to kind 1 (text notes)
    });
  }

  private isAuthorIgnored(pubkey: string): boolean {
    return this.ignoredNpubs.includes(pubkey);
  }

  private getConnectedRelayUrl(): string {
    const relayStatus = this.rxNostr.getAllRelayStatus();

    // Find a relay that's connected
    for (const [url, status] of Object.entries(relayStatus)) {
      if (status && typeof status === 'object' && 'state' in status) {
        if (status.state === 'connected' || status.state === 'connecting') {
          return url;
        }
      }
    }

    // Fallback to first configured relay or empty string
    return this.nostrRelays.length > 0 ? this.nostrRelays[0] : '';
  }

  private handleReplacedUrlsFound(
    packet: EventPacket,
    twitterUrlMappings: Record<string, string[]>,
    redditUrlMappings: Record<string, string[]>,
  ): void {
    this.logger.log(
      `Found ${countReplacedLinks(twitterUrlMappings, redditUrlMappings)} Twitter/X or Reddit links in event ${packet.event.id}\nCreating reply...`,
    );

    const replyMessage = buildReplyMessage(
      twitterUrlMappings,
      redditUrlMappings,
    );

    this.logger.log(`Transformation & cleaning completed`);
    this.logger.log(`Original post:`);
    this.logger.log(`Author: ${packet.event.pubkey}`);
    this.logger.log(`Original Note Content:
--start--
${packet.event.content}
--end--
`);

    this.logger.log('Reply message content:');
    this.logger.log(`
--start--
${replyMessage}
--end--
        `);

    if (this.isDebugMode) {
      this.logger.log(
        '🪲 DEBUG MODE ON - ONLY LOGGED REPLY INSTEAD OF PUBLISHING',
      );
      // Cache event in debug mode since we're not actually posting
      this.cache.cacheRepliedToEvent(packet.event.id);
    } else {
      this.logger.log('🚨 DEBUG MODE OFF 🚨 - PUBLISHING REPLY TO NOSTR');
      this.replyToEvent(packet.event, replyMessage);
      this.logger.log('OK Published reply');
    }
  }

  private replyToEvent(originalEvent: NostrEvent, message: string): void {
    const tags: string[][] = [];
    const relayUrl = this.getConnectedRelayUrl();

    // SIMPLIFIED APPROACH: Always use the working pattern
    // Both root and reply tags point to the original event (like working example)
    tags.push(['e', originalEvent.id, '', 'root', originalEvent.pubkey]);
    tags.push(['e', originalEvent.id, '', 'reply', originalEvent.pubkey]);

    // Collect all mentioned authors
    const mentionedAuthors = new Set<string>();
    mentionedAuthors.add(originalEvent.pubkey);

    // Add all authors from original event's p tags
    const originalPTags =
      originalEvent.tags?.filter((tag) => tag[0] === 'p') || [];
    for (const pTag of originalPTags) {
      if (pTag[1] && pTag[1].length === 64) {
        mentionedAuthors.add(pTag[1]);
      }
    }

    // Remove bot's own pubkey
    mentionedAuthors.delete(this.publicKey);

    // Add all mentioned authors as p tags
    for (const pubkey of mentionedAuthors) {
      tags.push(['p', pubkey]);
    }

    try {
      this.rxNostr
        .send({
          kind: 1,
          content: message,
          created_at: nowInUnixTime(),
          tags: tags,
        })
        .pipe(
          take(1),
          tap(() => {
            this.cache.cacheRepliedToEvent(originalEvent.id);
            if (!this.isDebugMode) {
              this.logger.log(`Posted reply to event ${originalEvent.id}`);
              this.logger.debug(`Reply content: ${message}`);
              this.logger.debug(`Tags: ${JSON.stringify(tags)}`);
            }
          }),
          catchError((error: unknown) => {
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error';
            this.logger.warn(
              `Couldn't post reply to ${originalEvent.id}: ${errorMessage}`,
            );
            return of(null);
          }),
        )
        .subscribe();
    } catch (error) {
      this.logger.error('Failed to post reply:', error);
    }
  }

  post(message: string) {
    return this.rxNostr.send({
      kind: 1,
      content: message,
      created_at: now(), // Recommended to set manually
      tags: [
        ['p', this.publicKey], // Self-reference
        ['client', 'Nostr Test Bot'],
      ], // Add any tags if needed
    });
  }

  verifyNIP05(name: string, about?: string, profileImgUrl?: string) {
    const metadata = {
      name,
      nip05: this.nip05Email,
    };

    if (about) {
      metadata['about'] = about;
    }
    if (profileImgUrl) {
      metadata['picture'] = profileImgUrl;
    }

    return this.rxNostr.send({
      kind: 0,
      content: JSON.stringify(metadata),
      created_at: now(), // Recommended to set manually
      tags: [],
    });
  }

  getRelaysStatus() {
    return JSON.stringify(this.rxNostr.getAllRelayStatus());
  }
}
