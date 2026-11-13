import { Episode, MediaItem } from '@/types';
import { getAnimeIds } from '@/lib/metadata/animeIds';

/**
 * AniList (graphql.anilist.co): keyless anime catalog and metadata.
 * Rate limit 30-90 requests/min per IP, so every query is cached for 30 minutes.
 */
const ANILIST = 'https://graphql.anilist.co';
const TTL_MS = 30 * 60 * 1000;
export const ANILIST_PAGE_SIZE = 50;

export type AnimeCatalog = 'trending' | 'popular' | 'top' | 'season';
export const ANIME_CATALOGS: AnimeCatalog[] = ['trending', 'popular', 'top', 'season'];
export const ANIME_GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mecha', 'Music', 'Mystery',
  'Psychological', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller',
];

const SORT: Record<AnimeCatalog, string> = {
  trending: 'TRENDING_DESC',
  popular: 'POPULARITY_DESC',
  top: 'SCORE_DESC',
  season: 'POPULARITY_DESC',
};

const MEDIA_FIELDS = `
  id
  title { romaji english }
  description(asHtml: false)
  coverImage { extraLarge large }
  bannerImage
  format
  status
  episodes
  duration
  averageScore
  genres
  startDate { year month day }
  nextAiringEpisode { episode airingAt }
`;

/* eslint-disable @typescript-eslint/no-explicit-any */
const store = new Map<string, { expires: number; value: any }>();

async function gql(query: string, variables: Record<string, unknown>): Promise<any | null> {
  const key = JSON.stringify([query, variables]);
  const hit = store.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  try {
    const res = await fetch(ANILIST, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(12000),
      cache: 'no-store',
    });
    if (!res.ok) {
      console.warn(`[anilist] HTTP ${res.status}`);
      return hit?.value ?? null; // serve stale data when rate-limited
    }
    const json = await res.json();
    if (store.size > 300) store.delete(store.keys().next().value!);
    store.set(key, { expires: Date.now() + TTL_MS, value: json.data });
    return json.data;
  } catch (e: any) {
    console.warn(`[anilist] request failed: ${e?.message || e}`);
    return hit?.value ?? null;
  }
}

function cleanDescription(text?: string | null): string {
  return (text || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\(Source:[^)]*\)/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function isoDate(d?: { year?: number; month?: number; day?: number }): string | undefined {
  if (!d?.year) return undefined;
  return `${d.year}-${String(d.month || 1).padStart(2, '0')}-${String(d.day || 1).padStart(2, '0')}`;
}

/** Episodes that have aired so far (or the full count once finished). */
function airedEpisodes(m: any): number {
  if (m.nextAiringEpisode?.episode) return Math.max(0, m.nextAiringEpisode.episode - 1);
  return m.episodes || (m.status === 'RELEASING' ? 0 : 1);
}

export function anilistToMediaItem(m: any): MediaItem {
  const isMovie = m.format === 'MOVIE';
  const date = isoDate(m.startDate);
  return {
    id: `al-${m.id}`,
    title: m.title?.english || m.title?.romaji || 'Untitled',
    originalTitle: m.title?.romaji || undefined,
    overview: cleanDescription(m.description),
    posterPath: m.coverImage?.extraLarge || m.coverImage?.large || null,
    backdropPath: m.bannerImage || null,
    mediaType: isMovie ? 'movie' : 'tv',
    releaseDate: isMovie ? date : undefined,
    firstAirDate: isMovie ? undefined : date,
    voteAverage: m.averageScore ? Math.round(m.averageScore) / 10 : 0,
    genres: ['Anime', ...(m.genres || []).filter((g: string) => g !== 'Ecchi' && g !== 'Hentai')],
    duration: isMovie ? m.duration || undefined : undefined,
    anime: { anilistId: m.id },
  };
}

function currentSeason(): { season: string; year: number } {
  const now = new Date();
  const month = now.getMonth() + 1;
  if (month === 12) return { season: 'WINTER', year: now.getFullYear() + 1 };
  if (month <= 2) return { season: 'WINTER', year: now.getFullYear() };
  if (month <= 5) return { season: 'SPRING', year: now.getFullYear() };
  if (month <= 8) return { season: 'SUMMER', year: now.getFullYear() };
  return { season: 'FALL', year: now.getFullYear() };
}

export async function getAnimeCatalog(options: {
  catalog?: AnimeCatalog;
  genre?: string;
  page?: number;
  perPage?: number;
}): Promise<{ items: MediaItem[]; hasMore: boolean }> {
  const { catalog = 'trending', genre, page = 1, perPage = ANILIST_PAGE_SIZE } = options;
  const seasonVars = catalog === 'season' ? currentSeason() : null;
  const query = `
    query ($page: Int, $perPage: Int, $sort: [MediaSort], $genre: String, $season: MediaSeason, $seasonYear: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { hasNextPage }
        media(type: ANIME, isAdult: false, sort: $sort, genre: $genre, season: $season, seasonYear: $seasonYear,
              format_in: [TV, TV_SHORT, MOVIE, ONA]) { ${MEDIA_FIELDS} }
      }
    }`;
  const data = await gql(query, {
    page,
    perPage,
    sort: [SORT[catalog]],
    genre: genre && ANIME_GENRES.includes(genre) ? genre : undefined,
    season: seasonVars?.season,
    seasonYear: seasonVars?.year,
  });
  const media: any[] = data?.Page?.media || [];
  return { items: media.map(anilistToMediaItem), hasMore: Boolean(data?.Page?.pageInfo?.hasNextPage) };
}

export async function searchAnime(search: string, perPage = 10): Promise<MediaItem[]> {
  const data = await gql(
    `query ($search: String, $perPage: Int) {
      Page(perPage: $perPage) { media(type: ANIME, isAdult: false, search: $search, sort: SEARCH_MATCH) { ${MEDIA_FIELDS} } }
    }`,
    { search, perPage }
  );
  return (data?.Page?.media || []).map(anilistToMediaItem);
}

/** Full details: episode list plus the ids needed to find streams and subtitles. */
export async function getAnimeDetails(anilistId: number): Promise<MediaItem | null> {
  const [data, ids] = await Promise.all([
    gql(
      `query ($id: Int) { Media(id: $id, type: ANIME) { ${MEDIA_FIELDS} streamingEpisodes { title } } }`,
      { id: anilistId }
    ),
    getAnimeIds(anilistId),
  ]);
  const m = data?.Media;
  if (!m) return null;
  const item = anilistToMediaItem(m);
  item.anime = { anilistId, ...ids };
  item.imdbId = undefined; // anime streams are looked up by Kitsu id, not IMDb

  if (item.mediaType === 'tv') {
    const count = airedEpisodes(m);
    // AniList's streaming episode titles look like "Episode 3 - The Title".
    const titles = new Map<number, string>();
    for (const se of m.streamingEpisodes || []) {
      const match = /^Episode\s+(\d+)\s*[-:]\s*(.+)$/i.exec(se?.title || '');
      if (match) titles.set(Number(match[1]), match[2].trim());
    }
    const episodes: Episode[] = Array.from({ length: count }, (_, i) => ({
      id: anilistId * 10000 + i + 1,
      episodeNumber: i + 1,
      seasonNumber: 1,
      name: titles.get(i + 1) || `Episode ${i + 1}`,
      overview: '',
      stillPath: null,
    }));
    item.seasons = [{ seasonNumber: 1, name: 'Episodes', episodeCount: count, episodes }];
  }
  return item;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
