import { cachedJson } from '@/lib/metadata/cache';

// Stremio's public OpenSubtitles addon: keyless, keyed by IMDb id, serves UTF-8 SRT files.
const OPENSUBTITLES_ADDON = 'https://opensubtitles-v3.strem.io';
const MAX_PER_LANGUAGE = 3;

export interface SubtitleOption {
  id: string;
  lang: string; // ISO 639-2 (e.g. "eng"), as returned by OpenSubtitles
  label: string;
  src: string; // same-origin WebVTT URL
}

// OpenSubtitles uses a few non-standard codes; everything else goes through Intl.DisplayNames.
const SPECIAL_LANGS: Record<string, string> = {
  pob: 'Portuguese (Brazil)',
  por: 'Portuguese',
  chi: 'Chinese',
  zht: 'Chinese (Traditional)',
  ze: 'Chinese/English',
  scc: 'Serbian',
  mne: 'Montenegrin',
};


const displayNames = (() => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'language' });
  } catch {
    return null;
  }
})();

export function languageLabel(code: string): string {
  if (SPECIAL_LANGS[code]) return SPECIAL_LANGS[code];
  try {
    const name = displayNames?.of(code);
    if (name && name.toLowerCase() !== code.toLowerCase()) return name;
  } catch {
    // unknown code
  }
  return code.toUpperCase();
}

export async function findSubtitles(params: {
  imdbId: string;
  mediaType: 'movie' | 'tv';
  season?: number;
  episode?: number;
}): Promise<SubtitleOption[]> {
  const { imdbId, mediaType, season = 1, episode = 1 } = params;
  const id = mediaType === 'tv' ? `${imdbId}:${season}:${episode}` : imdbId;
  const type = mediaType === 'tv' ? 'series' : 'movie';
  const data = await cachedJson(`${OPENSUBTITLES_ADDON}/subtitles/${type}/${encodeURIComponent(id)}.json`, 12000);
  const subs: any[] = data?.subtitles || [];

  const perLang = new Map<string, number>();
  const options: SubtitleOption[] = [];
  for (const s of subs) {
    if (!s?.url || !s?.lang) continue;
    const count = (perLang.get(s.lang) || 0) + 1;
    if (count > MAX_PER_LANGUAGE) continue;
    perLang.set(s.lang, count);

    const base = languageLabel(s.lang);
    options.push({
      id: String(s.id ?? `${s.lang}-${count}`),
      lang: s.lang,
      label: count > 1 ? `${base} ${count}` : base,
      src: `/api/subtitles/vtt?url=${encodeURIComponent(s.url)}`,
    });
  }

  return options.sort((a, b) => a.label.localeCompare(b.label));
}

/** Only proxy subtitle files from the Stremio/OpenSubtitles hosts (prevents an open proxy). */
export function isAllowedSubtitleUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' && (url.hostname === 'strem.io' || url.hostname.endsWith('.strem.io'));
  } catch {
    return false;
  }
}

const TIMING = /^(\d{1,2}):(\d{2}):(\d{2})[.,](\d{1,3})\s*-->\s*(\d{1,2}):(\d{2}):(\d{2})[.,](\d{1,3})(.*)$/;

function toSeconds(h: string, m: string, s: string, ms: string): number {
  return +h * 3600 + +m * 60 + +s + +ms.padEnd(3, '0') / 1000;
}

function formatVttTime(secs: number): string {
  const total = Math.max(0, Math.round(secs * 1000));
  const h = Math.floor(total / 3600000);
  const m = Math.floor((total % 3600000) / 60000);
  const s = Math.floor((total % 60000) / 1000);
  const ms = total % 1000;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

/**
 * SRT (or VTT) -> WebVTT. `offsetSeconds` shifts every cue earlier; used when the video was
 * restarted at a seek point (its timeline then starts at 0 instead of the real position).
 */
export function srtToVtt(srt: string, offsetSeconds = 0): string {
  const blocks = srt
    .replace(/^﻿/, '')
    .replace(/\r\n?/g, '\n')
    // Strip SSA-style positioning tags like {\an8} that browsers would render literally.
    .replace(/\{\\[^}]*\}/g, '')
    .replace(/^WEBVTT[^\n]*\n/, '')
    .split(/\n{2,}/);

  const out: string[] = [];
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    const timingIdx = lines.findIndex((l) => TIMING.test(l));
    if (timingIdx === -1) continue;
    const m = lines[timingIdx].match(TIMING)!;
    const start = toSeconds(m[1], m[2], m[3], m[4]) - offsetSeconds;
    const end = toSeconds(m[5], m[6], m[7], m[8]) - offsetSeconds;
    if (end <= 0) continue;
    const text = lines.slice(timingIdx + 1).join('\n').trim();
    if (!text) continue;
    out.push(`${formatVttTime(start)} --> ${formatVttTime(end)}${m[9] || ''}\n${text}`);
  }
  return `WEBVTT\n\n${out.join('\n\n')}\n`;
}
