import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export const runtime = 'nodejs';

function getStateFilePath(): string {
  const dir = process.env.LUMEN_DATA_DIR || process.env.SCREENTIME_DATA_DIR || path.join(os.tmpdir(), 'lumen-data');
  return path.join(dir, 'state.json');
}

async function readStateFile(): Promise<{ watchProgress: unknown[]; favoriteChannelIds: string[] }> {
  try {
    const raw = await fs.readFile(getStateFilePath(), 'utf8');
    const parsed = JSON.parse(raw);
    return {
      watchProgress: Array.isArray(parsed?.watchProgress) ? parsed.watchProgress : [],
      favoriteChannelIds: Array.isArray(parsed?.favoriteChannelIds) ? parsed.favoriteChannelIds : [],
    };
  } catch {
    return { watchProgress: [], favoriteChannelIds: [] };
  }
}

export async function GET() {
  const state = await readStateFile();
  return NextResponse.json(state, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const current = await readStateFile();

    const watchProgress = Array.isArray(body?.watchProgress)
      ? body.watchProgress.slice(0, 40)
      : current.watchProgress;
    const favoriteChannelIds = Array.isArray(body?.favoriteChannelIds)
      ? body.favoriteChannelIds.filter((x: unknown): x is string => typeof x === 'string').slice(0, 200)
      : current.favoriteChannelIds;

    const nextState = {
      watchProgress,
      favoriteChannelIds,
      updatedAt: Date.now(),
    };

    const filePath = getStateFilePath();
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(nextState), 'utf8');

    return NextResponse.json(nextState);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save state' },
      { status: 400 }
    );
  }
}
