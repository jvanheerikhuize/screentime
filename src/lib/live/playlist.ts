/**
 * Rewrites every reference in an HLS playlist (variant playlists, segments and the
 * URI="..." attributes of keys, init segments and alternate renditions) to absolute
 * URLs passed through `map`, e.g. to send them through a relay.
 */
export function rewritePlaylist(text: string, base: string, map: (absoluteUrl: string) => string): string {
  const abs = (ref: string) => map(new URL(ref, base).toString());
  return text
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (trimmed.startsWith('#')) return line.replace(/URI="([^"]+)"/g, (_m, ref: string) => `URI="${abs(ref)}"`);
      return abs(trimmed);
    })
    .join('\n');
}
