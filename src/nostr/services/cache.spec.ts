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
    let mockDate: jest.SpyInstance;
    let testCache: Cache;

    beforeEach(() => {
      jest.useFakeTimers();
      mockDate = jest.spyOn(Date, 'now');
      mockDate.mockReturnValue(1000); // Start at a fixed timestamp
      testCache = new Cache(ttlMs); // Create cache with mocked time
    });

    afterEach(() => {
      if (testCache) {
        testCache.destroy();
      }
      jest.useRealTimers();
      mockDate.mockRestore();
    });

    it('should remove expired events after TTL', () => {
      const eventId = 'expiring-event';

      testCache.cacheRepliedToEvent(eventId);
      expect(testCache.hasBeenRepliedTo(eventId)).toBe(true);

      // Advance Date.now() past TTL
      mockDate.mockReturnValue(1000 + ttlMs + 1);

      // Advance timers to trigger cleanup interval
      jest.advanceTimersByTime(ttlMs);

      expect(testCache.hasBeenRepliedTo(eventId)).toBe(false);
    });

    it('should keep events that are not expired', () => {
      const eventId = 'valid-event';

      testCache.cacheRepliedToEvent(eventId);
      expect(testCache.hasBeenRepliedTo(eventId)).toBe(true);

      // Advance Date.now() but not past TTL
      mockDate.mockReturnValue(1000 + ttlMs / 2);

      // Trigger cleanup interval
      jest.advanceTimersByTime(ttlMs);

      expect(testCache.hasBeenRepliedTo(eventId)).toBe(true);
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
    it('should prevent unbounded cache growth through TTL cleanup', () => {
      jest.useFakeTimers();
      const mockDate = jest.spyOn(Date, 'now');
      mockDate.mockReturnValue(2000); // Different base time

      const testCache = new Cache(ttlMs);
      const eventIds = Array.from({ length: 10 }, (_, i) => `event-${i}`);

      // Cache events
      eventIds.forEach((id) => testCache.cacheRepliedToEvent(id));

      // Verify all are cached
      eventIds.forEach((id) => {
        expect(testCache.hasBeenRepliedTo(id)).toBe(true);
      });

      // Advance time past TTL
      mockDate.mockReturnValue(2000 + ttlMs + 1);
      jest.advanceTimersByTime(ttlMs);

      // All events should be removed
      const remainingEvents = eventIds.filter((id) =>
        testCache.hasBeenRepliedTo(id),
      );
      expect(remainingEvents.length).toBe(0);

      testCache.destroy();
      jest.useRealTimers();
      mockDate.mockRestore();
    });
  });
});
