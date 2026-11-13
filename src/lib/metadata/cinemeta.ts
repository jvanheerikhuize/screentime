import { MediaItem, Season } from '@/types';
import { cachedJson } from './cache';

// Cinemeta is Stremio's public IMDb-backed metadata addon. It needs no API key,
// and every item it returns carries an IMDb id, so the stream addons can resolve it.
const CINEMETA_URL = 'https://v3-cinemeta.strem.io';

// Note: Cinemeta also exposes an `imdbRating` catalog, but it is not actually sorted by
// rating, so "highly rated" lists are derived from the popular catalog instead.
// For the `year` catalog, the `genre` extra holds the year (e.g. "2024").
export type CinemetaCatalog = 'top' | 'year';

export const CINEMETA_GENRES = [
  'Action', 'Adventure', 'Animation', 'Biography', 'Comedy', 'Crime', 'Documentary',
  'Drama', 'Family', 'Fantasy', 'History', 'Horror', 'Mystery', 'Romance',
  'Sci-Fi', 'Sport', 'Thriller', 'War', 'Western',
];

// Cinemeta returns ~50 items per page and `skip` advances in steps of 50.
const CINEMETA_PAGE_SIZE = 50;

function toStremioType(mediaType: 'movie' | 'tv'): 'movie' | 'series' {
  return mediaType === 'tv' ? 'series' : 'movie';
}

function parseRuntime(runtime?: string): number | undefined {
  if (!runtime) return undefined;
  const hours = runtime.match(/(\d+)\s*h/i);
  const mins = runtime.match(/(\d+)\s*min/i);
  const total = (hours ? parseInt(hours[1], 10) * 60 : 0) + (mins ? parseInt(mins[1], 10) : 0);
  return total || undefined;
}

function toIsoDate(value?: string): string | undefined {
  return value ? value.split('T')[0] : undefined;
}

function buildSeasons(videos: any[]): Season[] {
  const bySeason = new Map<number, Season>();
  for (const v of videos) {
    const seasonNumber = Number(v.season);
    const episodeNumber = Number(v.episode ?? v.number);
    // Season 0 holds specials, which the stream addons rarely index.
    if (!seasonNumber || !episodeNumber) continue;

    let season = bySeason.get(seasonNumber);
    if (!season) {
      season = { seasonNumber, name: `Season ${seasonNumber}`, episodeCount: 0, episodes: [] };
      bySeason.set(seasonNumber, season);
    }
    season.episodes.push({
      id: seasonNumber * 10000 + episodeNumber,
      episodeNumber,
      seasonNumber,
      name: v.name || v.title || `Episode ${episodeNumber}`,
      overview: v.overview || v.description || '',
      stillPath: v.thumbnail || null,
      airDate: toIsoDate(v.released || v.firstAired),
      voteAverage: v.rating ? Number(v.rating) : undefined,
    });
  }

  return [...bySeason.values()]
    .sort((a, b) => a.seasonNumber - b.seasonNumber)
    .map((s) => {
      s.episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
      s.episodeCount = s.episodes.length;
      return s;
    });
}

export function cinemetaToMediaItem(meta: any, mediaType: 'movie' | 'tv'): MediaItem {
  const imdbId: string = meta.imdb_id || meta.id;
  const released = toIsoDate(meta.released) || (meta.year ? `${String(meta.year).slice(0, 4)}-01-01` : undefined);

  return {
    id: imdbId,
    tmdbId: meta.moviedb_id || undefined,
    imdbId,
    title: meta.name,
    overview: meta.description || '',
    posterPath: meta.poster || `https://images.metahub.space/poster/medium/${imdbId}/img`,
    backdropPath: meta.background || `https://images.metahub.space/background/medium/${imdbId}/img`,
    mediaType,
    releaseDate: mediaType === 'movie' ? released : undefined,
    firstAirDate: mediaType === 'tv' ? released : undefined,
    voteAverage: meta.imdbRating ? Number(meta.imdbRating) : 0,
    genres: meta.genres || meta.genre || [],
    duration: parseRuntime(meta.runtime),
    trailerUrl: meta.trailers?.[0]?.source ? `https://www.youtube.com/watch?v=${meta.trailers[0].source}` : undefined,
    seasons: mediaType === 'tv' && Array.isArray(meta.videos) ? buildSeasons(meta.videos) : undefined,
  };
}

export class CinemetaService {
  /** One page (up to 100 items) of a Cinemeta catalog, optionally filtered by genre. */
  public async getCatalog(
    mediaType: 'movie' | 'tv',
    options: { catalog?: CinemetaCatalog; genre?: string; skip?: number } = {}
  ): Promise<MediaItem[]> {
    const { catalog = 'top', genre, skip = 0 } = options;
    const extras: string[] = [];
    if (genre) extras.push(`genre=${encodeURIComponent(genre)}`);
    if (skip > 0) extras.push(`skip=${skip}`);
    const extraPath = extras.length ? `/${extras.join('&')}` : '';
    const url = `${CINEMETA_URL}/catalog/${toStremioType(mediaType)}/${catalog}${extraPath}.json`;

    const data = await cachedJson(url);
    const metas: any[] = data?.metas || [];
    return metas.filter((m) => m?.name && (m.imdb_id || m.id)).map((m) => cinemetaToMediaItem(m, mediaType));
  }

  public get pageSize(): number {
    return CINEMETA_PAGE_SIZE;
  }

  /** Best-reviewed titles among the currently popular ones, sorted by IMDb rating. */
  public async getHighlyRated(mediaType: 'movie' | 'tv', minRating = 7.5, pages = 4): Promise<MediaItem[]> {
    const results = await Promise.all(
      Array.from({ length: pages }, (_, i) => this.getCatalog(mediaType, { skip: i * CINEMETA_PAGE_SIZE }).catch(() => []))
    );
    const seen = new Set<string>();
    return results
      .flat()
      .filter((m) => {
        if (m.voteAverage < minRating || seen.has(String(m.id))) return false;
        seen.add(String(m.id));
        return true;
      })
      .sort((a, b) => b.voteAverage - a.voteAverage);
  }

  public async search(query: string): Promise<MediaItem[]> {
    const q = encodeURIComponent(query.trim());
    const [movies, series] = await Promise.all([
      cachedJson(`${CINEMETA_URL}/catalog/movie/top/search=${q}.json`),
      cachedJson(`${CINEMETA_URL}/catalog/series/top/search=${q}.json`),
    ]);
    const movieItems = (movies?.metas || []).map((m: any) => cinemetaToMediaItem(m, 'movie'));
    const seriesItems = (series?.metas || []).map((m: any) => cinemetaToMediaItem(m, 'tv'));

    // Interleave so both movies and series show up near the top of the results.
    const merged: MediaItem[] = [];
    for (let i = 0; i < Math.max(movieItems.length, seriesItems.length); i++) {
      if (movieItems[i]) merged.push(movieItems[i]);
      if (seriesItems[i]) merged.push(seriesItems[i]);
    }
    return merged;
  }

  /** Full metadata, including every season and episode for series. */
  public async getMeta(imdbId: string, mediaType: 'movie' | 'tv'): Promise<MediaItem | null> {
    const data = await cachedJson(`${CINEMETA_URL}/meta/${toStremioType(mediaType)}/${encodeURIComponent(imdbId)}.json`);
    if (!data?.meta?.name) return null;
    return cinemetaToMediaItem(data.meta, mediaType);
  }
}

export const cinemetaService = new CinemetaService();
