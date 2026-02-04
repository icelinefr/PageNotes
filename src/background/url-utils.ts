/**
 * Normalize URL to use as storage key
 * Removes query parameters and hash fragments
 *
 * @param url - Full URL to normalize
 * @returns Normalized URL (protocol + domain + path)
 *
 * @example
 * normalizeUrl('https://example.com/page?id=123#section')
 * // => 'https://example.com/page'
 */
export function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // protocol + hostname + pathname only
    return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
  } catch (e) {
    console.error("Invalid URL:", url, e);
    return url; // Fallback to original URL
  }
}
