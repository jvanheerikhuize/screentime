import { NextRequest, NextResponse } from 'next/server';
import { tmdbService } from '@/lib/metadata/tmdb';
import { searchAnime } from '@/lib/metadata/anilist';
import { MediaItem } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();

  if (!q) {
    return NextResponse.json({ results: [] });
  }

  try {
    const [catalogResults, animeResults] = await Promise.all([
      tmdbService.search(q).catch(() => [] as MediaItem[]),
      searchAnime(q, 10).catch(() => [] as MediaItem[]),
    ]);

    const seen = new Set<string>();
    const results: MediaItem[] = [];
    const maxLen = Math.max(catalogResults.length, animeResults.length);

    for (let i = 0; i < maxLen; i++) {
      for (const item of [catalogResults[i], animeResults[i]]) {
        if (!item) continue;
        const key = `${String(item.id)}|${item.title.toLowerCase().trim()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        results.push(item);
      }
    }

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
