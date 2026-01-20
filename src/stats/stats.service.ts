import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NostrService } from '../nostr/services/nostr.service';
import * as fs from 'fs';
import * as path from 'path';
import { RelayStatus } from 'rx-nostr/dist/rx-nostr/interface';

export interface StatsData {
  notesPostedToday: number;
  cacheEntries: number;
  cacheSizeMB: number;
  relayCount: number;
  totalRelayCount: number;
  cacheTTL: number;
  debugMode: boolean;
  lastRefresh: string;
  nextCacheCleanup: string;
  relayList: Array<{
    url: string;
    status: RelayStatus;
  }>;
  npub: string;
  npubLink: string;
  botVersion: string;
}

@Injectable()
export class StatsService {
  private statsTemplate: string | null = null;
  private isDebugMode: boolean;
  private publicKey: string;
  private cacheTtl: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly nostrService: NostrService,
  ) {
    this.isDebugMode =
      this.configService.get<string>('IS_DEBUG_MODE') === 'true';

    this.publicKey = this.configService.getOrThrow<string>(
      'NOSTR_BOT_PUBLIC_KEY',
    );
    this.cacheTtl = parseInt(
      this.configService.get<string>('CACHE_TTL_MINUTES', '30'),
    );
  }

  private loadTemplate(): string {
    if (this.statsTemplate) {
      return this.statsTemplate;
    }

    try {
      // Path resolves to dist/templates/stats.html when running from built code
      const templatePath = path.join(
        __dirname,
        '..',
        '..',
        'templates',
        'stats.html',
      );
      this.statsTemplate = fs.readFileSync(templatePath, 'utf8');
      return this.statsTemplate;
    } catch (error) {
      console.error('Error reading stats template:', error);
      return '<html><body><h1>Error loading statistics page</h1></body></html>';
    }
  }

  private collectStatsData(): StatsData {
    const relays = this.nostrService.getRelaysStatus();
    const connectedRelaysCount = Object.values(relays).filter(
      (r) => r.connection === 'connected',
    ).length;
    const totalRelaysCount = Object.keys(relays).length;
    const relayList = Object.entries(relays).map(([url, status]) => ({
      url,
      status,
    }));

    // Calculate cache size
    const cacheSizeMB = this.calculateCacheSizeMB();
    const cacheEntries = this.getCacheEntriesCount();
    const nextCacheCleanup = new Date(
      Date.now() + this.cacheTtl * 60 * 1000,
    ).toLocaleString();

    // Mock data for now - replace with actual implementations
    const statsData: StatsData = {
      notesPostedToday: this.nostrService.getDailyRepliesCount(),
      cacheEntries,
      cacheSizeMB,
      relayCount: connectedRelaysCount,
      totalRelayCount: totalRelaysCount,
      cacheTTL: this.cacheTtl,
      debugMode: this.isDebugMode,
      lastRefresh: new Date().toLocaleString(),
      nextCacheCleanup,
      relayList,
      npub: this.publicKey,
      npubLink: `https://primal.net/p/${this.publicKey}#replies`,
      botVersion:
        this.configService.get<string>('VERSION') || 'version unknown',
    };

    return statsData;
  }

  private calculateCacheSizeMB(): number {
    try {
      const estimatedEntries = this.getCacheEntriesCount();

      // If no cache entries, return 0
      if (estimatedEntries === 0) {
        return 0;
      }

      // Estimate memory usage:
      // - Each cache key (event ID): ~64 bytes (hex string)
      // - Each timestamp: ~8 bytes (number)
      // - Map overhead: ~24 bytes per entry
      // Total per entry: ~96 bytes
      const bytesPerEntry = 96;
      const totalBytes = estimatedEntries * bytesPerEntry;

      // Add some overhead for Map structure itself only if we have entries
      const overheadBytes = 1024; // 1KB base overhead
      const totalBytesWithOverhead = totalBytes + overheadBytes;

      // Convert to MB
      const sizeInMB = totalBytesWithOverhead / (1024 * 1024);

      return sizeInMB;
    } catch (error) {
      console.error('Error calculating cache size:', error);
      return 0;
    }
  }

  private getCacheEntriesCount(): number {
    const entries = this.nostrService.getCacheEntries();
    return entries.length;
  }

  private generateRelayListHTML(relayList: StatsData['relayList']): string {
    return relayList
      .map(
        (relay) => `
        <div class="relay-item">
          <span class="relay-url">${relay.url}</span>
          <span class="relay-status ${relay.status.connection}">${relay.status.connection.toUpperCase()}</span>
        </div>`,
      )
      .join('');
  }

  private replaceTokens(template: string, data: StatsData): string {
    const relayListHTML = this.generateRelayListHTML(data.relayList);

    return template
      .replace(/{{NOTES_POSTED_TODAY}}/g, data.notesPostedToday.toString())
      .replace(/{{CACHE_ENTRIES}}/g, data.cacheEntries.toString())
      .replace(/{{CACHE_SIZE_MB}}/g, data.cacheSizeMB.toFixed(4))
      .replace(/{{RELAY_COUNT}}/g, `${data.relayCount}/${data.totalRelayCount}`)
      .replace(/{{CACHE_TTL}}/g, data.cacheTTL.toString())
      .replace(/{{DEBUG_MODE}}/g, data.debugMode ? 'ON' : 'OFF')
      .replace(/{{LAST_REFRESH}}/g, data.lastRefresh)
      .replace(/{{NEXT_CACHE_CLEANUP}}/g, data.nextCacheCleanup)
      .replace(/{{RELAY_LIST}}/g, relayListHTML)
      .replace(/{{NPUB}}/g, data.npub)
      .replace(/{{NPUB_LINK}}/g, data.npubLink)
      .replace(/{{BOT_VERSION}}/g, data.botVersion);
  }

  generateStatsHTML(): string {
    const template = this.loadTemplate();
    const data = this.collectStatsData();
    return this.replaceTokens(template, data);
  }

  getStatsData(): StatsData {
    return this.collectStatsData();
  }

  clearTemplateCache(): void {
    this.statsTemplate = null;
  }
}
