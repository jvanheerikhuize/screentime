import { NextRequest, NextResponse } from 'next/server';
import { tmdbService } from '@/lib/metadata/tmdb';
import { internetArchiveService } from '@/lib/metadata/internetArchive';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';

  if (!q.trim()) {
    return NextResponse.json({ results: [] });
  }

  // Lucene special characters would break the Archive query syntax.
  const archiveQuery = q.replace(/[^\p{L}\p{N}\s'-]/gu, ' ').trim();

  const [main, archive] = await Promise.all([
    tmdbService.search(q).catch(() => []),
    archiveQuery
      ? internetArchiveService.getFeatureFilms({ rows: 8, query: archiveQuery }).catch(() => [])
      : Promise.resolve([]),
  ]);

  return NextResponse.json({ results: [...main, ...archive] });
}
