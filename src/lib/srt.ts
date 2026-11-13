/** SRT -> WebVTT conversion for the browser's <track> element. */

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
