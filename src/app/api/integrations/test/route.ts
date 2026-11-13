import { NextRequest, NextResponse } from 'next/server';
import { selfHostedAggregator } from '@/lib/scrapers/selfHostedAggregator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST { type: 'prowlarr' | 'jackett', hostUrl, apiKey } -> { success, message } */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { type, hostUrl, apiKey } = (body || {}) as { type?: unknown; hostUrl?: unknown; apiKey?: unknown };
  if ((type !== 'prowlarr' && type !== 'jackett') || typeof hostUrl !== 'string' || typeof apiKey !== 'string' || !hostUrl || !apiKey) {
    return NextResponse.json({ success: false, message: 'Missing type, hostUrl or apiKey' }, { status: 400 });
  }
  return NextResponse.json(await selfHostedAggregator.testConnection(type, hostUrl, apiKey));
}
