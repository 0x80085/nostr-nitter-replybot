import { Logger } from '@nestjs/common';

type NostrEventId = string;
type Timestamp = number;

export class Cache {
  private CACHE_TTL_MS: number;
  private repliedEventsCache: Map<NostrEventId, Timestamp> = new Map();
  private logger = new Logger(Cache.name);

  constructor(ttl: number) {
    this.CACHE_TTL_MS = ttl;

    setInterval(() => this.cleanupCache(), this.CACHE_TTL_MS);
  }

  cacheRepliedToEvent(eventId: string): void {
    this.repliedEventsCache.set(eventId, Date.now());
  }

  hasBeenRepliedTo(eventId: string): boolean {
    return this.repliedEventsCache.has(eventId);
  }

  private cleanupCache(): void {
    this.logger.log(`Cleaning up event cache...`);
    const now = Date.now();
    const threshold = now - this.CACHE_TTL_MS;
    let removedEventCount = 0;

    const expiredEntries = this.getExpiredCacheEntries(
      this.repliedEventsCache,
      (timestamp) => timestamp < threshold,
    );

    expiredEntries.forEach((eventId) => {
      this.repliedEventsCache.delete(eventId);
      removedEventCount++;
    });

    this.logger.log(
      `OK cleaned [${removedEventCount}] events, [${this.repliedEventsCache.size} left in cache]`,
    );
  }

  private getExpiredCacheEntries<K, V>(
    cache: Map<K, V>,
    isExpired: (value: V) => boolean,
  ): K[] {
    const expiredKeys: K[] = [];
    cache.forEach((value, key) => {
      if (isExpired(value)) {
        expiredKeys.push(key);
      }
    });
    return expiredKeys;
  }
}
