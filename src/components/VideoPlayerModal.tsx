'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  X, Play, Pause, Volume2, VolumeX, Maximize, Minimize, RotateCcw, RotateCw, Captions, AlertCircle, Check,
} from 'lucide-react';
import Hls from 'hls.js';
import { getPreferredSubtitleLang, matchesLanguage, setPreferredSubtitleLang } from '@/lib/subtitleLanguages';

export interface SubtitleQuery {
  imdbId?: string;
  mediaType: 'movie' | 'tv';
  season?: number;
  episode?: number;
}

interface VideoPlayerModalProps {
  title: string;
  streamUrl: string;
  magnet?: string;
  fileIndex?: number;
  isTorrent?: boolean;
  isLive?: boolean;
  subtitleQuery?: SubtitleQuery;
  onClose: () => void;
}

interface SubtitleOption {
  id: string;
  lang: string;
  label: string;
  src: string;
}

interface PrepareStatus {
  state: 'connecting' | 'buffering' | 'ready' | 'error';
  error?: string;
  fileSize: number;
  headBytes: number;
  headTarget: number;
  aheadBytes: number;
  complete: boolean;
  peers: number;
  downloadSpeed: number;
  files: { index: number; name: string; length: number }[];
}

const VIDEO_FILE = /\.(mp4|mkv|webm|avi|mov|m4v|wmv|ts)$/i;
// Seconds of video that must be available ahead before (re)starting after a stall.
// Doubles on every stall during playback (15 → 30 → 60) so a slow source stalls less often.
const START_BUFFER_SECONDS = 15;
const MAX_BUFFER_SECONDS = 60;

