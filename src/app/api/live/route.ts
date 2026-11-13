import { NextResponse } from 'next/server';
import { LIVE_CHANNELS } from '@/lib/channels/liveChannels';
import { getFreeTvChannels } from '@/lib/channels/freeTv';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/live — hand-picked channels plus the Free-TV playlist. */
export async function GET() {
  const freeTv = await getFreeTvChannels();
  const curated = LIVE_CHANNELS.map((c) => ({ ...c, source: 'curated' as const }));
  const curatedUrls = new Set(curated.map((c) => c.streamUrl));
  return NextResponse.json(
    { channels: [...curated, ...freeTv.filter((c) => !curatedUrls.has(c.streamUrl))] },
    { headers: { 'Cache-Control': 'public, max-age=600' } }
  );
}
