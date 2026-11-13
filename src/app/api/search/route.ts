import { NextRequest, NextResponse } from 'next/server';
import { tmdbService } from '@/lib/metadata/tmdb';
import { searchAnime } from '@/lib/metadata/anilist';
import { LIVE_CHANNELS } from '@/lib/channels/liveChannels';
import { getFreeTvChannels } from '@/lib/channels/freeTv';
import { LiveChannel, MediaItem } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();

  if (!q) {
    return NextResponse.json({ results: [], channels: [] });
  }

  try {
    const qLower = q.toLowerCase();
    const [catalogResults, animeResults, freeTv] = await Promise.all([
      tmdbService.search(q).catch(() => [] as MediaItem[]),
      searchAnime(q, 10).catch(() => [] as MediaItem[]),
      getFreeTvChannels().catch(() => [] as LiveChannel[]),
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

    const curated = LIVE_CHANNELS.map((c) => ({ ...c, source: 'curated' as const }));
    const curatedUrls = new Set(curated.map((c) => c.streamUrl));
    const allChannels = [...curated, ...freeTv.filter((c) => !curatedUrls.has(c.streamUrl))];
    const channels = allChannels
      .filter(
        (c) =>
          c.name.toLowerCase().includes(qLower) ||
          c.country.toLowerCase().includes(qLower) ||
          c.category.toLowerCase().includes(qLower)
      )
      .slice(0, 8);

    return NextResponse.json({ results, channels });
  } catch {
    return NextResponse.json({ results: [], channels: [] });
  }
}
