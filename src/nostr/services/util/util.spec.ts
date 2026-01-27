import {
  buildReplyMessage,
  buildTwitterSection,
  cleanAndReplaceTwitterUrl,
  parseTwitterUrls,
  redditThreadRegex,
  twitterStatusRegex,
} from './util';

describe('Twitter URL utilities', () => {
  describe('twitterStatusRegex', () => {
    beforeEach(() => {
      // Reset regex lastIndex to ensure consistent test results
      twitterStatusRegex.lastIndex = 0;
    });

    it('should match standard Twitter URLs', () => {
      const text =
        'Check out this tweet: https://twitter.com/user/status/123456789';
      const matches = [...text.matchAll(twitterStatusRegex)];
      expect(matches).toHaveLength(1);
      expect(matches[0][0]).toBe('https://twitter.com/user/status/123456789');
    });

    it('should match X.com URLs', () => {
      const text = 'Check out this post: https://x.com/user/status/123456789';
      const matches = [...text.matchAll(twitterStatusRegex)];
      expect(matches).toHaveLength(1);
      expect(matches[0][0]).toBe('https://x.com/user/status/123456789');
    });

    it('should match URLs with www prefix', () => {
      const text = 'Check out: https://www.twitter.com/user/status/123456789';
      const matches = [...text.matchAll(twitterStatusRegex)];
      expect(matches).toHaveLength(1);
      expect(matches[0][0]).toBe(
        'https://www.twitter.com/user/status/123456789',
      );
    });

    it('should match HTTP URLs (not just HTTPS)', () => {
      const text = 'Check out: http://twitter.com/user/status/123456789';
      const matches = [...text.matchAll(twitterStatusRegex)];
      expect(matches).toHaveLength(1);
      expect(matches[0][0]).toBe('http://twitter.com/user/status/123456789');
    });

    it('should match URLs with query parameters', () => {
      const text =
        'Check out: https://twitter.com/user/status/123456789?s=20&t=abc123';
      const matches = [...text.matchAll(twitterStatusRegex)];
      expect(matches).toHaveLength(1);
      expect(matches[0][0]).toBe(
        'https://twitter.com/user/status/123456789?s=20&t=abc123',
      );
    });

    it('should NOT include trailing Japanese punctuation in URL match', () => {
      // This is the key test case for the bug fix
      const text =
        'https://twitter.com/siroiwannko1/status/2000149580797907179」';
      const matches = [...text.matchAll(twitterStatusRegex)];
      expect(matches).toHaveLength(1);
      expect(matches[0][0]).toBe(
        'https://twitter.com/siroiwannko1/status/2000149580797907179',
      );
      expect(matches[0][0]).not.toContain('」');
    });

    it('should NOT include trailing Chinese/Japanese punctuation', () => {
      const testCases = [
        'https://twitter.com/user/status/123456789。', // Japanese period
        'https://twitter.com/user/status/123456789，', // Chinese comma
        'https://twitter.com/user/status/123456789！', // Japanese exclamation
        'https://twitter.com/user/status/123456789？', // Japanese question mark
      ];

      testCases.forEach((text) => {
        twitterStatusRegex.lastIndex = 0; // Reset regex
        const matches = [...text.matchAll(twitterStatusRegex)];
        expect(matches).toHaveLength(1);
        expect(matches[0][0]).toBe('https://twitter.com/user/status/123456789');
      });
    });

    it('should NOT include markdown link formatting', () => {
      const testCases = [
        '[Link text](https://twitter.com/user/status/123456789)',
        '([Link text in brackets](https://twitter.com/user/status/123456789))',
        'Check this out: [Click here](https://twitter.com/user/status/123456789)',
      ];

      testCases.forEach((text) => {
        twitterStatusRegex.lastIndex = 0; // Reset regex
        const matches = [...text.matchAll(twitterStatusRegex)];
        expect(matches).toHaveLength(1);
        expect(matches[0][0]).toBe('https://twitter.com/user/status/123456789');
      });
    });

    it('should handle URLs followed by whitespace correctly', () => {
      const text =
        'Check this out https://twitter.com/user/status/123456789 amazing tweet!';
      const matches = [...text.matchAll(twitterStatusRegex)];
      expect(matches).toHaveLength(1);
      expect(matches[0][0]).toBe('https://twitter.com/user/status/123456789');
    });

    it('should match multiple URLs in the same text', () => {
      const text =
        'First: https://twitter.com/user1/status/111 and second: https://x.com/user2/status/222';
      const matches = [...text.matchAll(twitterStatusRegex)];
      expect(matches).toHaveLength(2);
      expect(matches[0][0]).toBe('https://twitter.com/user1/status/111');
      expect(matches[1][0]).toBe('https://x.com/user2/status/222');
    });

    it('should handle URLs with valid path characters', () => {
      const text = 'https://twitter.com/user/status/123456789/photo/1';
      const matches = [...text.matchAll(twitterStatusRegex)];
      expect(matches).toHaveLength(1);
      expect(matches[0][0]).toBe(
        'https://twitter.com/user/status/123456789/photo/1',
      );
    });

    it('should handle URLs followed by punctuation and text', () => {
      const testCases = [
        {
          text: 'Check this https://twitter.com/user/status/123. Great tweet!',
          expectedUrl: 'https://twitter.com/user/status/123.',
          description:
            'URL with trailing period should include the period as it could be part of URL path',
        },
        {
          text: 'Check this https://twitter.com/user/status/123 amazing!',
          expectedUrl: 'https://twitter.com/user/status/123',
          description: 'URL followed by space should not include trailing text',
        },
      ];

      testCases.forEach(({ text, expectedUrl }) => {
        twitterStatusRegex.lastIndex = 0; // Reset regex
        const matches = [...text.matchAll(twitterStatusRegex)];
        expect(matches).toHaveLength(1);
        expect(matches[0][0]).toBe(expectedUrl);
      });
    });
  });

  describe('cleanAndReplaceTwitterUrl', () => {
    it('should replace twitter.com with nitter host', () => {
      const result = cleanAndReplaceTwitterUrl(
        'https://twitter.com/user/status/123',
        'https://nitter.net',
      );
      expect(result).toBe('https://nitter.net/user/status/123');
    });

    it('should replace x.com with nitter host', () => {
      const result = cleanAndReplaceTwitterUrl(
        'https://x.com/user/status/123',
        'https://nitter.net',
      );
      expect(result).toBe('https://nitter.net/user/status/123');
    });

    it('should remove query parameters', () => {
      const result = cleanAndReplaceTwitterUrl(
        'https://twitter.com/user/status/123?s=20&t=abc',
        'https://nitter.net',
      );
      expect(result).toBe('https://nitter.net/user/status/123');
    });

    it('should handle URLs with fragments', () => {
      const result = cleanAndReplaceTwitterUrl(
        'https://twitter.com/user/status/123&utm_source=share',
        'https://nitter.net',
      );
      expect(result).toBe('https://nitter.net/user/status/123');
    });
  });

  describe('parseTwitterUrls', () => {
    const twitterAlts = {
      Nitter: 'https://nitter.net',
      Poast: 'https://nitter.poast.org',
    };

    it('should parse single Twitter URL', () => {
      const note = 'Check out: https://twitter.com/user/status/123456789';
      const result = parseTwitterUrls(note, twitterAlts);

      expect(result.Nitter).toHaveLength(1);
      expect(result.Nitter[0]).toBe('https://nitter.net/user/status/123456789');
      expect(result.Poast).toHaveLength(1);
      expect(result.Poast[0]).toBe(
        'https://nitter.poast.org/user/status/123456789',
      );
    });

    it('should handle URLs with Japanese punctuation correctly', () => {
      const note =
        'https://twitter.com/siroiwannko1/status/2000149580797907179」';
      const result = parseTwitterUrls(note, twitterAlts);

      expect(result.Nitter).toHaveLength(1);
      expect(result.Nitter[0]).toBe(
        'https://nitter.net/siroiwannko1/status/2000149580797907179',
      );
      expect(result.Nitter[0]).not.toContain('」');
      expect(result.Poast[0]).not.toContain('」');
    });

    it('should return empty object for no matches', () => {
      const note = 'Just some regular text with no Twitter links';
      const result = parseTwitterUrls(note, twitterAlts);

      expect(result).toEqual({});
    });

    it('should parse multiple URLs', () => {
      const note =
        'First: https://twitter.com/user1/status/111 and https://x.com/user2/status/222';
      const result = parseTwitterUrls(note, twitterAlts);

      expect(result.Nitter).toHaveLength(2);
      expect(result.Nitter[0]).toBe('https://nitter.net/user1/status/111');
      expect(result.Nitter[1]).toBe('https://nitter.net/user2/status/222');
    });
  });

  describe('buildTwitterSection', () => {
    it('should build formatted section with URLs', () => {
      const mappings = {
        Nitter: ['https://nitter.net/user/status/123'],
        Poast: ['https://nitter.poast.org/user/status/123'],
      };

      const result = buildTwitterSection(mappings);
      expect(result).toContain('Nitter Mirror link(s)');
      expect(result).toContain('🔗 Nitter:');
      expect(result).toContain('🔗 Poast:');
      expect(result).toContain('https://nitter.net/user/status/123');
      expect(result).toContain('https://nitter.poast.org/user/status/123');
    });

    it('should return empty string for no URLs', () => {
      const mappings = {
        Nitter: [],
        Poast: [],
      };

      const result = buildTwitterSection(mappings);
      expect(result).toBe('');
    });
  });

  describe('buildReplyMessage', () => {
    it('should build combined reply message', () => {
      const twitterMappings = {
        Nitter: ['https://nitter.net/user/status/123'],
      };
      const redditMappings = {
        troddit: ['https://www.troddit.com/r/test/comments/123'],
      };

      const result = buildReplyMessage(twitterMappings, redditMappings);
      expect(result).toContain('Nitter Mirror link(s)');
      expect(result).toContain('Reddit alternative link(s)');
    });

    it('should handle empty mappings', () => {
      const result = buildReplyMessage({}, {});
      expect(result).toBe('');
    });
  });
});

