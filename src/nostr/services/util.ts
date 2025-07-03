export function cleanAndTransformUrl(
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

export const nowInUnixTime = () => Math.floor(Date.now() / 1000);

export const twitterStatusRegex =
  /https?:\/\/(?:www\.)?(?:x\.com|twitter\.com)\/(\w+)\/status(?:es)?\/(\d+)(?:[^\s?]+)?/gi;
