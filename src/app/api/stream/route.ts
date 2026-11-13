import { NextRequest } from 'next/server';
import path from 'path';
import { Readable } from 'stream';
import { torrentManager } from '@/lib/streaming/torrentEngine';
import { extractInfoHash } from '@/lib/streaming/trackers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIME: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.mov': 'video/mp4',
  '.webm': 'video/webm',
  '.ogv': 'video/ogg',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
  '.ts': 'video/mp2t',
};

function json(status: number, body: object) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

/**
 * Raw torrent file over HTTP with Range support (206 Partial Content).
 * Browsers play MP4/WebM from here directly; ffmpeg reads other formats from here via
 * /api/playback/transcode, which can seek because ranges are supported.
 *   GET /api/stream?magnet=...&fileIndex=N
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const magnet = searchParams.get('magnet');
  const fileIndex = searchParams.get('fileIndex');
  if (!magnet || !extractInfoHash(magnet)) return json(400, { error: 'Missing or invalid magnet parameter' });

  try {
    const parsedIdx = fileIndex !== null ? parseInt(fileIndex, 10) : undefined;
    const idx = parsedIdx !== undefined && !isNaN(parsedIdx) ? parsedIdx : undefined;
    const managed = await torrentManager.getOrCreateEngine(magnet, idx);
    let file = managed.selectedFile;
    if (idx !== undefined) {
      file = torrentManager.selectFile(magnet, idx) || file;
    }
    if (!file) return json(404, { error: 'No streamable video file found in torrent' });

    const total = file.length;
    const headers: Record<string, string> = {
      'Accept-Ranges': 'bytes',
      'Content-Type': MIME[path.extname(file.name).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    };

    const range = req.headers.get('range');
    let start = 0;
    let end = total - 1;
    let status = 200;
    if (range) {
      const m = range.match(/bytes=(\d*)-(\d*)/);
      if (m) {
        if (m[1]) start = parseInt(m[1], 10);
        if (m[2]) end = Math.min(parseInt(m[2], 10), total - 1);
        if (!m[1] && m[2]) {
          // suffix range: last N bytes
          start = Math.max(0, total - parseInt(m[2], 10));
          end = total - 1;
        }
      }
      if (start >= total || start > end) {
        return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${total}` } });
      }
      status = 206;
      headers['Content-Range'] = `bytes ${start}-${end}/${total}`;
    }
    headers['Content-Length'] = String(end - start + 1);

    // Readable.toWeb destroys the torrent read stream when the client disconnects or cancels.
    const nodeStream = file.createReadStream({ start, end });
    req.signal.addEventListener('abort', () => nodeStream.destroy(), { once: true });
    return new Response(Readable.toWeb(nodeStream) as ReadableStream, { status, headers });
  } catch (error) {
    return json(502, { error: error instanceof Error ? error.message : 'Streaming failed' });
  }
}
