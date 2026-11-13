import torrentStream from 'torrent-stream';
import path from 'path';
import os from 'os';
import { TorrentStats, TorrentFileMeta } from '@/types';
import { dedupe, getTrackers, magnetTrackers } from '@/lib/streaming/trackers';

interface ManagedTorrent {
  engine: TorrentStream.TorrentEngine;
  magnet: string;
  infoHash: string;
  files: TorrentStream.TorrentFile[];
  selectedFile: TorrentStream.TorrentFile | null;
  lastAccessed: number;
  stats: {
    downloaded: number;
    uploaded: number;
    downloadSpeed: number;
    uploadSpeed: number;
    lastDownloadSample: number;
    lastUploadSample: number;
    lastSampleTime: number;
  };
  readyPromise: Promise<void>;
  error?: string;
  // High-priority piece ranges for the selected file's head and tail (so playback can start fast).
  edgeSelections: { from: number; to: number }[];
}

export interface BufferStatus {
  state: 'connecting' | 'buffering' | 'ready' | 'error';
  error?: string;
  fileName?: string;
  fileSize: number;
  /** Contiguous bytes downloaded from the start of the selected file. */
  headBytes: number;
  /** Bytes we want at the start before handing the stream to the player. */
  headTarget: number;
  tailReady: boolean;
  /** Contiguous bytes downloaded from `fromByte` (the player's position) onward. */
  aheadBytes: number;
  complete: boolean;
  peers: number;
  downloadSpeed: number;
  progress: number;
}

// Pre-buffer ~2% of the file (16-64 MB) before playback; for a 2 GB / 2 h film that's
// roughly 2-3 minutes of video. The tail holds the MP4 index (moov atom) for many files.
const HEAD_MIN = 16 * 1024 * 1024;
const HEAD_MAX = 64 * 1024 * 1024;
const TAIL_BYTES = 4 * 1024 * 1024;

// Runtime APIs of torrent-stream that @types/torrent-stream doesn't declare.
interface PieceSelectingEngine {
  select(from: number, to: number, priority: boolean): void;
  deselect(from: number, to: number, priority: boolean): void;
  bitfield?: { get(index: number): boolean };
  torrent?: { pieceLength: number };
  swarm?: { wires?: unknown[] };
}
const withPieces = (engine: TorrentStream.TorrentEngine) => engine as unknown as PieceSelectingEngine;
const fileOffset = (file: TorrentStream.TorrentFile) => (file as unknown as { offset: number }).offset;

function headTargetFor(fileSize: number): number {
  return Math.min(fileSize, Math.max(HEAD_MIN, Math.min(HEAD_MAX, Math.round(fileSize * 0.02))));
}

// Global cache to survive Next.js module reloading in dev mode
declare global {
  // eslint-disable-next-line no-var
  var __torrentEngineManager: TorrentEngineManager | undefined;
}


const VIDEO_EXTENSIONS = new Set(['.mp4', '.mkv', '.webm', '.avi', '.mov', '.m4v', '.wmv', '.flv', '.ts']);

