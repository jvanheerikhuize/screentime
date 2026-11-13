/**
 * Resolve the media input ffmpeg/ffprobe should read for a playback request:
 *   ?magnet=...&fileIndex=N  -> our own range-capable torrent endpoint (so ffmpeg can seek)
 *   ?url=https://...         -> a direct HTTP(S) source
 */
export function resolvePlaybackInput(req: Request): string | null {
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
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.toString();
    } catch {
      // invalid
    }
  }
  return null;
}
