import ffmpeg from 'fluent-ffmpeg';
import { Readable, PassThrough } from 'stream';
import path from 'path';

export function shouldTranscode(fileName: string): boolean {
  const ext = path.extname(fileName).toLowerCase();
  // MP4 and WebM with AAC/H264/VP8/VP9 play natively in virtually all browsers
  // MKV, AVI, TS, WMV usually require container remuxing or audio transcoding (AC3/DTS -> AAC)
  return ['.mkv', '.avi', '.ts', '.wmv', '.flv'].includes(ext);
}

export function createTranscodeStream(inputStream: Readable, mimeType = 'video/mp4'): { stream: Readable; kill: () => void } {
  const outputStream = new PassThrough();

  const command = ffmpeg(inputStream)
    .videoCodec('copy') // Try remuxing video stream without re-encoding when possible (ultra fast)
    .audioCodec('aac')  // Re-encode audio to AAC which is supported by all web browsers
    .audioBitrate('192k')
    .format('mp4')
    .outputOptions([
      '-movflags', 'frag_keyframe+empty_moov+default_base_moof+faststart',
      '-preset', 'ultrafast',
      '-tune', 'zerolatency',
    ])
    .on('error', (err: any) => {
      // Stream could be closed by client when seeking / pausing
      if (err.message && !err.message.includes('SIGKILL') && !err.message.includes('Output stream closed')) {
        console.warn('[Transcoder] Transcode warning/error:', err.message);
      }
      outputStream.end();
    });

  command.pipe(outputStream);

  return {
    stream: outputStream,
    kill: () => {
      try {
        command.kill('SIGKILL');
      } catch (e) {
        // ignore
      }
    },
  };
}

export function getMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  switch (ext) {
    case '.mp4':
    case '.m4v':
      return 'video/mp4';
    case '.webm':
      return 'video/webm';
    case '.ogg':
    case '.ogv':
      return 'video/ogg';
    case '.mkv':
      return 'video/x-matroska';
    case '.avi':
      return 'video/x-msvideo';
    case '.ts':
      return 'video/mp2t';
    default:
      return 'video/mp4';
  }
}
