import { StreamSource } from '@/types';
import { buildMagnet } from '@/lib/streaming/trackers';
import { XMLParser } from 'fast-xml-parser';


function parseQuality(text: string): '4K' | '1080p' | '720p' | '480p' | 'Auto' {
  const lower = text.toLowerCase();
  if (lower.includes('4k') || lower.includes('2160p') || lower.includes('uhd')) return '4K';
  if (lower.includes('1080p') || lower.includes('fhd')) return '1080p';
  if (lower.includes('720p') || lower.includes('hd')) return '720p';
  if (lower.includes('480p') || lower.includes('sd')) return '480p';
  return 'Auto';
}

function parseCodec(text: string): string | undefined {
  const matches: string[] = [];
  if (/x265|hevc/i.test(text)) matches.push('HEVC/x265');
  else if (/x264|avc|h\.?264/i.test(text)) matches.push('x264');
  if (/av1/i.test(text)) matches.push('AV1');
  if (/hdr10\+|hdr/i.test(text)) matches.push('HDR');
  if (/dolby\s*vision|dv/i.test(text)) matches.push('DV');
  return matches.length > 0 ? matches.join(' • ') : undefined;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export class SelfHostedAggregatorService {
  /**
   * Search Prowlarr via native JSON v1 API
   */
  public async searchProwlarr(params: {
    hostUrl: string;
    apiKey: string;
    query: string;
    mediaType?: 'movie' | 'tv';
  }): Promise<StreamSource[]> {
    const { hostUrl, apiKey, query, mediaType = 'movie' } = params;
    if (!hostUrl || !apiKey || !query.trim()) return [];

    const cleanHost = hostUrl.replace(/\/+$/, '');
    const searchType = mediaType === 'tv' ? 'tvsearch' : 'search';
    const targetUrl = `${cleanHost}/api/v1/search?query=${encodeURIComponent(query)}&type=${searchType}&categories=2000&categories=5000`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(targetUrl, {
        headers: {
          'X-Api-Key': apiKey,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        console.warn(`[Prowlarr] Returned status ${res.status}`);
        return [];
      }

      const data = await res.json();
      if (!Array.isArray(data)) return [];

      const results: StreamSource[] = [];

      for (const item of data) {
        const title = item.title || query;
        const quality = parseQuality(title);
        const codec = parseCodec(title);
        const sizeStr = item.size ? formatBytes(item.size) : undefined;
        const seeds = typeof item.seeders === 'number' ? item.seeders : undefined;
        const indexer = item.indexer || 'Prowlarr Indexer';

        let magnet = item.magnetUrl || '';
        if (!magnet && item.infoHash) {
          magnet = buildMagnet(item.infoHash, title);
        }

        if (magnet || item.downloadUrl) {
          results.push({
            id: `prowlarr-${item.infoHash || item.guid || Math.random().toString(36).substring(2, 7)}`,
            name: title,
            title,
            magnet: magnet || undefined,
            url: item.downloadUrl || undefined,
            infoHash: item.infoHash,
            quality,
            codec,
            size: sizeStr,
            seeds,
            peers: item.leechers,
            provider: `Prowlarr: ${indexer}`,
            type: 'torrent',
          });
        }
      }

      return results;
    } catch (e: any) {
      console.warn('[Prowlarr] Search error:', e.message);
      return [];
    }
  }

  /**
   * Search Jackett via Torznab XML / JSON API
   */
  public async searchJackett(params: {
    hostUrl: string;
    apiKey: string;
    query: string;
    imdbId?: string;
  }): Promise<StreamSource[]> {
    const { hostUrl, apiKey, query, imdbId } = params;
    if (!hostUrl || !apiKey || (!query.trim() && !imdbId)) return [];

    const cleanHost = hostUrl.replace(/\/+$/, '');
    let targetUrl = `${cleanHost}/api/v2.0/indexers/all/results/torznab/api?apikey=${encodeURIComponent(apiKey)}&t=search&q=${encodeURIComponent(query)}&cat=2000,5000`;
    if (imdbId) {
      targetUrl += `&imdbid=${encodeURIComponent(imdbId)}`;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(targetUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) {
        console.warn(`[Jackett] Returned status ${res.status}`);
        return [];
      }

      const xmlText = await res.text();
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
      });

      const parsed = parser.parse(xmlText);
      const items = parsed?.rss?.channel?.item;
      if (!items) return [];

      const itemsArray = Array.isArray(items) ? items : [items];
      const results: StreamSource[] = [];

      for (const item of itemsArray) {
        const title = item.title || query;
        const quality = parseQuality(title);
        const codec = parseCodec(title);

        let size: number | undefined;
        let seeds: number | undefined;
        let peers: number | undefined;
        let infoHash: string | undefined;

        // Parse Torznab attributes
        const attrs = item['torznab:attr'];
        if (attrs) {
          const attrList = Array.isArray(attrs) ? attrs : [attrs];
          for (const a of attrList) {
            const name = a['@_name'];
            const val = a['@_value'];
            if (name === 'size') size = parseInt(val, 10);
            if (name === 'seeders') seeds = parseInt(val, 10);
            if (name === 'peers') peers = parseInt(val, 10);
            if (name === 'infohash') infoHash = val;
          }
        }

        const enclosureUrl = item?.enclosure?.['@_url'] || item?.link || '';
        let magnet = enclosureUrl.startsWith('magnet:') ? enclosureUrl : '';
        if (!magnet && infoHash) {
          magnet = buildMagnet(infoHash, title);
        }

        const sizeStr = size ? formatBytes(size) : item.size ? formatBytes(item.size) : undefined;
        const indexer = item['jackettindexer']?.['#text'] || item['jackettindexer'] || 'Jackett Indexer';

        if (magnet || enclosureUrl) {
          results.push({
            id: `jackett-${infoHash || Math.random().toString(36).substring(2, 7)}`,
            name: title,
            title,
            magnet: magnet || undefined,
            url: enclosureUrl && !enclosureUrl.startsWith('magnet:') ? enclosureUrl : undefined,
            infoHash,
            quality,
            codec,
            size: sizeStr,
            seeds: seeds !== undefined ? seeds : 0,
            peers,
            provider: `Jackett: ${indexer}`,
            type: 'torrent',
          });
        }
      }

      return results;
    } catch (e: any) {
      console.warn('[Jackett] Search error:', e.message);
      return [];
    }
  }

  /**
   * Test connection to Prowlarr or Jackett instance
   */
  public async testConnection(type: 'prowlarr' | 'jackett', hostUrl: string, apiKey: string): Promise<{ success: boolean; message: string }> {
    const cleanHost = hostUrl.replace(/\/+$/, '');
    try {
      if (type === 'prowlarr') {
        const res = await fetch(`${cleanHost}/api/v1/system/status`, {
          headers: { 'X-Api-Key': apiKey },
        });
        if (res.ok) {
          const data = await res.json();
          return { success: true, message: `Connected to Prowlarr v${data.version || '1.x'}` };
        }
        return { success: false, message: `Prowlarr error: HTTP ${res.status}` };
      } else {
        const res = await fetch(`${cleanHost}/api/v2.0/indexers/all/results/torznab/api?apikey=${apiKey}&t=caps`);
        if (res.ok) {
          return { success: true, message: 'Connected to Jackett / Torznab API successfully!' };
        }
        return { success: false, message: `Jackett error: HTTP ${res.status}` };
      }
    } catch (e: any) {
      return { success: false, message: `Connection failed: ${e.message}` };
    }
  }
}

export const selfHostedAggregator = new SelfHostedAggregatorService();
