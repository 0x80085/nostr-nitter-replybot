import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { seckeySigner, verifier } from '@rx-nostr/crypto';
import { NostrEvent } from 'nostr-tools';
import {
  createRxForwardReq,
  createRxNostr,
  EventPacket,
  LazyFilter,
  RxNostr,
  RxReq,
  RxReqPipeable,
} from 'rx-nostr';
import WebSocket from 'ws';
import {
  cleanAndTransformUrl,
  nowInUnixTime,
  twitterStatusRegex,
} from './util';

@Injectable()
export class NostrService implements OnModuleInit {
  private secretKey: string;
  private publicKey: string;
  private nip05Url: string;
  private rxNostr: RxNostr;
  private nip05Email: string;
  private isDebugMode: boolean;

  private repliedEventsCache: Map<string, number> = new Map(); // eventId -> timestamp
  private CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes TTL

  private logger = new Logger(NostrService.name);
  rxReq: RxReq<'forward'> & {
    emit(filters: LazyFilter | LazyFilter[]): void;
  } & RxReqPipeable;

  constructor(private configService: ConfigService) {}

  /**
   * IDEA
   * Also add ThreadReaderapp support
   * if threadreader reruns 200 the thread exists, if not it it returns 301 or 302
   * or some other threadreader like app idk
   */

  onModuleInit() {
    this.isDebugMode =
      this.configService.getOrThrow<string>('IS_DEBUG_MODE') === 'true';
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

    this.initializeNostr();

    setInterval(() => this.cleanupCache(), this.CACHE_TTL_MS);
  }

  initializeNostr() {
    this.rxNostr = createRxNostr({
      signer: seckeySigner(this.secretKey),
      verifier,
      websocketCtor: WebSocket as unknown as { new (url: string): WebSocket },
    });

    this.rxNostr.setDefaultRelays([
      'wss://relay.damus.io',
      'wss://nostr.mom',
      'wss://relay.nostr.band',
    ]);

    this.rxReq = createRxForwardReq();

    this.listenForOwnEvents();
    this.listenForAllEventsWithTwitterLink();

    this.logger.log('Initialized');

    const relays = this.rxNostr.getAllRelayStatus();
    this.logger.log('Active relays:');
    this.logger.log(JSON.stringify(relays, null, 2));
  }

  private listenForOwnEvents() {
    // log incoming packets
    this.rxNostr.use(this.rxReq).subscribe((packet) => {
      if (this.isDebugMode === true) {
        this.logger.log(packet);
      }
    });

    // listen for own bot events
    this.rxReq.emit({
      //   ids: [], // use if looking for specific event ID
      since: nowInUnixTime(),
      authors: [this.publicKey], // Your bot's hex pubkey
    });
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
        this.logger.warn(`Failed to reply/transform.`);
        this.logger.error(error);
      }
    });

    // listen for events
    this.rxReq.emit({
      since: nowInUnixTime(),
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
      const xcancelList = `\n🔗 XCancel:\n\t${xcancelUrls.join('\n\t')}`;
      const poastList = `\n🔗 Poast:\n\t${poastNitterUrls.join('\n\t')}`;
      const nitterNetList = `\n🔗 Nitter.net:\n\t${nitterNetUrls.join('\n\t')}`;
      const replyMessage = `Nitter Mirror link(s):${xcancelList}${poastList}${nitterNetList}`;

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
    const nowInUnixTime = Math.floor(Date.now() / 1000);

    const tags = [
      ['e', originalEvent.id, '', 'reply'], // The event you're replying to
      ['p', originalEvent.pubkey], // The author you're replying to
      ['p', this.publicKey], // Your bot's pubkey
    ];

    try {
      this.rxNostr.send({
        kind: 1, // Text note
        content: message,
        created_at: nowInUnixTime,
        tags: tags,
      });

      if (this.isDebugMode) {
        this.logger.log(`Posted reply to event ${originalEvent.id}`);
        this.logger.debug(`Reply content: ${message}`);
      }
    } catch (error) {
      this.logger.error('Failed to post reply:', error);
    }
  }

  post(message: string) {
    const nowInUnixTime = Math.floor(Date.now() / 1000);

    return this.rxNostr.send({
      kind: 1,
      content: message,
      created_at: nowInUnixTime, // Recommended to set manually
      tags: [
        ['p', this.publicKey], // Self-reference
        ['client', 'Nostr Test Bot'],
      ], // Add any tags if needed
    });
  }

  verifyNIP05(name: string, about?: string, profileImgUrl?: string) {
    const nowInUnixTime = Math.floor(Date.now() / 1000);
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
      created_at: nowInUnixTime, // Recommended to set manually
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
