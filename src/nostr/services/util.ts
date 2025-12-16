export const twitterStatusRegex =
  /https?:\/\/(?:www\.)?(?:x\.com|twitter\.com)\/(\w+)\/status(?:es)?\/(\d+)(?:[^\s?]+)?/gi;

export function cleanAndReplaceTwitterUrl(
  twitterUrl: string,
  nitterHostUrl: string,
): string {
  // Remove tracking parameters (everything after ? or &)
  const cleanUrl = twitterUrl.split(/[?&]/)[0];

  return cleanUrl.replace(
    /https?:\/\/(?:www\.)?(?:x\.com|twitter\.com)/i,
    nitterHostUrl,
  );
}

export function parseTwitterUrls(
  note: string,
  twitterAlts: Record<string, string>,
): Record<string, string[]> {
  const matches = [...note.matchAll(twitterStatusRegex)];
  if (matches.length === 0) {
    return {};
  }

  const twitterAltUrls: Record<string, string[]> = {};

  Object.entries(twitterAlts).forEach(([altName, altHost]) => {
    twitterAltUrls[altName] = matches.map((match) =>
      cleanAndReplaceTwitterUrl(match[0], altHost),
    );
  });
  return twitterAltUrls;
}

export const redditThreadRegex =
  /https?:\/\/(?:www\.)?reddit\.com\/r\/([\w_]+)\/comments\/([\w]+)(?:[^\s?]+)?/gi;

export function cleanAndReplaceRedditUrl(
  redditUrl: string,
  altRedditHostUrl: string,
): string {
  // Remove tracking parameters (everything after ? or &)
  const cleanUrl = redditUrl.split(/[?&]/)[0];

  return cleanUrl.replace(
    /https?:\/\/(?:www\.)?reddit\.com/i,
    altRedditHostUrl,
  );
}

export function parseRedditUrls(
  redditUrl: string,
  redditAlts: Record<string, string>,
): Record<string, string[]> {
  const matches = [...redditUrl.matchAll(redditThreadRegex)];
  if (matches.length === 0) {
    return {};
  }

  const redditAltUrls: Record<string, string[]> = {};

  Object.entries(redditAlts).forEach(([altName, altHost]) => {
    redditAltUrls[altName] = matches.map((match) =>
      cleanAndReplaceRedditUrl(match[0], altHost),
    );
  });
  return redditAltUrls;
}

export function buildTwitterSection(
  twitterUrlMappings: Record<string, string[]>,
): string {
  if (Object.values(twitterUrlMappings).every((urls) => urls.length === 0))
    return '';

  const sections = Object.entries(twitterUrlMappings)
    .filter(([, urls]) => urls.length > 0)
    .map(([service, urls]) => `🔗 ${service}:\n${urls.join('\n')}\n`);

  return `Nitter Mirror link(s)\n\n${sections.join('')}`;
}

export function buildRedditSection(
  redditUrlMappings: Record<string, string[]>,
): string {
  if (Object.values(redditUrlMappings).every((urls) => urls.length === 0))
    return '';

  const sections = Object.entries(redditUrlMappings)
    .filter(([, urls]) => urls.length > 0)
    .map(([service, urls]) => `🔗 ${service}:\n${urls.join('\n')}\n`);

  return `\nReddit alternative link(s)\n\n${sections.join('')}`;
}

export function buildReplyMessage(
  twitterUrlMappings: Record<string, string[]>,
  redditUrlMappings: Record<string, string[]>,
): string {
  const twitterSection = buildTwitterSection(twitterUrlMappings);
  const redditSection = buildRedditSection(redditUrlMappings);
  return twitterSection + redditSection;
}

export function countReplacedLinks(
  twitterUrlMappings: Record<string, string[]>,
  redditUrlMappings: Record<string, string[]>,
): number {
  const twitterLinksCount = Object.values(twitterUrlMappings)[0]?.length || 0;
  const redditLinksCount = Object.values(redditUrlMappings)[0]?.length || 0;
  const totalLinksReplaced = twitterLinksCount + redditLinksCount;
  return totalLinksReplaced;
}

export const nowInUnixTime = () => Math.floor(Date.now() / 1000);
