import { NextResponse } from 'next/server';
import { tmdbService, FEATURED_HERO, SAMPLE_MEDIA_CATALOG } from '@/lib/metadata/tmdb';
import { cinemetaService } from '@/lib/metadata/cinemeta';
import { MediaItem } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CatalogRow {
  key: string;
  title: string;
  subtitle: string;
  items: MediaItem[];
}

const GENRE_ROWS: { genre: string; mediaType: 'movie' | 'tv'; title: string; subtitle: string }[] = [
  { genre: 'Action', mediaType: 'movie', title: 'Action & Adrenaline', subtitle: 'Popular action movies' },
  { genre: 'Comedy', mediaType: 'movie', title: 'Comedy Picks', subtitle: 'Popular comedies' },
  { genre: 'Horror', mediaType: 'movie', title: 'Horror & Thrillers', subtitle: 'Popular horror movies' },
  { genre: 'Sci-Fi', mediaType: 'movie', title: 'Science Fiction', subtitle: 'Popular sci-fi movies' },
  { genre: 'Animation', mediaType: 'movie', title: 'Animated Features', subtitle: 'Popular animated movies' },
  { genre: 'Documentary', mediaType: 'movie', title: 'Documentaries', subtitle: 'Popular documentaries' },
  { genre: 'Crime', mediaType: 'tv', title: 'Crime Series', subtitle: 'Popular crime and detective shows' },
  { genre: 'Comedy', mediaType: 'tv', title: 'Comedy Series', subtitle: 'Popular sitcoms and comedy shows' },
];

const ROW_LIMIT = 40;

export async function GET() {
  const [tmdbTrending, popularMovies, popularSeries, topMovies, topSeries, ...genreResults] =
    await Promise.all([
      tmdbService.getTrending('all', 'week').catch(() => []),
      cinemetaService.getCatalog('movie', { catalog: 'top' }).catch(() => []),
      cinemetaService.getCatalog('tv', { catalog: 'top' }).catch(() => []),
      cinemetaService.getHighlyRated('movie').catch(() => []),
      cinemetaService.getHighlyRated('tv').catch(() => []),
      ...GENRE_ROWS.map((r) => cinemetaService.getCatalog(r.mediaType, { catalog: 'top', genre: r.genre }).catch(() => [])),
    ]);

  // TMDB trending only differs from the sample catalog when an API key is configured.
  const hasTmdb = tmdbTrending.length > 0 && tmdbTrending !== SAMPLE_MEDIA_CATALOG;
  const fallbackMovies = SAMPLE_MEDIA_CATALOG.filter((m) => m.mediaType === 'movie');
  const fallbackSeries = SAMPLE_MEDIA_CATALOG.filter((m) => m.mediaType === 'tv');

  const movies = popularMovies.length ? popularMovies : fallbackMovies;
  const series = popularSeries.length ? popularSeries : fallbackSeries;

  const rows: CatalogRow[] = [
    {
      key: 'trending',
      title: 'Trending now',
      subtitle: hasTmdb ? 'Trending this week on TMDB' : 'What people are watching right now',
      items: hasTmdb ? tmdbTrending : interleave(movies, series).slice(0, ROW_LIMIT),
    },
    { key: 'popular-movies', title: 'Popular Movies', subtitle: 'The most-watched films right now', items: movies.slice(0, ROW_LIMIT) },
    { key: 'popular-series', title: 'Popular Series', subtitle: 'The most-watched shows right now', items: series.slice(0, ROW_LIMIT) },
    { key: 'top-movies', title: 'Highly Rated Movies', subtitle: 'Best-reviewed popular films (IMDb 7.5+)', items: topMovies.slice(0, ROW_LIMIT) },
    { key: 'top-series', title: 'Highly Rated Series', subtitle: 'Best-reviewed popular shows (IMDb 7.5+)', items: topSeries.slice(0, ROW_LIMIT) },
    ...GENRE_ROWS.map((r, i) => ({
      key: `genre-${r.mediaType}-${r.genre.toLowerCase()}`,
      title: r.title,
      subtitle: r.subtitle,
      items: genreResults[i].slice(0, ROW_LIMIT),
    })),
    {
      key: 'open-movies',
      title: 'Open Movies',
      subtitle: 'Blender Foundation originals with instant playback',
      items: SAMPLE_MEDIA_CATALOG.filter((m) => String(m.id).startsWith('sample-')),
    },
  ].filter((r) => r.items.length > 0);

  // Feature a popular movie with real artwork; fall back to the curated hero.
  const featured = movies.find((m) => m.backdropPath && m.overview && m.imdbId) || FEATURED_HERO;

  return NextResponse.json({
    featured,
    rows,
    trending: rows[0]?.items || SAMPLE_MEDIA_CATALOG,
    movies,
    series,
  });
}

function interleave<T>(a: T[], b: T[]): T[] {
  const out: T[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i]) out.push(a[i]);
    if (b[i]) out.push(b[i]);
  }
  return out;
}
