import { cachedJson } from './metadata/cache.ts';

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
  const data = await cachedJson<{ subtitles?: { id?: string | number; url?: string; lang?: string }[] }>(`${OPENSUBTITLES_ADDON}/subtitles/${type}/${encodeURIComponent(id)}.json`, 12000);
  const subs = data?.subtitles || [];

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

export { srtToVtt } from './srt.ts';
