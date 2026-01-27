import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache } from './cache';

type NostrEventId = string;
type Timestamp = number;

@Injectable()
export class ReplyCacheService {
  private readonly logger = new Logger(ReplyCacheService.name);
  private cache: Cache;

  constructor(private config: ConfigService) {
    const CACHE_TTL_MS =
      parseInt(this.config.get<string>('CACHE_TTL_MINUTES', '30')) * 60 * 1000;
    this.logger.log(
      `Initializing ReplyCacheServiceService... with TTL (ms): ${CACHE_TTL_MS}`,
    );
    this.cache = new Cache(CACHE_TTL_MS);
  }

  onModuleDestroy() {
    this.logger.log(`onModuleDestroy ReplyCacheServiceService...`);
    this.cache.destroy(); // not sure if needed - just to be safe
  }

  destroy(): void {
    this.cache.destroy();
  }

  cacheRepliedToEvent(eventId: string): void {
    this.cache.cacheRepliedToEvent(eventId);
  }

  hasBeenRepliedTo(eventId: string): boolean {
    return this.cache.hasBeenRepliedTo(eventId);
  }

  getEntries(): Map<NostrEventId, Timestamp> {
    return this.cache.getEntries();
  }
}