describe('Reddit URL utilities', () => {
  describe('redditThreadRegex', () => {
    beforeEach(() => {
      // Reset regex lastIndex to ensure consistent test results
      redditThreadRegex.lastIndex = 0;
    });

    it('should match standard Reddit URLs', () => {
      const text =
        'Check out: https://reddit.com/r/programming/comments/abc123';
      const matches = [...text.matchAll(redditThreadRegex)];
      expect(matches).toHaveLength(1);
      expect(matches[0][0]).toBe(
        'https://reddit.com/r/programming/comments/abc123',
      );
    });

    it('should match Reddit URLs with www prefix', () => {
      const text =
        'Check out: https://www.reddit.com/r/programming/comments/abc123';
      const matches = [...text.matchAll(redditThreadRegex)];
      expect(matches).toHaveLength(1);
      expect(matches[0][0]).toBe(
        'https://www.reddit.com/r/programming/comments/abc123',
      );
    });

    it('should match Reddit URLs with additional path segments', () => {
      const text =
        'Check out: https://reddit.com/r/programming/comments/abc123/cool_post_title/';
      const matches = [...text.matchAll(redditThreadRegex)];
      expect(matches).toHaveLength(1);
      expect(matches[0][0]).toBe(
        'https://reddit.com/r/programming/comments/abc123/cool_post_title/',
      );
    });

    it('should NOT include markdown link formatting', () => {
      const testCases = [
        '[Reddit post](https://reddit.com/r/programming/comments/abc123)',
        '([Reddit link](https://reddit.com/r/programming/comments/abc123))',
        'Check this out: [Cool post](https://reddit.com/r/programming/comments/abc123)',
      ];

      testCases.forEach((text) => {
        redditThreadRegex.lastIndex = 0; // Reset regex
        const matches = [...text.matchAll(redditThreadRegex)];
        expect(matches).toHaveLength(1);
        expect(matches[0][0]).toBe(
          'https://reddit.com/r/programming/comments/abc123',
        );
      });
    });

    it('should handle multiple Reddit URLs in the same text', () => {
      const text =
        'First: https://reddit.com/r/programming/comments/111 and second: https://reddit.com/r/javascript/comments/222';
      const matches = [...text.matchAll(redditThreadRegex)];
      expect(matches).toHaveLength(2);
      expect(matches[0][0]).toBe(
        'https://reddit.com/r/programming/comments/111',
      );
      expect(matches[1][0]).toBe(
        'https://reddit.com/r/javascript/comments/222',
      );
    });

    it('should handle HTTP URLs (not just HTTPS)', () => {
      const text = 'Check out: http://reddit.com/r/programming/comments/abc123';
      const matches = [...text.matchAll(redditThreadRegex)];
      expect(matches).toHaveLength(1);
      expect(matches[0][0]).toBe(
        'http://reddit.com/r/programming/comments/abc123',
      );
    });
  });
});
