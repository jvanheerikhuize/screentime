import type { MediaItem } from '../types/index.ts';

const STORAGE_KEY = 'screentime_taste_v1';

export interface TasteProfile {
  /** Cumulative affinity score per genre name (e.g. { "Sci-Fi": 12, "Action": 8 }). */
  genreScores: Record<string, number>;
  /** Genres explicitly pinned by the user on the Home taste bar. */
  favoriteGenres: string[];
  /** Titles the user hearted/liked. */
  likedItems: MediaItem[];
  /** Recently shown Hero IDs so opening the app never shows the same movie twice in a row. */
  recentHeroIds: string[];
}

const DEFAULT_PROFILE: TasteProfile = {
  genreScores: {},
  favoriteGenres: [],
  likedItems: [],
  recentHeroIds: [],
};

export const POPULAR_TASTE_GENRES = [
  'Action',
  'Sci-Fi',
  'Comedy',
  'Thriller',
  'Drama',
  'Crime',
  'Horror',
  'Fantasy',
  'Animation',
  'Mystery',
  'Adventure',
  'Documentary',
  'Romance',
] as const;

export function getTasteProfile(): TasteProfile {
  if (typeof window === 'undefined') return DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    const parsed = JSON.parse(raw);
    return {
      genreScores: parsed?.genreScores && typeof parsed.genreScores === 'object' ? parsed.genreScores : {},
      favoriteGenres: Array.isArray(parsed?.favoriteGenres) ? parsed.favoriteGenres : [],
      likedItems: Array.isArray(parsed?.likedItems) ? parsed.likedItems : [],
      recentHeroIds: Array.isArray(parsed?.recentHeroIds) ? parsed.recentHeroIds : [],
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

function saveTasteProfile(profile: TasteProfile): TasteProfile {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // ignore storage quota errors
    }
  }
  return profile;
}

/** Boost affinity for a title's genres when the user views (+1), plays (+3), or likes (+5) it. */
export function recordMediaInteraction(item: MediaItem, weight = 1): TasteProfile {
  const profile = getTasteProfile();
  const nextScores = { ...profile.genreScores };
  for (const genre of item.genres || []) {
    if (!genre) continue;
    nextScores[genre] = (nextScores[genre] || 0) + weight;
  }
  return saveTasteProfile({ ...profile, genreScores: nextScores });
}

export function isMediaLiked(id: string | number, profile = getTasteProfile()): boolean {
  const key = String(id);
  return profile.likedItems.some((m) => String(m.id) === key || (m.imdbId && m.imdbId === key));
}

export function toggleLikedMedia(item: MediaItem): { liked: boolean; profile: TasteProfile } {
  const profile = getTasteProfile();
  const key = String(item.id);
  const exists = profile.likedItems.some((m) => String(m.id) === key);
  const nextScores = { ...profile.genreScores };
  for (const g of item.genres || []) {
    if (!g) continue;
    nextScores[g] = Math.max(0, (nextScores[g] || 0) + (exists ? -4 : 5));
  }
  const nextLiked = exists
    ? profile.likedItems.filter((m) => String(m.id) !== key)
    : [item, ...profile.likedItems.filter((m) => String(m.id) !== key)].slice(0, 60);

  const saved = saveTasteProfile({
    ...profile,
    genreScores: nextScores,
    likedItems: nextLiked,
  });
  return { liked: !exists, profile: saved };
}

export function toggleFavoriteGenre(genre: string): TasteProfile {
  const profile = getTasteProfile();
  const has = profile.favoriteGenres.includes(genre);
  const favoriteGenres = has
    ? profile.favoriteGenres.filter((g) => g !== genre)
    : [...profile.favoriteGenres, genre];
  const nextScores = { ...profile.genreScores };
  nextScores[genre] = Math.max(0, (nextScores[genre] || 0) + (has ? -6 : 8));
  return saveTasteProfile({
    ...profile,
    favoriteGenres,
    genreScores: nextScores,
  });
}

export function rememberHeroId(id: string | number): TasteProfile {
  const profile = getTasteProfile();
  const key = String(id);
  const recentHeroIds = [key, ...profile.recentHeroIds.filter((x) => x !== key)].slice(0, 12);
  return saveTasteProfile({ ...profile, recentHeroIds });
}

/** Calculate a personalization score for a MediaItem based on the user's TasteProfile. */
export function scoreMediaForUser(item: MediaItem, profile: TasteProfile): number {
  let score = (item.voteAverage || 6.5) * 0.6;
  const genres = item.genres || [];
  for (const g of genres) {
    if (profile.favoriteGenres.includes(g)) score += 10;
    if (profile.genreScores[g]) score += Math.min(15, profile.genreScores[g] * 1.5);
  }
  if (isMediaLiked(item.id, profile)) score += 6;
  return score;
}

/** Fisher-Yates shuffle with optional bias toward higher-scored items. */
export function weightedShuffle<T>(items: T[], scoreFn: (item: T) => number): T[] {
  return [...items]
    .map((item) => ({
      item,
      // Exponential random weight (Efraimidis-Spirakis style) + jitter so order is fresh every load
      sortKey: scoreFn(item) + Math.random() * 8,
    }))
    .sort((a, b) => b.sortKey - a.sortKey)
    .map((x) => x.item);
}

