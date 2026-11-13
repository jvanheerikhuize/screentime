import { MediaItem, StreamSource } from '@/types';
import { cachedJson } from './cache';

// Internet Archive's "feature_films" collection: public-domain and freely licensed
// films that can be streamed or downloaded directly over HTTP.
const IA_BASE = 'https://archive.org';
export const IA_ID_PREFIX = 'ia-';

const SEARCH_FIELDS = ['identifier', 'title', 'year', 'description', 'subject', 'avg_rating', 'runtime'];
// Only items with an H.264 derivative, so every title is playable in the browser.
const BASE_QUERY = 'collection:feature_films AND mediatype:movies AND format:"h.264"';

export function isArchiveId(id: string | number): boolean {
  return String(id).startsWith(IA_ID_PREFIX);
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(' ') > max * 0.8 ? cut.lastIndexOf(' ') : max).trimEnd()}…`;
}

function firstString(value: unknown): string {
  if (Array.isArray(value)) return String(value[0] ?? '');
  return value == null ? '' : String(value);
}

function parseSubjects(subject: unknown): string[] {
  const raw = Array.isArray(subject) ? subject : subject ? String(subject).split(/[;,]/) : [];
  return raw
    .map((s) => String(s).trim())
    .filter((s) => s && s.length < 24 && !/^(feature film|film|movie|public domain)$/i.test(s))
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .slice(0, 3);
}

function parseRuntimeMinutes(runtime: unknown): number | undefined {
  const text = firstString(runtime);
  if (!text) return undefined;
  const parts = text.split(':').map((p) => parseInt(p, 10));
  if (parts.length >= 2 && parts.every((n) => !isNaN(n))) {
    const [h, m] = parts.length === 3 ? [parts[0], parts[1]] : [0, parts[0]];
    return h * 60 + m || undefined;
  }
  const mins = text.match(/(\d+)\s*min/i);
  return mins ? parseInt(mins[1], 10) : undefined;
}

function archiveDocToMediaItem(doc: any): MediaItem {
  const identifier = String(doc.identifier);
  const year = firstString(doc.year).slice(0, 4);
  const thumb = `${IA_BASE}/services/img/${encodeURIComponent(identifier)}`;
  return {
    id: `${IA_ID_PREFIX}${identifier}`,
    title: firstString(doc.title) || identifier,
    overview: truncate(stripHtml(firstString(doc.description)), 600),
    posterPath: thumb,
    backdropPath: thumb,
    mediaType: 'movie',
    releaseDate: year ? `${year}-01-01` : undefined,
    // Archive ratings are 0-5 stars; scale to the 0-10 range used elsewhere.
    voteAverage: doc.avg_rating ? Number((Number(doc.avg_rating) * 2).toFixed(1)) : 0,
    genres: ['Public Domain', ...parseSubjects(doc.subject)].slice(0, 3),
    duration: parseRuntimeMinutes(doc.runtime),
  };
}

function formatBytes(bytes: number): string {
  if (!bytes) return '';
  const gb = bytes / 1024 ** 3;
  return gb >= 1 ? `${gb.toFixed(2)} GB` : `${Math.round(bytes / 1024 ** 2)} MB`;
}

function qualityFromHeight(height: number): StreamSource['quality'] {
  if (height >= 2000) return '4K';
  if (height >= 1000) return '1080p';
  if (height >= 700) return '720p';
  if (height > 0) return '480p';
  return 'Auto';
}

export class InternetArchiveService {
  public async getFeatureFilms(options: { rows?: number; page?: number; query?: string } = {}): Promise<MediaItem[]> {
    const { rows = 40, page = 1, query } = options;
    const q = query ? `${BASE_QUERY} AND (title:(${query}) OR subject:(${query}))` : BASE_QUERY;
    const params = new URLSearchParams({ q, rows: String(rows), page: String(page), output: 'json' });
    SEARCH_FIELDS.forEach((f) => params.append('fl[]', f));
    params.append('sort[]', 'downloads desc');

    const data = await cachedJson(`${IA_BASE}/advancedsearch.php?${params.toString()}`, 15000);
    const docs: any[] = data?.response?.docs || [];
    return docs.filter((d) => d.identifier && d.title).map(archiveDocToMediaItem);
  }

  /** Item metadata plus every browser-playable video file as a direct stream source. */
  public async getItem(id: string): Promise<{ details: MediaItem; streams: StreamSource[] } | null> {
    const identifier = id.startsWith(IA_ID_PREFIX) ? id.slice(IA_ID_PREFIX.length) : id;
    const data = await cachedJson(`${IA_BASE}/metadata/${encodeURIComponent(identifier)}`, 15000);
    if (!data?.metadata) return null;

    const details = archiveDocToMediaItem({ ...data.metadata, identifier });
    const files: any[] = data.files || [];

    const streams: StreamSource[] = files
      .filter((f) => /\.(mp4|m4v|webm|ogv)$/i.test(f.name))
      .map((f) => {
        const height = parseInt(f.height, 10) || 0;
        const size = parseInt(f.size, 10) || 0;
        return {
          id: `ia-${identifier}-${f.name}`,
          name: `${details.title} (${f.format || f.name.split('.').pop()})`,
          title: f.name,
          url: `${IA_BASE}/download/${encodeURIComponent(identifier)}/${f.name.split('/').map(encodeURIComponent).join('/')}`,
          quality: qualityFromHeight(height),
          codec: f.format,
          size: formatBytes(size),
          provider: 'Internet Archive (Public Domain)',
          type: 'direct' as const,
          _sort: (/\.mp4$/i.test(f.name) ? 1e12 : 0) + height * 1e6 + size / 1e6,
        };
      })
      .sort((a, b) => b._sort - a._sort)
      .map(({ _sort, ...s }) => s);

    return { details, streams };
  }
}

export const internetArchiveService = new InternetArchiveService();
