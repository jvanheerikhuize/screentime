import { NextRequest } from 'next/server';
import { torrentManager } from '@/lib/streaming/torrentEngine';
import { shouldTranscode, createTranscodeStream, getMimeType } from '@/lib/streaming/transcoder';
import { Readable } from 'stream';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const magnet = searchParams.get('magnet');
  const fileIndex = searchParams.get('fileIndex');
  const forceTranscode = searchParams.get('transcode') === 'true';

  if (!magnet) {
    return new Response(JSON.stringify({ error: 'Missing magnet parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const managedTorrent = await torrentManager.getOrCreateEngine(magnet);

    let selectedFile = managedTorrent.selectedFile;
    if (fileIndex !== null && fileIndex !== undefined && fileIndex !== '') {
      const idx = parseInt(fileIndex, 10);
      if (!isNaN(idx)) {
        selectedFile = torrentManager.selectFile(magnet, idx);
      }
    }

    if (!selectedFile) {
      return new Response(JSON.stringify({ error: 'No streamable video file found in torrent' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const totalSize = selectedFile.length;
    const fileName = selectedFile.name;
    const mime = getMimeType(fileName);
    const needsTranscoding = forceTranscode || (shouldTranscode(fileName) && !searchParams.has('raw'));

    const rangeHeader = req.headers.get('range');

    if (needsTranscoding) {
      // Transcode via FFmpeg (stream remuxed to MP4 / AAC)
      console.log(`[Stream] Transcoding on-the-fly for ${fileName}`);
      const rawStream = selectedFile.createReadStream();
      const { stream: transStream } = createTranscodeStream(rawStream, 'video/mp4');

      const webStream = Readable.toWeb(transStream as any);
      return new Response(webStream as ReadableStream, {
        status: 200,
        headers: {
          'Content-Type': 'video/mp4',
          'Accept-Ranges': 'none',
          'Transfer-Encoding': 'chunked',
          'Cache-Control': 'no-cache, no-store',
        },
      });
    }

    // Direct HTTP Range partial content stream
    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

      if (start >= totalSize || end >= totalSize || start > end) {
        return new Response(null, {
          status: 416,
          headers: { 'Content-Range': `bytes */${totalSize}` },
        });
      }

      const chunkSize = end - start + 1;
      const fileStream = selectedFile.createReadStream({ start, end });
      const webStream = Readable.toWeb(fileStream as any);

      return new Response(webStream as ReadableStream, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${totalSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize.toString(),
          'Content-Type': mime,
          'Cache-Control': 'no-cache',
        },
      });
    }

    // Full stream (when no range specified)
    const fileStream = selectedFile.createReadStream();
    const webStream = Readable.toWeb(fileStream as any);

    return new Response(webStream as ReadableStream, {
      status: 200,
      headers: {
        'Content-Length': totalSize.toString(),
        'Accept-Ranges': 'bytes',
        'Content-Type': mime,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: any) {
    console.error('[Stream API] Error streaming torrent:', error);
    return new Response(JSON.stringify({ error: error.message || 'Streaming failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
