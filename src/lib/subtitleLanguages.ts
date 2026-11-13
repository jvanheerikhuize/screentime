// Client-safe language helpers for subtitle preferences.
// Settings store 2-letter codes; OpenSubtitles returns 3-letter codes in mixed B/T styles.
const TWO_TO_THREE: Record<string, string[]> = {
  en: ['eng'], nl: ['nld', 'dut'], de: ['ger', 'deu'], fr: ['fre', 'fra'], es: ['spa', 'spn'],
  it: ['ita'], pt: ['por', 'pob'], ru: ['rus'], pl: ['pol'], sv: ['swe'], da: ['dan'],
  no: ['nor'], fi: ['fin'], tr: ['tur'], ar: ['ara'], he: ['heb'], el: ['ell', 'gre'],
  cs: ['cze', 'ces'], hu: ['hun'], ro: ['ron', 'rum'], ja: ['jpn'], ko: ['kor'], zh: ['chi', 'zho', 'zht'],
};

/** True if an OpenSubtitles language code matches a preferred language (2- or 3-letter). */
export function matchesLanguage(subLang: string, preferred: string): boolean {
  const pref = preferred.toLowerCase();
  if (!pref || pref === 'off') return false;
  if (subLang === pref) return true;
  return (TWO_TO_THREE[pref] || []).includes(subLang);
}

const PREF_KEY = 'screentime_subtitle_lang';

/** Last language the viewer picked in the player, falling back to the Settings default. */
export function getPreferredSubtitleLang(): string {
  try {
    const picked = localStorage.getItem(PREF_KEY);
    if (picked) return picked;
    const settings = JSON.parse(localStorage.getItem('screentime_settings') || '{}');
    return settings.defaultSubtitleLang || 'en';
  } catch {
    return 'en';
  }
}

export function setPreferredSubtitleLang(lang: string) {
  try {
    localStorage.setItem(PREF_KEY, lang);
  } catch {
    // storage unavailable
  }
}
