import { StreamSource } from '@/types';

function sizeInGb(size?: string): number | undefined {
  if (!size) return undefined;
  const m = size.match(/([\d.]+)\s*(TB|GB|GiB|MB|MiB)/i);
  if (!m) return undefined;
  const n = parseFloat(m[1]);
  const unit = m[2].toUpperCase();
  if (unit.startsWith('T')) return n * 1024;
  if (unit.startsWith('G')) return n;
  return n / 1024;
}

/**
 * Score how well a source will stream in a browser. Favours sources that start fast and
 * don't stall: plenty of seeds, 1080p/720p, H.264, modest file size. 4K, HEVC/x265, HDR/DV
 * and huge remuxes are pushed down because browsers often can't decode them or the swarm
 * can't keep up with their bitrate.
 */
export function streamabilityScore(source: StreamSource): number {
  const text = `${source.name} ${source.title} ${source.codec || ''}`.toLowerCase();
  let score = 0;

  // Direct HTTP / debrid links play instantly with no swarm involved.
  if (source.type !== 'torrent') score += 1000;

  score += { '1080p': 300, '720p': 260, '480p': 120, Auto: 100, '4K': 40 }[source.quality] ?? 100;

  if (/x265|hevc|h\.?265/.test(text)) score -= 250;
  if (/\bhdr|dolby\s*vision|\bdv\b/.test(text)) score -= 150;
  if (/remux|bdremux/.test(text)) score -= 200;
  if (/\b(cam|hdcam|ts|telesync|hdts)\b/.test(text)) score -= 300;
  if (/x264|h\.?264|avc/.test(text)) score += 40;
  if (/\.mp4\b|\bmp4\b|web-?dl|webrip/.test(text)) score += 30;

  if (source.type === 'torrent') {
    const seeds = source.seeds ?? 0;
    // Diminishing returns: 0 seeds is fatal, 50+ is plenty.
    score += seeds === 0 ? -400 : Math.min(250, Math.log2(seeds + 1) * 45);
  }

  const gb = sizeInGb(source.size);
  if (gb !== undefined) {
    if (gb > 15) score -= 250;
    else if (gb > 6) score -= 100;
    else if (gb < 0.3) score -= 80; // suspiciously small: samples or fakes
  }

  return score;
}

export function rankSources(sources: StreamSource[]): StreamSource[] {
  return [...sources].sort((a, b) => streamabilityScore(b) - streamabilityScore(a));
}

export function pickBestSource(sources: StreamSource[]): StreamSource | undefined {
  return rankSources(sources).find((s) => s.magnet || s.url);
}
