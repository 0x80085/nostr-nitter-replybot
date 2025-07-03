import { Module } from '@nestjs/common';
import { NostrService } from './services/nostr.service';

@Module({
  providers: [NostrService],
  exports: [NostrService],
})
export class NostrModule {}
