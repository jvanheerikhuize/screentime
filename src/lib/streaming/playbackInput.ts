import { isAllowedUrl } from '@/lib/net/guardedFetch';

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
    const self = new URL(req.url);
    const fileIndex = searchParams.get('fileIndex');
    const qs = `magnet=${encodeURIComponent(magnet)}${fileIndex ? `&fileIndex=${encodeURIComponent(fileIndex)}` : ''}`;
    // Loopback to this server; ffmpeg talks plain HTTP to it.
    return `http://127.0.0.1:${self.port || (self.protocol === 'https:' ? 443 : 80)}/api/stream?${qs}`;
  }

  if (url) {
    if (await isAllowedUrl(url, { allowPrivate: false })) return new URL(url).toString();
  }
  return null;
}
