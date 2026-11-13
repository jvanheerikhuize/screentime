import { spawn } from 'child_process';

/**
 * Media inspection + on-demand conversion for files browsers can't play directly
 * (MKV containers, AC3/EAC3/DTS audio, HEVC video, non-English default audio, ...).
 */

export interface MediaStreamInfo {
  index: number;
  codec: string;
  language?: string;
  title?: string;
  channels?: number;
  height?: number;
  isDefault: boolean;
}

export interface MediaInfo {
  duration: number;
  container: string;
  video?: MediaStreamInfo;
  audio?: MediaStreamInfo;
  audioTracks: number;
  audioStreams: MediaStreamInfo[];
  subtitleStreams: MediaStreamInfo[];
  /** True when the browser can play the file as-is via HTTP range requests. */
  directPlayable: boolean;
  copyVideo: boolean;
  copyAudio: boolean;
  reason: string;
}

// Codecs Chrome/Firefox/Safari decode natively (HEVC is missing on most Linux/Windows setups).
const BROWSER_VIDEO = new Set(['h264', 'vp8', 'vp9', 'av1']);
const BROWSER_AUDIO = new Set(['aac', 'mp3', 'opus', 'vorbis', 'flac']);
const TEXT_SUBTITLES = new Set(['subrip', 'srt', 'ass', 'ssa', 'webvtt', 'mov_text', 'text']);
const PREFERRED_AUDIO_LANGS = ['eng', 'en'];

interface FfprobeStream {
  index: number;
  codec_type?: string;
  codec_name?: string;
  channels?: number;
  height?: number;
  tags?: { language?: string; title?: string };
  disposition?: { default?: number; attached_pic?: number };
}
interface FfprobeOutput {
  streams?: FfprobeStream[];
  format?: { format_name?: string; duration?: string };
}

const probeCache = new Map<string, Promise<MediaInfo>>();
const embeddedSubCache = new Map<string, Promise<string>>();

function runJson(cmd: string, args: string[], timeoutMs: number): Promise<FfprobeOutput> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error(`${cmd} timed out`));
    }, timeoutMs);
    proc.stdout.on('data', (d) => (out += d));
    proc.stderr.on('data', (d) => (err += d));
    proc.on('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error(err.trim().split('\n').pop() || `${cmd} exited with ${code}`));
      try {
        resolve(JSON.parse(out));
      } catch (e) {
        reject(e);
      }
    });
  });
}

function pickAudio(streams: MediaStreamInfo[]): MediaStreamInfo | undefined {
  return (
    streams.find((s) => s.language && PREFERRED_AUDIO_LANGS.includes(s.language.toLowerCase())) ||
    streams.find((s) => s.isDefault) ||
    streams[0]
  );
}

export function probeMedia(input: string): Promise<MediaInfo> {
  const cached = probeCache.get(input);
  if (cached) return cached;

  const promise = runJson(
    'ffprobe',
    ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', '-rw_timeout', '30000000', input],
    45000
  ).then((data): MediaInfo => {
    const streams = data.streams || [];
    const toInfo = (s: FfprobeStream): MediaStreamInfo => ({
      index: s.index,
      codec: String(s.codec_name || 'unknown'),
      language: s.tags?.language,
      title: s.tags?.title,
      channels: s.channels,
      height: s.height,
      isDefault: s.disposition?.default === 1,
    });
    const videos = streams.filter((s) => s.codec_type === 'video' && !s.disposition?.attached_pic).map(toInfo);
    const audios = streams.filter((s) => s.codec_type === 'audio').map(toInfo);
    const subtitles = streams
      .filter((s) => s.codec_type === 'subtitle' && TEXT_SUBTITLES.has(String(s.codec_name || '').toLowerCase()))
      .map(toInfo);
    const video = videos[0];
    const audio = pickAudio(audios);
    const container = String(data.format?.format_name || '');
    const duration = parseFloat(data.format?.duration || '') || 0;

    const videoOk = !video || BROWSER_VIDEO.has(video.codec);
    const audioOk = !audio || BROWSER_AUDIO.has(audio.codec);
    const isMp4 = /mp4|mov/.test(container);
    const isWebm = /webm/.test(container) && (!video || ['vp8', 'vp9', 'av1'].includes(video.codec)) && (!audio || ['opus', 'vorbis'].includes(audio.codec));
    // A non-default preferred-language track needs remuxing: browsers always play the default track.
    const audioIsFirstChoice = !audio || audios.length <= 1 || audio === (audios.find((a) => a.isDefault) || audios[0]);

    const directPlayable = (isMp4 || isWebm) && videoOk && audioOk && audioIsFirstChoice;
    const reason = directPlayable
      ? 'direct'
      : [
          !(isMp4 || isWebm) && `container ${container.split(',')[0]}`,
          !videoOk && `video ${video?.codec}`,
          !audioOk && `audio ${audio?.codec}`,
          !audioIsFirstChoice && `audio track ${audio?.language}`,
        ]
          .filter(Boolean)
          .join(', ');

    return {
      duration,
      container,
      video,
      audio,
      audioTracks: audios.length,
      audioStreams: audios,
      subtitleStreams: subtitles,
      directPlayable,
      copyVideo: videoOk && video?.codec === 'h264',
      copyAudio: audio ? audio.codec === 'aac' || audio.codec === 'mp3' : true,
      reason,
    };
  });

  probeCache.set(input, promise);
  promise.catch(() => probeCache.delete(input));
  if (probeCache.size > 200) probeCache.delete(probeCache.keys().next().value!);
  return promise;
}