/**
 * Pick a randomized, high-quality Hero title tailored to the user's taste,
 * avoiding recently shown Hero IDs so every app load / shuffle feels fresh.
 */
export function pickRandomHero(
  rows: { key: string; items: MediaItem[] }[],
  profile: TasteProfile,
  excludeId?: string | number
): MediaItem | null {
  const seen = new Set<string>();
  const candidates: MediaItem[] = [];

  for (const row of rows) {
    if (row.key === 'open-movies') continue;
    for (const item of row.items) {
      const id = String(item.id);
      if (seen.has(id)) continue;
      seen.add(id);
      if (!item.backdropPath || !item.overview) continue;
      candidates.push(item);
    }
  }

  if (candidates.length === 0) return null;

  const excludeKey = excludeId !== undefined ? String(excludeId) : null;
  const recentSet = new Set(profile.recentHeroIds);

  // Filter out the currently displayed hero and recently shown heroes when possible.
  let pool = candidates.filter((c) => String(c.id) !== excludeKey && !recentSet.has(String(c.id)));
  if (pool.length === 0) {
    pool = candidates.filter((c) => String(c.id) !== excludeKey);
  }
  if (pool.length === 0) pool = candidates;

  // If the user has favorite genres, prefer candidates matching at least one favorite genre when available.
  if (profile.favoriteGenres.length > 0) {
    const favMatches = pool.filter((c) => (c.genres || []).some((g) => profile.favoriteGenres.includes(g)));
    if (favMatches.length >= 3) pool = favMatches;
  }

  // Score and take the top 15 candidates, then pick one at random weighted by score.
  const ranked = weightedShuffle(pool, (item) => scoreMediaForUser(item, profile));
  const topSlice = ranked.slice(0, Math.min(12, ranked.length));
  const chosen = topSlice[Math.floor(Math.random() * topSlice.length)] || ranked[0];
  return chosen;
}

/**
 * Build personalized & freshly shuffled Home rows:
 * 1. Prepends a "Picked for You" row tailored to the user's genre taste (and a "Liked" row if non-empty).
 * 2. Lightly shuffles each catalog row so you don't see the exact same 6 posters every time.
 * 3. Floats genre rows matching the user's favorite/watched genres higher on the page.
 */
export function personalizeRows<T extends { key: string; title: string; subtitle?: string; items: MediaItem[] }>(
  rawRows: T[],
  profile: TasteProfile
): T[] {
  if (!rawRows.length) return rawRows;

  const hasTaste =
    profile.favoriteGenres.length > 0 ||
    Object.keys(profile.genreScores).length > 0 ||
    profile.likedItems.length > 0;

  // Collect all unique items across rows to build the "Picked for You" row.
  const seen = new Set<string>();
  const allItems: MediaItem[] = [];
  for (const r of rawRows) {
    if (r.key === 'open-movies') continue;
    for (const item of r.items) {
      const id = String(item.id);
      if (seen.has(id)) continue;
      seen.add(id);
      allItems.push(item);
    }
  }

  const forYouPool =
    profile.favoriteGenres.length > 0
      ? allItems.filter((i) => (i.genres || []).some((g) => profile.favoriteGenres.includes(g)))
      : allItems;

  const forYouItems = weightedShuffle(
    forYouPool.length >= 8 ? forYouPool : allItems,
    (item) => scoreMediaForUser(item, profile)
  ).slice(0, 30);

  const activeGenresLabel =
    profile.favoriteGenres.length > 0
      ? `Based on your ${profile.favoriteGenres.slice(0, 3).join(', ')} picks`
      : hasTaste
        ? 'Tailored to what you watch and like — shuffled every visit'
        : 'Freshly shuffled top picks across movies & series';

  // Shuffle items within each row (except airing-today and open-movies) so every visit feels fresh.
  const shuffledRows = rawRows.map((row) => {
    if (row.key === 'open-movies' || row.key === 'airing-today') return row;
    return {
      ...row,
      items: weightedShuffle(row.items, (item) => scoreMediaForUser(item, profile)),
    };
  });

  // Sort genre rows so the user's favorite genres appear higher up.
  const coreRows = shuffledRows.filter((r) => !r.key.startsWith('genre-') && r.key !== 'open-movies');
  const genreRows = shuffledRows
    .filter((r) => r.key.startsWith('genre-'))
    .sort((a, b) => {
      const scoreRow = (r: T) => {
        const sampleGenres = r.items[0]?.genres || [];
        let s = Math.random() * 2;
        for (const g of sampleGenres) {
          if (profile.favoriteGenres.includes(g)) s += 20;
          s += profile.genreScores[g] || 0;
        }
        return s;
      };
      return scoreRow(b) - scoreRow(a);
    });
  const openMoviesRow = shuffledRows.filter((r) => r.key === 'open-movies');

  const out: T[] = [];

  if (forYouItems.length > 0) {
    out.push({
      key: 'for-you',
      title: 'Picked for You',
      subtitle: activeGenresLabel,
      items: forYouItems,
    } as T);
  }

  if (profile.likedItems.length > 0) {
    out.push({
      key: 'my-likes',
      title: 'Your Liked Titles',
      subtitle: 'Movies & series you hearted',
      items: profile.likedItems,
    } as T);
  }

  out.push(...coreRows, ...genreRows, ...openMoviesRow);
  return out;
}
