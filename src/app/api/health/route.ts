import { NextResponse } from 'next/server';
import { execFile } from 'node:child_process';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

let cachedFfmpegAvailable: boolean | null = null;

function checkFfmpeg(): Promise<boolean> {
  if (cachedFfmpegAvailable !== null) return Promise.resolve(cachedFfmpegAvailable);
  return new Promise((resolve) => {
    execFile('ffmpeg', ['-version'], { timeout: 3000 }, (err) => {
      cachedFfmpegAvailable = !err;
      resolve(cachedFfmpegAvailable);
    });
  });
}

/** Lightweight liveness and dependency health check for Docker and reverse proxies. */
export async function GET() {
  const ffmpeg = await checkFfmpeg();
  return NextResponse.json(
    {
      status: 'ok',
      ffmpeg,
      timestamp: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
