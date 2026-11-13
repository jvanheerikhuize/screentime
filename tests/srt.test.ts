import { test } from 'node:test';
import assert from 'node:assert/strict';
import { srtToVtt } from '../src/lib/srt.ts';

const SRT = '﻿1\r\n00:00:01,000 --> 00:00:03,500\r\n{\\an8}Hello\r\n\r\n2\r\n00:00:10,000 --> 00:00:12,000\r\nSecond line\r\n';

test('converts SRT to WebVTT', () => {
  assert.equal(srtToVtt(SRT), 'WEBVTT\n\n00:00:01.000 --> 00:00:03.500\nHello\n\n00:00:10.000 --> 00:00:12.000\nSecond line\n');
});

test('shifts cues by the offset and drops cues that ended before it', () => {
  assert.equal(srtToVtt(SRT, 5), 'WEBVTT\n\n00:00:05.000 --> 00:00:07.000\nSecond line\n');
});