export class TorrentEngineManager {
  private torrents = new Map<string, ManagedTorrent>();
  private cacheDir: string;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.cacheDir = path.join(os.tmpdir(), 'screentime-torrents');
    this.startPeriodicCleanup();
  }

  private startPeriodicCleanup() {
    if (this.cleanupInterval) return;
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const MAX_IDLE_TIME = 20 * 60 * 1000; // 20 minutes

      for (const [key, torrent] of this.torrents.entries()) {
        if (now - torrent.lastAccessed > MAX_IDLE_TIME) {
          console.log(`[TorrentEngine] Cleaning up idle torrent: ${torrent.infoHash || key}`);
          try {
            torrent.engine.destroy(() => {});
          } catch (e) {
            console.error('[TorrentEngine] Error destroying engine:', e);
          }
          this.torrents.delete(key);
        }
      }
    }, 60 * 1000);
  }

  public async getOrCreateEngine(magnetUri: string): Promise<ManagedTorrent> {
    const cleanMagnet = magnetUri.trim();

    // A swarm that failed to connect gets a fresh attempt instead of failing forever.
    const stale = this.torrents.get(cleanMagnet);
    if (stale?.error) {
      try {
        stale.engine.destroy(() => {});
      } catch {
        // ignore
      }
      this.torrents.delete(cleanMagnet);
    }

    if (this.torrents.has(cleanMagnet)) {
      const existing = this.torrents.get(cleanMagnet)!;
      existing.lastAccessed = Date.now();
      await existing.readyPromise;
      return existing;
    }

    let resolveReady: () => void;
    let rejectReady: (err: Error) => void;
    const readyPromise = new Promise<void>((resolve, reject) => {
      resolveReady = resolve;
      rejectReady = reject;
    });

    // The magnet's own trackers plus the current public list (refreshed daily).
    const trackers = dedupe([...magnetTrackers(cleanMagnet), ...(await getTrackers())]);
    if (this.torrents.has(cleanMagnet)) return this.getOrCreateEngine(magnetUri); // created while we awaited
    const engine = torrentStream(cleanMagnet, {
      tmp: this.cacheDir,
      trackers,
      connections: 60,
      dht: true,
      tracker: true,
    });

    const managed: ManagedTorrent = {
      engine,
      magnet: cleanMagnet,
      infoHash: '',
      files: [],
      selectedFile: null,
      lastAccessed: Date.now(),
      stats: {
        downloaded: 0,
        uploaded: 0,
        downloadSpeed: 0,
        uploadSpeed: 0,
        lastDownloadSample: 0,
        lastUploadSample: 0,
        lastSampleTime: Date.now(),
      },
      readyPromise,
      edgeSelections: [],
    };

    this.torrents.set(cleanMagnet, managed);

    const timeout = setTimeout(() => {
      if (managed.files.length === 0) {
        managed.error = 'Could not reach any peers for this torrent. Try a source with more seeds.';
        rejectReady(new Error(managed.error));
      }
    }, 45000);

    engine.on('ready', () => {
      clearTimeout(timeout);
      managed.infoHash = engine.infoHash;
      managed.files = engine.files;

      // Automatically identify and select the primary video file (largest video file)
      const videoFiles = engine.files.filter((f) => {
        const ext = path.extname(f.name).toLowerCase();
        return VIDEO_EXTENSIONS.has(ext);
      });

      if (videoFiles.length > 0) {
        videoFiles.sort((a, b) => b.length - a.length);
        managed.selectedFile = videoFiles[0];
      } else if (engine.files.length > 0) {
        const sorted = [...engine.files].sort((a, b) => b.length - a.length);
        managed.selectedFile = sorted[0];
      }

      // Deselect all by default, then select the primary file to prioritize sequential pieces
      engine.files.forEach((f) => f.deselect());
      if (managed.selectedFile) {
        managed.selectedFile.select();
        this.prioritizeEdges(managed);
      }

      resolveReady();
    });

    engine.on('download', (pieceIndex: number) => {
      managed.lastAccessed = Date.now();
      const now = Date.now();
      const elapsed = (now - managed.stats.lastSampleTime) / 1000;
      if (elapsed >= 1.5) {
        const swarmDownloaded = (engine.swarm as any)?.downloaded || 0;
        const diff = swarmDownloaded - managed.stats.lastDownloadSample;
        managed.stats.downloadSpeed = Math.max(0, diff / elapsed);
        managed.stats.lastDownloadSample = swarmDownloaded;
        managed.stats.downloaded = swarmDownloaded;
        managed.stats.lastSampleTime = now;
      }
    });

    engine.on('error', (err: any) => {
      console.error('[TorrentEngine] Swarm error:', err);
    });

    await readyPromise;
    return managed;
  }

  public getStats(magnetUri: string): TorrentStats | null {
    const managed = this.torrents.get(magnetUri.trim());
    if (!managed) return null;

    const filesMeta: TorrentFileMeta[] = managed.files.map((f, i) => ({
      index: i,
      name: f.name,
      length: f.length,
      path: f.path,
    }));

    const totalLength = managed.selectedFile ? managed.selectedFile.length : managed.files.reduce((acc, f) => acc + f.length, 0);
    const downloaded = (managed.engine.swarm as any)?.downloaded || managed.stats.downloaded;
    const progress = totalLength > 0 ? Math.min(1, downloaded / totalLength) : 0;
    const peers = (managed.engine.swarm as any)?.wires?.length || 0;

    return {
      infoHash: managed.infoHash || '',
      name: managed.selectedFile?.name || 'Torrent Stream',
      totalSize: totalLength,
      downloaded,
      uploaded: (managed.engine.swarm as any)?.uploaded || 0,
      downloadSpeed: managed.stats.downloadSpeed,
      uploadSpeed: managed.stats.uploadSpeed,
      peers,
      progress,
      files: filesMeta,
    };
  }

  /** Stop a torrent the player no longer needs (source switched or player closed). */
  public release(magnetUri: string): boolean {
    const key = magnetUri.trim();
    const managed = this.torrents.get(key);
    if (!managed) return false;
    this.torrents.delete(key);
    try {
      managed.engine.destroy(() => {});
    } catch {
      // already destroyed
    }
    return true;
  }

  /** Ask the swarm for the selected file's first and last pieces before anything else. */
  private prioritizeEdges(managed: ManagedTorrent) {
    const file = managed.selectedFile;
    const engine = withPieces(managed.engine);
    const pieceLength = engine.torrent?.pieceLength;
    if (!file || !pieceLength) return;

    for (const sel of managed.edgeSelections ?? []) engine.deselect(sel.from, sel.to, true);

    const offset = fileOffset(file);
    const first = Math.floor(offset / pieceLength);
    const last = Math.floor((offset + file.length - 1) / pieceLength);
    const headEnd = Math.min(last, Math.floor((offset + headTargetFor(file.length) - 1) / pieceLength));
    const tailStart = Math.max(first, Math.floor((offset + file.length - TAIL_BYTES) / pieceLength));

    managed.edgeSelections = [
      { from: first, to: headEnd },
      { from: tailStart, to: last },
    ];
    for (const sel of managed.edgeSelections) engine.select(sel.from, sel.to, true);
  }

  /**
   * Non-blocking readiness check used by the player before it starts playback.
   * Starts the swarm on first call.
   */
  public getBufferStatus(magnetUri: string, fileIndex?: number, fromByte = 0): BufferStatus {
    const key = magnetUri.trim();
    // Only start a swarm here; a failed one is reported (not silently restarted) so the
    // player can show the error. Re-opening the player calls getOrCreateEngine, which retries.
    if (!this.torrents.has(key)) {
      this.getOrCreateEngine(key).catch(() => {});
    }
    const managed = this.torrents.get(key);
    const empty = { fileSize: 0, headBytes: 0, headTarget: 0, tailReady: false, aheadBytes: 0, complete: false, peers: 0, downloadSpeed: 0, progress: 0 };
    if (!managed) return { state: 'connecting', ...empty };
    managed.lastAccessed = Date.now();
    if (managed.error) return { state: 'error', error: managed.error, ...empty };

    const engine = withPieces(managed.engine);
    const peers = engine.swarm?.wires?.length || 0;
    const bitfield = engine.bitfield;
    const pieceLength = engine.torrent?.pieceLength;
    if (!managed.selectedFile || !bitfield || !pieceLength) {
      return { state: 'connecting', ...empty, peers };
    }

    if (fileIndex !== undefined && !isNaN(fileIndex) && managed.files[fileIndex]) {
      this.selectFile(key, fileIndex);
    }

    const file = managed.selectedFile;
    const offset = fileOffset(file);
    const first = Math.floor(offset / pieceLength);
    const last = Math.floor((offset + file.length - 1) / pieceLength);

    // Contiguous downloaded bytes from the start of the file.
    let piece = first;
    while (piece <= last && bitfield.get(piece)) piece++;
    const headBytes = Math.max(0, Math.min(file.length, piece * pieceLength - offset));

    const tailStart = Math.max(first, Math.floor((offset + file.length - TAIL_BYTES) / pieceLength));
    let tailReady = true;
    for (let p = tailStart; p <= last; p++) {
      if (!bitfield.get(p)) {
        tailReady = false;
        break;
      }
    }

    let completed = 0;
    for (let p = first; p <= last; p++) if (bitfield.get(p)) completed++;

    // Contiguous bytes available from the player's current position.
    let aheadBytes = headBytes;
    const from = Math.max(0, Math.min(fromByte, file.length - 1));
    if (from > 0) {
      const startPiece = Math.floor((offset + from) / pieceLength);
      let p = startPiece;
      while (p <= last && bitfield.get(p)) p++;
      aheadBytes = p === startPiece ? 0 : Math.max(0, Math.min(file.length, p * pieceLength - offset) - from);
    }

    this.sampleSpeed(managed);
    const headTarget = headTargetFor(file.length);
    const complete = completed === last - first + 1;
    return {
      state: (headBytes >= headTarget && tailReady) || complete ? 'ready' : 'buffering',
      fileName: file.name,
      fileSize: file.length,
      headBytes,
      headTarget,
      tailReady,
      aheadBytes,
      complete,
      peers,
      downloadSpeed: managed.stats.downloadSpeed,
      progress: completed / (last - first + 1),
    };
  }

  /** Refresh the download-rate estimate (the 'download' event alone leaves it stale when idle). */
  private sampleSpeed(managed: ManagedTorrent) {
    const now = Date.now();
    const elapsed = (now - managed.stats.lastSampleTime) / 1000;
    if (elapsed < 1) return;
    const downloaded = (managed.engine.swarm as unknown as { downloaded?: number })?.downloaded || 0;
    managed.stats.downloadSpeed = Math.max(0, (downloaded - managed.stats.lastDownloadSample) / elapsed);
    managed.stats.lastDownloadSample = downloaded;
    managed.stats.downloaded = downloaded;
    managed.stats.lastSampleTime = now;
  }

  public selectFile(magnetUri: string, fileIndex: number): TorrentStream.TorrentFile | null {
    const managed = this.torrents.get(magnetUri.trim());
    if (!managed || !managed.files[fileIndex]) return null;

    if (managed.selectedFile === managed.files[fileIndex]) return managed.selectedFile;

    managed.files.forEach((f) => f.deselect());
    managed.selectedFile = managed.files[fileIndex];
    managed.selectedFile.select();
    this.prioritizeEdges(managed);
    return managed.selectedFile;
  }
}

// The manager survives dev hot-reloads (so active swarms aren't dropped), but must pick up the
// reloaded class's methods; otherwise new API routes call methods the stale instance lacks.
if (global.__torrentEngineManager && Object.getPrototypeOf(global.__torrentEngineManager) !== TorrentEngineManager.prototype) {
  Object.setPrototypeOf(global.__torrentEngineManager, TorrentEngineManager.prototype);
}
export const torrentManager = global.__torrentEngineManager ?? (global.__torrentEngineManager = new TorrentEngineManager());
