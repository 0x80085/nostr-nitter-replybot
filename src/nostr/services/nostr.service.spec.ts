import { Test, TestingModule } from '@nestjs/testing';
import { NostrService } from './nostr.service';
import { ConfigService } from '@nestjs/config';

describe('NostrService', () => {
  let service: NostrService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NostrService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                IS_DEBUG_MODE: 'false',
                NOSTR_BOT_PRIVATE_KEY: 'test-private-key',
                NOSTR_BOT_PUBLIC_KEY: 'test-public-key',
                NIP05_VERIFICATION_DOMAIN_URL: 'https://test.com',
                NOSTR_RELAYS: 'wss://relay.test.com',
                RECONNECTION_DELAY_MS: '5000',
                NIP05_EMAIL: 'test@test.com',
              };
              return config[key] as string;
            }),
            getOrThrow: jest.fn((key: string): string => {
              const config: Record<string, string> = {
                NOSTR_BOT_PRIVATE_KEY: 'test-private-key',
                NOSTR_BOT_PUBLIC_KEY: 'test-public-key',
                NIP05_VERIFICATION_DOMAIN_URL: 'https://test.com',
                NOSTR_RELAYS: 'wss://relay.test.com',
                RECONNECTION_DELAY_MS: '5000',
                NIP05_EMAIL: 'test@test.com',
              };
              if (config[key] === undefined) {
                throw new Error(`Config key ${key} not found`);
              }
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<NostrService>(NostrService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