/**
 * Extract an embedded text subtitle stream as raw SRT text (cached in-memory per input+streamIndex).
 */
export function extractEmbeddedSubtitleSrt(input: string, streamIndex: number): Promise<string> {
  const key = `${input}#${streamIndex}`;
  const cached = embeddedSubCache.get(key);
  if (cached) return cached;

  const promise = new Promise<string>((resolve, reject) => {
    const proc = spawn(
      'ffmpeg',
      ['-hide_banner', '-loglevel', 'error', '-nostdin', '-i', input, '-map', `0:${streamIndex}`, '-f', 'srt', 'pipe:1'],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    );
    let out = '';
    let err = '';
    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error('Subtitle extraction timed out'));
    }, 60_000);

    proc.stdout.on('data', (d) => {
      if (out.length < 2 * 1024 * 1024) out += d.toString('utf8');
    });
    proc.stderr.on('data', (d) => {
      if (err.length < 2000) err += d.toString('utf8');
    });
    proc.on('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0 && !out.trim()) {
        return reject(new Error(err.trim().split('\n').pop() || `ffmpeg subtitle exited with ${code}`));
      }
      resolve(out);
    });
  });

  embeddedSubCache.set(key, promise);
  promise.catch(() => embeddedSubCache.delete(key));
  if (embeddedSubCache.size > 30) embeddedSubCache.delete(embeddedSubCache.keys().next().value!);
  return promise;
}

/**
 * Stream `input` from `start` seconds as fragmented MP4. Video is copied when it's H.264
 * (cheap remux), otherwise encoded to H.264; audio becomes stereo AAC unless already AAC/MP3.
 * ffmpeg is killed as soon as the HTTP client goes away.
 */
export function transcodeToMp4(
  input: string,
  start: number,
  info: MediaInfo,
  signal: AbortSignal,
  audioStreamIndex?: number
): ReadableStream<Uint8Array> {
  const chosenAudio =
    (audioStreamIndex !== undefined ? info.audioStreams.find((a) => a.index === audioStreamIndex) : undefined) ||
    info.audio;
  const copyAudio = chosenAudio ? chosenAudio.codec === 'aac' || chosenAudio.codec === 'mp3' : true;

  const args = ['-hide_banner', '-loglevel', 'error', '-nostdin'];
  if (start > 0) args.push('-ss', start.toFixed(2));
  args.push('-i', input);
  if (info.video) args.push('-map', `0:${info.video.index}`);
  if (chosenAudio) args.push('-map', `0:${chosenAudio.index}`);

  if (info.copyVideo) {
    args.push('-c:v', 'copy');
  } else {
    args.push('-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22', '-pix_fmt', 'yuv420p');
    if ((info.video?.height || 0) > 1080) args.push('-vf', 'scale=-2:1080');
  }
  if (chosenAudio) {
    if (copyAudio) args.push('-c:a', 'copy');
    else args.push('-c:a', 'aac', '-b:a', '192k', '-ac', '2');
  }
  args.push('-sn', '-dn', '-f', 'mp4', '-movflags', 'frag_keyframe+empty_moov+default_base_moof', 'pipe:1');

  const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let closed = false;
  const stop = () => {
    closed = true;
    if (proc.exitCode === null) proc.kill('SIGKILL');
  };
  signal.addEventListener('abort', stop, { once: true });

  let stderr = '';
  proc.stderr.on('data', (d) => {
    if (stderr.length < 2000) stderr += d;
  });

  return new ReadableStream<Uint8Array>(
    {
      start(controller) {
        proc.stdout.on('data', (chunk: Buffer) => {
          if (closed) return;
          try {
            controller.enqueue(new Uint8Array(chunk));
          } catch {
            stop();
            return;
          }
          // Backpressure: stop reading from ffmpeg (which then stops reading the source).
          if ((controller.desiredSize ?? 1) <= 0) proc.stdout.pause();
        });
        proc.stdout.on('end', () => {
          if (closed) return;
          closed = true;
          try {
            controller.close();
          } catch {
            // already closed by the consumer
          }
        });
        proc.on('close', (code) => {
          if (code && code !== 255 && !signal.aborted && stderr) console.warn(`[transcode] ffmpeg exited ${code}: ${stderr.trim().slice(-300)}`);
        });
        proc.on('error', (e) => {
          if (closed) return;
          closed = true;
          try {
            controller.error(e);
          } catch {
            // ignore
          }
        });
      },
      pull() {
        proc.stdout.resume();
      },
      cancel() {
        stop();
      },
    },
    new ByteLengthQueuingStrategy({ highWaterMark: 8 * 1024 * 1024 })
  );
}
