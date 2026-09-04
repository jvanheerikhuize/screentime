import { NextResponse } from 'next/server';
import { tmdbService, FEATURED_HERO, SAMPLE_MEDIA_CATALOG } from '@/lib/metadata/tmdb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const trending = await tmdbService.getTrending('all', 'week');
    return NextResponse.json({
      featured: FEATURED_HERO,
      trending: trending.length > 0 ? trending : SAMPLE_MEDIA_CATALOG,
      movies: SAMPLE_MEDIA_CATALOG.filter((m) => m.mediaType === 'movie'),
      series: SAMPLE_MEDIA_CATALOG.filter((m) => m.mediaType === 'tv'),
    });
  } catch (error: any) {
    return NextResponse.json({
      featured: FEATURED_HERO,
      trending: SAMPLE_MEDIA_CATALOG,
      movies: SAMPLE_MEDIA_CATALOG.filter((m) => m.mediaType === 'movie'),
      series: SAMPLE_MEDIA_CATALOG.filter((m) => m.mediaType === 'tv'),
    });
  }
}
