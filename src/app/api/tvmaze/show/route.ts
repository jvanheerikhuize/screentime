import { NextRequest, NextResponse } from 'next/server';
import { getShowStatus } from '@/lib/metadata/tvmaze';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/tvmaze/show?imdbId=tt…  Series status and next/previous episode from TVmaze. */
export async function GET(req: NextRequest) {
  const imdbId = new URL(req.url).searchParams.get('imdbId') || '';
  if (!/^tt\d+$/.test(imdbId)) return NextResponse.json({ error: 'Invalid imdbId' }, { status: 400 });
  const status = await getShowStatus(imdbId);
  return NextResponse.json(status ?? {}, { headers: { 'Cache-Control': 'public, max-age=1800' } });
}
