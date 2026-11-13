/** Stremio addon list helpers, shared by the settings UI and the server. */

export const DEFAULT_ADDON_URLS = [
  'https://torrentio.strem.fun',
  'https://mediafusion.elfhosted.com',
];

// Public addon instances that have shut down; dropped from saved settings too.
const RETIRED_ADDON_HOSTS = ['knightcrawler.elfhosted.com'];

/**
 * Keeps valid http(s) addon URLs (max 10, without trailing slashes or /manifest.json) and
 * drops retired public instances; falls back to the defaults if nothing is left.
 */
export function cleanAddonUrls(urls: string[] | undefined | null): string[] {
  const kept: string[] = [];
  for (const raw of urls || []) {
    try {
      const url = new URL(raw.trim());
      if (!/^https?:$/.test(url.protocol) || RETIRED_ADDON_HOSTS.includes(url.hostname)) continue;
      const clean = url.toString().replace(/\/manifest\.json$/, '').replace(/\/+$/, '');
      if (!kept.includes(clean)) kept.push(clean);
    } catch {
      // not a URL
    }
  }
  return kept.length > 0 ? kept.slice(0, 10) : DEFAULT_ADDON_URLS;
}

/** True when the list is just the built-in defaults (so it needn't be sent to the server). */
export function isDefaultAddonList(urls: string[]): boolean {
  return urls.length === DEFAULT_ADDON_URLS.length && urls.every((u, i) => u === DEFAULT_ADDON_URLS[i]);
}
