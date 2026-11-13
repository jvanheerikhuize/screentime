import { NextRequest, NextResponse } from 'next/server';
import { cinemetaService, CinemetaCatalog, CINEMETA_GENRES } from '@/lib/metadata/cinemeta';
import { getAnimeCatalog, AnimeCatalog, ANIME_CATALOGS, ANIME_GENRES, ANILIST_PAGE_SIZE } from '@/lib/metadata/anilist';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CATALOGS: CinemetaCatalog[] = ['top', 'year'];

/**
 * Paginated browsing for the Movies / Series tabs.
 *   GET /api/catalog?type=movie|tv&catalog=top&genre=Action&skip=50
 *   GET /api/catalog?type=movie|tv&catalog=year&genre=2024&skip=50
 *   GET /api/catalog?type=anime&catalog=trending|popular|top|season&genre=Action&skip=50
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  if (searchParams.get('type') === 'anime') {
    const catalogParam = searchParams.get('catalog') as AnimeCatalog;
    const skip = Math.max(0, parseInt(searchParams.get('skip') || '0', 10) || 0);
    const { items, hasMore } = await getAnimeCatalog({
      catalog: ANIME_CATALOGS.includes(catalogParam) ? catalogParam : 'trending',
      genre: searchParams.get('genre') || undefined,
      page: Math.floor(skip / ANILIST_PAGE_SIZE) + 1,
    });
    return NextResponse.json({ items, hasMore, genres: ANIME_GENRES });
  }

  const type = searchParams.get('type') === 'tv' ? 'tv' : 'movie';
  const catalogParam = searchParams.get('catalog') as CinemetaCatalog;
  const catalog = CATALOGS.includes(catalogParam) ? catalogParam : 'top';
  const genreParam = searchParams.get('genre') || undefined;
  const genre =
    catalog === 'year'
      ? genreParam && /^\d{4}$/.test(genreParam) ? genreParam : String(new Date().getFullYear())
      : genreParam && CINEMETA_GENRES.includes(genreParam) ? genreParam : undefined;
  const skip = Math.max(0, parseInt(searchParams.get('skip') || '0', 10) || 0);

  const items = await cinemetaService.getCatalog(type, { catalog, genre, skip });
  return NextResponse.json({
    items,
    // Cinemeta pages are not always exactly full (~48-50 of 50), so treat any sizeable page as "more available".
    hasMore: items.length >= cinemetaService.pageSize * 0.8,
    genres: CINEMETA_GENRES,
  });
}
