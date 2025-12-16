import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigService } from '@nestjs/config';
import { NostrService } from './nostr/services/nostr.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string): string | undefined => {
              const config: Record<string, string> = {
                APP_TOKEN: 'test-token',
              };
              return config[key];
            }),
          },
        },
        {
          provide: NostrService,
          useValue: {
            // Mock methods that might be used by AppController
            publishMessage: jest.fn(),
            getRelays: jest.fn(() => ['wss://relay.test.com']),
            updateNIP05Profile: jest.fn(),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello 🪿!"', () => {
      expect(appController.getHello()).toBe('Hello 🪿!');
    });
  });
});
