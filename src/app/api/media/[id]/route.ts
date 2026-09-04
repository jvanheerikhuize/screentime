import { NextRequest, NextResponse } from 'next/server';
import { tmdbService } from '@/lib/metadata/tmdb';
import { getStreamsForMedia } from '@/lib/streaming/streamSources';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const { searchParams } = new URL(req.url);
  const type = (searchParams.get('type') as 'movie' | 'tv') || 'movie';

  try {
    const details = await tmdbService.getDetails(id, type);
    const streams = getStreamsForMedia(id);

    if (!details) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...details,
      streams,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch media details' }, { status: 500 });
  }
}
