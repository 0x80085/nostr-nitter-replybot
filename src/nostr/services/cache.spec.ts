import { Cache } from './cache';
import { Logger } from '@nestjs/common';

// Mock the Logger to prevent console output during tests
jest.mock('@nestjs/common', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    log: jest.fn(),
  })),
}));

describe('Cache', () => {
  let cache: Cache;
  const ttlMs = 100; // Short TTL for faster tests

  beforeEach(() => {
    jest.clearAllMocks();
    cache = new Cache(ttlMs);
  });

  afterEach(() => {
    // Clean up the cache interval to prevent memory leaks
    if (cache) {
      cache.destroy();
    }
    jest.clearAllTimers();
  });

  describe('constructor', () => {
    it('should create a cache instance', () => {
      expect(cache).toBeInstanceOf(Cache);
    });

    it('should create a Logger instance', () => {
      expect(Logger).toHaveBeenCalledWith('Cache');
    });
  });

  describe('cacheRepliedToEvent', () => {
    it('should cache an event', () => {
      const eventId = 'test-event-123';

      cache.cacheRepliedToEvent(eventId);

      expect(cache.hasBeenRepliedTo(eventId)).toBe(true);
    });

    it('should handle multiple events', () => {
      const eventIds = ['event-1', 'event-2', 'event-3'];

      eventIds.forEach((id) => cache.cacheRepliedToEvent(id));

      eventIds.forEach((id) => {
        expect(cache.hasBeenRepliedTo(id)).toBe(true);
      });
    });

    it('should update existing cached event', () => {
      const eventId = 'test-event-123';

      cache.cacheRepliedToEvent(eventId);
      expect(cache.hasBeenRepliedTo(eventId)).toBe(true);

      // Cache the same event again - should still be cached
      cache.cacheRepliedToEvent(eventId);
      expect(cache.hasBeenRepliedTo(eventId)).toBe(true);
    });
  });

  describe('hasBeenRepliedTo', () => {
    it('should return true for cached events', () => {
      const eventId = 'test-event-123';

      cache.cacheRepliedToEvent(eventId);

      expect(cache.hasBeenRepliedTo(eventId)).toBe(true);
    });

    it('should return false for non-cached events', () => {
      const eventId = 'non-existent-event';

      expect(cache.hasBeenRepliedTo(eventId)).toBe(false);
    });

    it('should return false for empty string event ID', () => {
      expect(cache.hasBeenRepliedTo('')).toBe(false);
    });

    it('should handle case-sensitive event IDs', () => {
      cache.cacheRepliedToEvent('EventId');

      expect(cache.hasBeenRepliedTo('EventId')).toBe(true);
      expect(cache.hasBeenRepliedTo('eventid')).toBe(false);
      expect(cache.hasBeenRepliedTo('EVENTID')).toBe(false);
    });
  });

  describe('cache expiration', () => {
    it(
      'should remove expired events after TTL',
      (done) => {
        const eventId = 'expiring-event';

        cache.cacheRepliedToEvent(eventId);
        expect(cache.hasBeenRepliedTo(eventId)).toBe(true);

        // Wait for TTL + cleanup interval to ensure cleanup runs
        setTimeout(() => {
          expect(cache.hasBeenRepliedTo(eventId)).toBe(false);
          done();
        }, ttlMs * 2); // Wait for 2x TTL to be sure cleanup occurred
      },
      ttlMs * 3,
    ); // Set test timeout to 3x TTL

    it('should keep events that are not expired', (done) => {
      const eventId = 'valid-event';

      cache.cacheRepliedToEvent(eventId);
      expect(cache.hasBeenRepliedTo(eventId)).toBe(true);

      // Wait less than TTL to verify event is still cached
      setTimeout(() => {
        expect(cache.hasBeenRepliedTo(eventId)).toBe(true);
        done();
      }, ttlMs / 2); // Wait for half the TTL
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in event IDs', () => {
      const specialEventIds = [
        'event-with-dashes',
        'event_with_underscores',
        'event.with.dots',
        'event/with/slashes',
        'event@with@symbols',
        '123-numeric-start',
      ];

      specialEventIds.forEach((id) => {
        cache.cacheRepliedToEvent(id);
        expect(cache.hasBeenRepliedTo(id)).toBe(true);
      });
    });

    it('should handle very long event IDs', () => {
      const longEventId = 'a'.repeat(1000);

      cache.cacheRepliedToEvent(longEventId);
      expect(cache.hasBeenRepliedTo(longEventId)).toBe(true);
    });

    it('should handle rapid successive operations', () => {
      const eventIds = Array.from({ length: 100 }, (_, i) => `event-${i}`);

      // Cache all events rapidly
      eventIds.forEach((id) => cache.cacheRepliedToEvent(id));

      // Verify all are cached
      eventIds.forEach((id) => {
        expect(cache.hasBeenRepliedTo(id)).toBe(true);
      });
    });
  });

  describe('memory management', () => {
    it(
      'should prevent unbounded cache growth through TTL cleanup',
      (done) => {
        const eventIds = Array.from({ length: 10 }, (_, i) => `event-${i}`);

        // Cache events
        eventIds.forEach((id) => cache.cacheRepliedToEvent(id));

        // Verify all are cached
        eventIds.forEach((id) => {
          expect(cache.hasBeenRepliedTo(id)).toBe(true);
        });

        // Wait for cleanup to occur (cleanup interval = TTL, plus time for entries to expire)
        setTimeout(
          () => {
            // Check if cleanup occurred - some or all events should be removed
            const remainingEvents = eventIds.filter((id) =>
              cache.hasBeenRepliedTo(id),
            );
            expect(remainingEvents.length).toBeLessThan(eventIds.length);
            done();
          },
          ttlMs * 2 + 50,
        ); // Wait for 2 intervals plus buffer
      },
      ttlMs * 3,
    ); // Increase test timeout
  });
});
