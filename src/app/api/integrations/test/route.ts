import { NextRequest, NextResponse } from 'next/server';
import { selfHostedAggregator } from '@/lib/scrapers/selfHostedAggregator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, hostUrl, apiKey } = body;

    if (!type || !hostUrl || !apiKey) {
      return NextResponse.json({ success: false, message: 'Missing type, hostUrl, or apiKey' }, { status: 400 });
    }

    const result = await selfHostedAggregator.testConnection(type, hostUrl, apiKey);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e.message || 'Test failed' }, { status: 500 });
  }
}
