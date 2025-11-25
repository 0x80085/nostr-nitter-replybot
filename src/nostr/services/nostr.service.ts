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
import WebSocket from 'ws';
import { cleanAndTransformUrl, twitterStatusRegex } from './util';
import { catchError, delay, filter, of, take, tap } from 'rxjs';

type NostrEventId = string;
type Timestamp = number;

@Injectable()
export class NostrService implements OnModuleInit {
  private secretKey: string;
  private publicKey: string;
  private nip05Url: string;
  private rxNostr: RxNostr;
  private nip05Email: string;
  private isDebugMode: boolean;

  private nostrRelays: string[];
  private repliedEventsCache: Map<NostrEventId, Timestamp> = new Map();
  private CACHE_TTL_MS: number;
  private RECONNECTION_DELAY_MS: number;

  private logger = new Logger(NostrService.name);

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

    // Configuration values with defaults
    this.CACHE_TTL_MS =
      parseInt(this.configService.get<string>('CACHE_TTL_MINUTES', '30')) *
      60 *
      1000;
    this.RECONNECTION_DELAY_MS =
      parseInt(
        this.configService.get<string>('RECONNECTION_DELAY_SECONDS', '60'),
      ) * 1000;

    this.initializeNostr();

    setInterval(() => this.cleanupCache(), this.CACHE_TTL_MS);
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
        tap(({ from, state }) => {
          this.logger.debug(
            'Relay connection state changed:',
            `from: ${from} `,
            `>> to ${state}`,
          );
          switch (state) {
            case 'error':
            case 'rejected':
            case 'terminated': {
              this.logger.error(
                `[connection] ${new Date().toISOString()} from: ${from || 'unknown'} state: ${state || 'unknown'}`,
              );
              break;
            }
            case 'waiting-for-retrying':
            case 'retrying':
            case 'dormant': {
              this.logger.warn(
                `[connection] ${new Date().toISOString()} from: ${from || 'unknown'} state: ${state || 'unknown'}`,
              );
              break;
            }
            case 'initialized':
            case 'connecting':
            case 'connected':
            default: {
              this.logger.debug(
                `[connection] ${new Date().toISOString()} from: ${from || 'unknown'} state: ${state || 'unknown'}`,
              );
              break;
            }
          }
        }),
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

    this.listenForAllEventsWithTwitterLink();

    this.logger.log('Initialized');

    const relays = this.rxNostr.getAllRelayStatus();
    this.logger.log('Active relays:');
    this.logger.log(JSON.stringify(relays, null, 2));
  }

  private listenForAllEventsWithTwitterLink() {
    // log incoming packets with Twitter/X links
    this.rxNostr.use(this.rxReq).subscribe((packet) => {
      try {
        if (packet.event.kind === 1) {
          const wasAlreadyRepliedTo = this.hasBeenRepliedTo(packet.event.id);
          if (wasAlreadyRepliedTo) {
            return;
          }

          this.parseTwitterUrls(packet);
          this.cacheRepliedToEvent(packet.event.id);
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

  private parseTwitterUrls(packet: EventPacket) {
    const content = packet.event.content;
    const matches = [...content.matchAll(twitterStatusRegex)];

    if (matches.length > 0) {
      // Generate clean xcancel URLs
      this.logger.log(
        `Found ${matches.length} Twitter/X links in event ${packet.event.id}\nInitiating cleaning, transforming and replying...`,
      );

      const xcancelUrls = matches.map((match) =>
        cleanAndTransformUrl(match[0], 'https://xcancel.com'),
      );

      const poastNitterUrls = matches.map((match) =>
        cleanAndTransformUrl(match[0], 'https://nitter.poast.org'),
      );
      const nitterNetUrls = matches.map((match) =>
        cleanAndTransformUrl(match[0], 'https://nitter.net'),
      );

      // Create reply message
      const xcancelList = `🔗 XCancel:\n${xcancelUrls.join('\n')}\n`;
      const poastList = `🔗 Poast:\n${poastNitterUrls.join('\n')}\n`;
      const nitterNetList = `🔗 Nitter:\n${nitterNetUrls.join('\n')}\n`;
      const replyMessage = `Nitter Mirror link(s)\n\n${xcancelList}${poastList}${nitterNetList}`;

      // Post reply
      this.logger.log(`Transformation & cleaning completed`);
      this.logger.log(`Original post:`);
      this.logger.log(`---`);
      this.logger.log(`Author: ${packet.event.pubkey}`);
      this.logger.log(`Content: ${content}`);
      this.logger.log(`---`);
      this.logger.log(`Posting reply with xcancel links: ${replyMessage}`);

      if (this.isDebugMode) {
        this.logger.log(
          '🪲 DEBUG MODE ON - ONLY LOGS INSTEAD OF PUBLISHING REPLY',
        );
        this.logger.log('--start--');
        this.logger.log(replyMessage);
        this.logger.log('--end--');
      } else {
        this.logger.log('🚨 DEBUG MODE OFF 🚨 - PUBLISHING REPLY TO NOSTR');
        this.replyToEvent(packet.event, replyMessage);
        this.logger.log('OK Published reply');
      }
    }
  }

  private replyToEvent(originalEvent: NostrEvent, message: string): void {
    const tags = [
      ['e', originalEvent.id, '', 'reply'], // The event you're replying to
      ['p', originalEvent.pubkey], // The author you're replying to
      ['p', this.publicKey], // Your bot's pubkey
    ];

    try {
      this.rxNostr
        .send({
          kind: 1, // Text note
          content: message,
          created_at: now(),
          tags: tags,
        })
        .pipe(
          take(1),
          tap(),
          catchError((e) => {
            this.logger.warn(`Couldn't post reply`);
            this.logger.warn(e);
            return of(null);
          }),
        )
        .subscribe();

      if (this.isDebugMode) {
        this.logger.log(`Posted reply to event ${originalEvent.id}`);
        this.logger.debug(`Reply content: ${message}`);
      }
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

  private cacheRepliedToEvent(eventId: string): void {
    this.repliedEventsCache.set(eventId, Date.now());
  }

  private hasBeenRepliedTo(eventId: string): boolean {
    return this.repliedEventsCache.has(eventId);
  }

  private cleanupCache(): void {
    this.logger.log(`Cleaning up event cache...`);
    const now = Date.now();
    const threshold = now - this.CACHE_TTL_MS;
    let removedEventCount = 0;

    // Remove all entries older than the TTL
    this.repliedEventsCache.forEach((timestamp, eventId) => {
      if (timestamp < threshold) {
        removedEventCount++;
        this.repliedEventsCache.delete(eventId);
      }
    });
    this.logger.log(
      `OK cleaned [${removedEventCount}] events, [${this.repliedEventsCache.size} left in cache]`,
    );
  }
}
