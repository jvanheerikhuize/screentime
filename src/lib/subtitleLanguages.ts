// Client-safe language helpers for subtitle preferences.
// Settings store 2-letter codes; OpenSubtitles returns 3-letter codes in mixed B/T styles.
const TWO_TO_THREE: Record<string, string[]> = {
  en: ['eng'], nl: ['nld', 'dut'], de: ['ger', 'deu'], fr: ['fre', 'fra'], es: ['spa', 'spn'],
  it: ['ita'], pt: ['por', 'pob'], ru: ['rus'], pl: ['pol'], sv: ['swe'], da: ['dan'],
  no: ['nor'], fi: ['fin'], tr: ['tur'], ar: ['ara'], he: ['heb'], el: ['ell', 'gre'],
  cs: ['cze', 'ces'], hu: ['hun'], ro: ['ron', 'rum'], ja: ['jpn'], ko: ['kor'], zh: ['chi', 'zho', 'zht'],
};

const THREE_TO_TWO: Record<string, string> = Object.fromEntries(
  Object.entries(TWO_TO_THREE).flatMap(([two, threes]) => threes.map((three) => [three, two])),
);

export function normalizeSubtitleLang(lang: string): string {
  const lower = (lang || '').toLowerCase().trim();
  if (!lower) return 'en';
  if (lower === 'off') return 'off';
  return THREE_TO_TWO[lower] || lower;
}

/** True if an OpenSubtitles language code matches a preferred language (2- or 3-letter). */
export function matchesLanguage(subLang: string, preferred: string): boolean {
  const pref = preferred.toLowerCase();
  if (!pref || pref === 'off') return false;
  const sub = subLang.toLowerCase();
  if (sub === pref) return true;
  return (TWO_TO_THREE[pref] || []).includes(sub);
}

const PREF_KEY = 'screentime_subtitle_lang';

/** Last language the viewer picked in the player, falling back to the Settings default. */
export function getPreferredSubtitleLang(): string {
  try {
    const picked = localStorage.getItem(PREF_KEY);
    if (picked) return normalizeSubtitleLang(picked);
    const settings = JSON.parse(localStorage.getItem('screentime_settings') || '{}');
    return normalizeSubtitleLang(settings.defaultSubtitleLang || 'en');
  } catch {
    return 'en';
  }
}

export function setPreferredSubtitleLang(lang: string) {
  const normalized = normalizeSubtitleLang(lang);
  try {
    localStorage.setItem(PREF_KEY, normalized);
    const rawSettings = localStorage.getItem('screentime_settings');
    if (rawSettings) {
      const parsed = JSON.parse(rawSettings);
      if (parsed && typeof parsed === 'object') {
        parsed.defaultSubtitleLang = normalized;
        localStorage.setItem('screentime_settings', JSON.stringify(parsed));
      }
    }
  } catch {
    // storage unavailable
  }
}
