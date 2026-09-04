import torrentStream from 'torrent-stream';
import path from 'path';
import os from 'os';
import { TorrentStats, TorrentFileMeta } from '@/types';

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
}

// Global cache to survive Next.js module reloading in dev mode
declare global {
  // eslint-disable-next-line no-var
  var __torrentEngineManager: TorrentEngineManager | undefined;
}

const DEFAULT_TRACKERS = [
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://open.tracker.cl:1337/announce',
  'udp://open.demonii.com:1337/announce',
  'udp://tracker.openbittorrent.com:80/announce',
  'udp://tracker.torrent.eu.org:451/announce',
  'udp://explodie.org:6969/announce',
  'udp://tracker.coppersurfer.tk:6969/announce',
  'http://tracker.openbittorrent.com:80/announce',
];

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

    const engine = torrentStream(cleanMagnet, {
      tmp: this.cacheDir,
      trackers: DEFAULT_TRACKERS,
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
    };

    this.torrents.set(cleanMagnet, managed);

    const timeout = setTimeout(() => {
      if (managed.files.length === 0) {
        rejectReady(new Error('Timeout connecting to torrent swarm metadata'));
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

  public selectFile(magnetUri: string, fileIndex: number): TorrentStream.TorrentFile | null {
    const managed = this.torrents.get(magnetUri.trim());
    if (!managed || !managed.files[fileIndex]) return null;

    managed.files.forEach((f) => f.deselect());
    managed.selectedFile = managed.files[fileIndex];
    managed.selectedFile.select();
    return managed.selectedFile;
  }
}

export const torrentManager = global.__torrentEngineManager ?? (global.__torrentEngineManager = new TorrentEngineManager());
