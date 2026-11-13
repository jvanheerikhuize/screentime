import { isAllowedUrl } from '../net/guardedFetch.ts';
import { extractInfoHash } from './trackers.ts';

/**
 * Resolve the media input ffmpeg/ffprobe should read for a playback request:
 *   ?magnet=...&fileIndex=N  -> our own range-capable torrent endpoint (so ffmpeg can seek)
 *   ?url=https://...         -> a direct HTTP(S) source on the public internet
 *
 * ffmpeg fetches the URL itself, so addresses on this machine or your LAN are refused
 * (otherwise anyone who can reach the app could read internal services through it).
 */
export async function resolvePlaybackInput(req: Request): Promise<string | null> {
  const { searchParams } = new URL(req.url);
  const magnet = searchParams.get('magnet');
  const url = searchParams.get('url');

  if (magnet) {
    if (!extractInfoHash(magnet)) return null;
    const self = new URL(req.url);
    const fileIndex = searchParams.get('fileIndex');
    const qs = `magnet=${encodeURIComponent(magnet.trim())}${fileIndex ? `&fileIndex=${encodeURIComponent(fileIndex)}` : ''}`;
    const localPort =
      process.env.LUMEN_INTERNAL_PORT || process.env.SCREENTIME_INTERNAL_PORT || process.env.PORT || self.port || '3000';
    // Loopback to this server's actual listening port; ffmpeg talks plain HTTP to it.
    return `http://127.0.0.1:${localPort}/api/stream?${qs}`;
  }

  if (url) {
    if (await isAllowedUrl(url, { allowPrivate: false })) return new URL(url).toString();
  }
  return null;
}
