import { NextRequest, NextResponse } from 'next/server';
import { cinemetaService, CinemetaCatalog, CINEMETA_GENRES } from '@/lib/metadata/cinemeta';
import { internetArchiveService } from '@/lib/metadata/internetArchive';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CATALOGS: CinemetaCatalog[] = ['top', 'year'];

/**
 * Paginated browsing for the Movies / Series tabs.
 *   GET /api/catalog?type=movie|tv&catalog=top&genre=Action&skip=50
 *   GET /api/catalog?type=movie|tv&catalog=year&genre=2024&skip=50
 *   GET /api/catalog?source=archive&page=2
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const source = searchParams.get('source');

  if (source === 'archive') {
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const items = await internetArchiveService.getFeatureFilms({ rows: 50, page });
    return NextResponse.json({ items, hasMore: items.length === 50, genres: [] });
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
