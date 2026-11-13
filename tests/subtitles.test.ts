import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isAllowedSubtitleUrl, languageLabel } from '../src/lib/subtitles.ts';
import { matchesLanguage, normalizeSubtitleLang } from '../src/lib/subtitleLanguages.ts';

test('matches 2-letter and 3-letter OpenSubtitles language codes', () => {
  assert.equal(matchesLanguage('eng', 'en'), true);
  assert.equal(matchesLanguage('nld', 'nl'), true);
  assert.equal(matchesLanguage('dut', 'nl'), true);
  assert.equal(matchesLanguage('pob', 'pt'), true);
  assert.equal(matchesLanguage('eng', 'off'), false);
  assert.equal(matchesLanguage('fra', 'en'), false);
});

test('normalizes 3-letter OpenSubtitles language codes to 2-letter settings codes', () => {
  assert.equal(normalizeSubtitleLang('eng'), 'en');
  assert.equal(normalizeSubtitleLang('dut'), 'nl');
  assert.equal(normalizeSubtitleLang('jpn'), 'ja');
  assert.equal(normalizeSubtitleLang('off'), 'off');
});

test('formats special and standard subtitle language labels', () => {
  assert.equal(languageLabel('pob'), 'Portuguese (Brazil)');
  assert.equal(languageLabel('zht'), 'Chinese (Traditional)');
  assert.equal(languageLabel('eng'), 'English');
});

test('allows only HTTPS strem.io subtitle URLs', () => {
  assert.equal(isAllowedSubtitleUrl('https://subs5.strem.io/en/12345.srt'), true);
  assert.equal(isAllowedSubtitleUrl('https://strem.io/sub.srt'), true);
  assert.equal(isAllowedSubtitleUrl('http://subs5.strem.io/en/12345.srt'), false);
  assert.equal(isAllowedSubtitleUrl('https://evil-strem.io/sub.srt'), false);
  assert.equal(isAllowedSubtitleUrl('http://127.0.0.1:8080/sub.srt'), false);
});