function formatTime(secs: number): string {
  if (!isFinite(secs) || secs < 0) return '0:00';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

function formatRate(bytesPerSec: number): string {
  return `${(bytesPerSec / 1024 / 1024).toFixed(1)} MB/s`;
}

function bufferedAhead(video: HTMLVideoElement): number {
  const t = video.currentTime;
  for (let i = 0; i < video.buffered.length; i++) {
    if (video.buffered.start(i) <= t + 0.25 && video.buffered.end(i) >= t) return video.buffered.end(i) - t;
  }
  return 0;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  title,
  streamUrl,
  magnet,
  fileIndex: initialFileIndex,
  isTorrent = false,
  isLive = false,
  subtitleQuery,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [fileIndex, setFileIndex] = useState<number | undefined>(initialFileIndex);
  const [transcode, setTranscode] = useState(false);
  const [prepared, setPrepared] = useState(!isTorrent);
  const [prepare, setPrepare] = useState<PrepareStatus | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const [bufferTarget, setBufferTarget] = useState(START_BUFFER_SECONDS);
  const [ahead, setAhead] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [subtitles, setSubtitles] = useState<SubtitleOption[]>([]);
  const [activeSub, setActiveSub] = useState<SubtitleOption | null>(null);
  const [subMenuOpen, setSubMenuOpen] = useState(false);

  // The viewer's intent: true unless they paused. Auto-pauses for buffering don't change it.
  const wantPlay = useRef(true);
  const autoPausing = useRef(false);
  const justSeeked = useRef(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Latest torrent status, readable from interval callbacks without re-subscribing.
  const prepareRef = useRef<PrepareStatus | null>(null);

  const activeUrl = isTorrent && magnet
    ? `/api/stream?magnet=${encodeURIComponent(magnet)}${fileIndex !== undefined ? `&fileIndex=${fileIndex}` : ''}${transcode ? '&transcode=true' : ''}`
    : streamUrl;

  // Lock page scroll behind the player.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // 1. Torrent pre-buffer: poll until the start of the file is downloaded, then keep polling for stats.
  useEffect(() => {
    if (!isTorrent || !magnet) return;
    let cancelled = false;
    let failures = 0;
    const poll = async () => {
      try {
        // Byte offset of the playback position, so the server reports what's downloaded from there.
        const v = videoRef.current;
        const size = prepareRef.current?.fileSize || 0;
        const from = v && size && isFinite(v.duration) && v.duration > 0 ? Math.floor((v.currentTime / v.duration) * size) : 0;
        const qs = `magnet=${encodeURIComponent(magnet)}${fileIndex !== undefined ? `&fileIndex=${fileIndex}` : ''}&from=${from}`;
        const res = await fetch(`/api/stream/prepare?${qs}`);
        if (!res.ok) throw new Error(`prepare failed: ${res.status}`);
        const data: PrepareStatus = await res.json();
        if (cancelled) return;
        failures = 0;
        prepareRef.current = data;
        setPrepare(data);
        if (data.state === 'ready') setPrepared(true);
        if (data.state === 'error') setError(data.error || 'Could not connect to this torrent.');
      } catch {
        // Tolerate transient failures, but don't spin forever if the stream server is broken.
        if (!cancelled && ++failures >= 6) setError('The streaming server isn’t responding. Try again in a moment.');
      }
    };
    poll();
    const id = setInterval(poll, 1500);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isTorrent, magnet, fileIndex]);

  // 2. Attach the media source once prepared.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !prepared) return;

    let hls: Hls | null = null;
    const isHls = activeUrl.includes('.m3u8') || isLive;
    if (isHls && Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, lowLatencyMode: true, backBufferLength: 90 });
      hls.loadSource(activeUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls?.startLoad();
        else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls?.recoverMediaError();
        else setError('Could not connect to this live stream.');
      });
    } else {
      video.src = activeUrl;
    }

    return () => {
      hls?.destroy();
      // Abort the download when the source changes or the player closes.
      video.removeAttribute('src');
      video.load();
    };
  }, [activeUrl, isLive, prepared]);

  // 3. Buffer gate: hold playback until enough is available ahead, then (re)start.
  // Chrome stops fetching a paused video after a few seconds of buffer, so the browser's own
  // buffer can't be the only signal: for torrents we ask the server how much is downloaded
  // from the current position; for HTTP we also accept "browser went idle with data buffered".
  useEffect(() => {
    if (!buffering || !prepared) return;
    const id = setInterval(() => {
      const video = videoRef.current;
      if (!video) return;
      const a = bufferedAhead(video);
      const nearEnd = isFinite(video.duration) && video.currentTime + a >= video.duration - 0.5;
      let enough: boolean;
      let progressSecs = a;
      if (isLive) {
        enough = video.readyState >= 3;
      } else if (isTorrent) {
        const st = prepareRef.current;
        const bytesPerSec = st?.fileSize && isFinite(video.duration) && video.duration > 0 ? st.fileSize / video.duration : 0;
        const serverAhead = st?.complete ? Infinity : bytesPerSec ? (st?.aheadBytes || 0) / bytesPerSec : 0;
        progressSecs = Math.max(a, isFinite(serverAhead) ? serverAhead : bufferTarget);
        // Without a known duration (e.g. transcoded streams) fall back to the browser-idle rule.
        const browserIdle = !bytesPerSec && video.networkState === video.NETWORK_IDLE && a >= 1;
        enough = nearEnd || serverAhead >= bufferTarget || a >= bufferTarget || browserIdle;
      } else {
        const browserIdle = video.networkState === video.NETWORK_IDLE && a >= 1;
        enough = nearEnd || a >= bufferTarget || browserIdle;
      }
      setAhead(progressSecs);
      if (enough && video.readyState >= 3) {
        setBuffering(false);
        if (wantPlay.current) video.play().catch(() => setIsPlaying(false));
      }
    }, 400);
    return () => clearInterval(id);
  }, [buffering, prepared, bufferTarget, isLive, isTorrent]);

  const onWaiting = () => {
    const video = videoRef.current;
    if (!video || isLive) return;
    // A stall during normal playback means we started too early: ask for a bigger cushion next time.
    if (!justSeeked.current && isPlaying) {
      setBufferTarget((t) => Math.min(MAX_BUFFER_SECONDS, t * 2));
    }
    justSeeked.current = false;
    if (!video.paused) {
      autoPausing.current = true;
      video.pause();
    }
    setBuffering(true);
  };

  // 4. Subtitles
  useEffect(() => {
    if (!subtitleQuery?.imdbId) return;
    let cancelled = false;
    const { imdbId, mediaType, season, episode } = subtitleQuery;
    const qs = new URLSearchParams({ imdbId, type: mediaType });
    if (mediaType === 'tv') {
      qs.set('season', String(season ?? 1));
      qs.set('episode', String(episode ?? 1));
    }
    fetch(`/api/subtitles?${qs.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const pref = getPreferredSubtitleLang();
        // Preferred language first, then English, then the rest alphabetically (API order).
        const rank = (s: SubtitleOption) => (matchesLanguage(s.lang, pref) ? 0 : s.lang === 'eng' ? 1 : 2);
        const list: SubtitleOption[] = [...(data.subtitles || [])].sort((a, b) => rank(a) - rank(b));
        setSubtitles(list);
        setActiveSub(list.find((s) => matchesLanguage(s.lang, pref)) || null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [subtitleQuery]);

  // Show only the selected track.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const apply = () => {
      for (let i = 0; i < video.textTracks.length; i++) {
        const track = video.textTracks[i];
        track.mode = activeSub && track.label === activeSub.label ? 'showing' : 'disabled';
      }
    };
    apply();
    video.textTracks.addEventListener('addtrack', apply);
    return () => video.textTracks.removeEventListener('addtrack', apply);
  }, [activeSub]);

  const chooseSubtitle = (sub: SubtitleOption | null) => {
    setActiveSub(sub);
    setPreferredSubtitleLang(sub ? sub.lang : 'off');
    setSubMenuOpen(false);
  };

  // Controls
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused && !buffering) {
      wantPlay.current = true;
      video.play().catch(() => {});
    } else if (buffering) {
      // While buffering the button just flips intent; playback starts when the buffer is ready.
      wantPlay.current = !wantPlay.current;
      setIsPlaying(wantPlay.current);
    } else {
      wantPlay.current = false;
      video.pause();
    }
  }, [buffering]);

  const seekTo = (t: number) => {
    const video = videoRef.current;
    if (!video || isLive) return;
    justSeeked.current = true;
    video.currentTime = Math.max(0, Math.min(duration || t, t));
    setCurrentTime(video.currentTime);
  };

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) containerRef.current.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const revealControls = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      const video = videoRef.current;
      revealControls();
      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'arrowleft':
          e.preventDefault();
          if (video) seekTo(video.currentTime - 10);
          break;
        case 'arrowright':
          e.preventDefault();
          if (video) seekTo(video.currentTime + 10);
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'm':
          toggleMute();
          break;
        case 'c':
          if (subtitles.length) chooseSubtitle(activeSub ? null : subtitles.find((s) => matchesLanguage(s.lang, getPreferredSubtitleLang())) || subtitles[0]);
          break;
        case 'escape':
          if (subMenuOpen) setSubMenuOpen(false);
          else if (!document.fullscreenElement) onClose();
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [togglePlay, toggleFullscreen, toggleMute, revealControls, onClose, subtitles, activeSub, subMenuOpen, duration, isLive]);

  // Derived status for the overlay
  const videoFiles = (prepare?.files || []).filter((f) => VIDEO_FILE.test(f.name));
  const preparingPct = prepare && prepare.headTarget > 0 ? Math.min(99, Math.round((prepare.headBytes / prepare.headTarget) * 100)) : 0;
  const bitrate = prepare?.fileSize && duration > 0 && isFinite(duration) ? prepare.fileSize / duration : 0;
  const swarmTooSlow = isTorrent && !prepare?.complete && bitrate > 0 && (prepare?.downloadSpeed || 0) < bitrate * 0.9;

  let statusText: string | null = null;
  let statusDetail: string | null = null;
  if (!prepared) {
    statusText = !prepare || prepare.state === 'connecting' ? 'Connecting to peers…' : `Downloading the start of the video… ${preparingPct}%`;
    if (prepare && prepare.peers > 0) statusDetail = `${prepare.peers} peers · ${formatRate(prepare.downloadSpeed)}`;
  } else if (buffering) {
    statusText = isLive ? 'Connecting…' : `Buffering… ${Math.min(Math.floor(ahead), bufferTarget)} / ${bufferTarget}s`;
    if (isTorrent && prepare) statusDetail = `${prepare.peers} peers · ${formatRate(prepare.downloadSpeed)}`;
  }

  const controlsVisible = showControls || !isPlaying || buffering || subMenuOpen;

  return (
    <div
      ref={containerRef}
      onMouseMove={revealControls}
      className={`fixed inset-0 z-[60] bg-black flex items-center justify-center select-none ${controlsVisible ? '' : 'cursor-none'}`}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        preload="auto"
        playsInline
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration || 0)}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          setCurrentTime(v.currentTime);
          if (v.buffered.length) setBufferedEnd(v.buffered.end(v.buffered.length - 1));
        }}
        onProgress={(e) => {
          const v = e.currentTarget;
          if (v.buffered.length) setBufferedEnd(v.buffered.end(v.buffered.length - 1));
        }}
        onWaiting={onWaiting}
        onSeeking={() => {
          justSeeked.current = true;
        }}
        onPlaying={() => {
          setIsPlaying(true);
          setBuffering(false);
          setError(null);
          revealControls();
        }}
        onPause={() => {
          if (autoPausing.current) autoPausing.current = false;
          else setIsPlaying(false);
        }}
        onEnded={() => setIsPlaying(false)}
        onError={() => {
          // Browsers can't play some containers/codecs; retry once through the FFmpeg remuxer.
          if (isTorrent && !transcode) {
            setTranscode(true);
            setBuffering(true);
            return;
          }
          setError('This video format can’t be played in your browser. Try another source.');
        }}
      >
        {activeSub && (
          <track key={activeSub.id} kind="subtitles" src={activeSub.src} srcLang={activeSub.lang} label={activeSub.label} default />
        )}
      </video>

      {/* Status overlay */}
      {statusText && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/50 pointer-events-none">
          <div className="w-12 h-12 rounded-full border-4 border-white/15 border-t-rose-500 animate-spin" />
          <p className="text-white text-sm font-semibold">{statusText}</p>
          {statusDetail && <p className="text-xs text-zinc-400">{statusDetail}</p>}
          {swarmTooSlow && buffering && prepared && (
            <p className="max-w-sm text-center text-xs text-amber-300/90 px-4">
              This source downloads slower than it plays ({formatRate(prepare?.downloadSpeed || 0)} vs {formatRate(bitrate)} needed).
              Playback will pause to buffer; a source with more seeds will be smoother.
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center p-6 bg-black/70">
          <div className="max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center space-y-4">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
            <p className="text-sm text-zinc-200">{error}</p>
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold">
              Back
            </button>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div
        className={`absolute top-0 inset-x-0 p-4 sm:p-6 flex items-center gap-4 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300 ${
          controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <button
          onClick={onClose}
          aria-label="Close player"
          className="p-2.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-white border border-zinc-700/60"
        >
          <X className="w-5 h-5" />
        </button>
        <h1 className="text-base sm:text-lg font-semibold text-white truncate">{title}</h1>
      </div>

      {/* Bottom controls */}
      <div
        className={`absolute bottom-0 inset-x-0 p-4 sm:p-6 space-y-3 bg-gradient-to-t from-black/90 to-transparent transition-opacity duration-300 ${
          controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {!isLive && (
          <div className="relative h-4 flex items-center">
            <div className="absolute inset-x-0 h-1 rounded-full bg-white/15" />
            {duration > 0 && (
              <div className="absolute left-0 h-1 rounded-full bg-white/35" style={{ width: `${Math.min(100, (bufferedEnd / duration) * 100)}%` }} />
            )}
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={1}
              value={Math.min(currentTime, duration || 0)}
              onChange={(e) => seekTo(parseFloat(e.target.value))}
              aria-label="Seek"
              className="relative w-full h-1 appearance-none bg-transparent cursor-pointer accent-rose-500"
            />
          </div>
        )}

        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'} className="p-2 rounded-full bg-white text-black hover:bg-zinc-200">
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>
          {!isLive && (
            <>
              <button onClick={() => seekTo(currentTime - 10)} aria-label="Back 10 seconds" className="p-2 text-zinc-300 hover:text-white">
                <RotateCcw className="w-5 h-5" />
              </button>
              <button onClick={() => seekTo(currentTime + 10)} aria-label="Forward 10 seconds" className="p-2 text-zinc-300 hover:text-white">
                <RotateCw className="w-5 h-5" />
              </button>
            </>
          )}
          <div className="flex items-center gap-1 group/vol">
            <button onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'} className="p-2 text-zinc-300 hover:text-white">
              {muted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              aria-label="Volume"
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setVolume(v);
                if (videoRef.current) {
                  videoRef.current.volume = v;
                  videoRef.current.muted = v === 0;
                  setMuted(v === 0);
                }
              }}
              className="w-20 h-1 accent-white cursor-pointer hidden sm:block"
            />
          </div>
          <span className="text-xs sm:text-sm font-mono text-zinc-300">
            {isLive ? 'LIVE' : `${formatTime(currentTime)} / ${formatTime(duration)}`}
          </span>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            {isTorrent && videoFiles.length > 1 && (
              <select
                value={fileIndex ?? ''}
                onChange={(e) => {
                  setFileIndex(parseInt(e.target.value, 10));
                  setPrepared(false);
                  setTranscode(false);
                  setBuffering(true);
                  setBufferTarget(START_BUFFER_SECONDS);
                }}
                aria-label="File"
                className="max-w-[10rem] sm:max-w-xs bg-zinc-900/90 border border-zinc-700 text-xs text-zinc-200 rounded-lg px-2 py-1.5"
              >
                {fileIndex === undefined && <option value="">Auto (largest file)</option>}
                {videoFiles.map((f) => (
                  <option key={f.index} value={f.index}>
                    {f.name.split('/').pop()}
                  </option>
                ))}
              </select>
            )}

            {subtitleQuery?.imdbId && (
              <div className="relative">
                <button
                  onClick={() => setSubMenuOpen((o) => !o)}
                  aria-label="Subtitles"
                  className={`p-2 rounded-lg ${activeSub ? 'text-white' : 'text-zinc-400'} hover:text-white hover:bg-white/10`}
                >
                  <Captions className="w-5 h-5" />
                </button>
                {subMenuOpen && (
                  <div className="absolute bottom-12 right-0 w-56 max-h-72 overflow-y-auto rounded-xl bg-zinc-900/95 border border-zinc-700 shadow-2xl py-1 text-sm">
                    <button onClick={() => chooseSubtitle(null)} className="w-full flex items-center justify-between px-3 py-2 text-left text-zinc-200 hover:bg-white/10">
                      Off {!activeSub && <Check className="w-4 h-4 text-rose-400" />}
                    </button>
                    {subtitles.length === 0 && <p className="px-3 py-2 text-xs text-zinc-500">No subtitles found</p>}
                    {subtitles.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => chooseSubtitle(s)}
                        className="w-full flex items-center justify-between px-3 py-2 text-left text-zinc-200 hover:bg-white/10"
                      >
                        {s.label} {activeSub?.id === s.id && <Check className="w-4 h-4 text-rose-400" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button onClick={toggleFullscreen} aria-label="Fullscreen" className="p-2 text-zinc-300 hover:text-white">
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
