import { Module } from '@nestjs/common';
import { NostrInteractorService } from './services/nostr-interactor/nostr-interactor.service';
import { ReplyCacheService } from './services/reply-cache/reply-cache.service';

@Module({
  providers: [NostrInteractorService, ReplyCacheService],
  exports: [NostrInteractorService],
})
export class NostrModule {}
