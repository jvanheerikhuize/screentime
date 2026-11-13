'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  X, Play, Pause, Volume2, VolumeX, Maximize, Minimize, RotateCcw, RotateCw, Captions, AlertCircle, Check, SkipForward,
} from 'lucide-react';
import Hls from 'hls.js';
import { getPreferredSubtitleLang, matchesLanguage, setPreferredSubtitleLang } from '@/lib/subtitleLanguages';

export interface SubtitleQuery {
  imdbId?: string;
  mediaType: 'movie' | 'tv';
  season?: number;
  episode?: number;
}

/** One way to play the title; the player falls back through these in order. */
export interface PlayableSource {
  magnet?: string;
  url?: string;
  fileIdx?: number;
  label?: string;
}

interface VideoPlayerModalProps {
  title: string;
  sources: PlayableSource[];
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

type Phase = 'preparing' | 'probing' | 'ready';
type Mode = 'direct' | 'transcode';

const VIDEO_FILE = /\.(mp4|mkv|webm|avi|mov|m4v|wmv|ts)$/i;
// Seconds that must be available ahead before (re)starting after a stall; doubles per stall.
const START_BUFFER_SECONDS = 15;
const MAX_BUFFER_SECONDS = 60;
// Failover thresholds while a torrent is still preparing.
const NO_PEERS_MS = 20_000;
const SLOW_CHECK_MS = 30_000;
const MAX_PREPARE_MS = 90_000;
const MAX_ETA_SECONDS = 90;
// Mid-playback: switch source if a stall on a too-slow swarm lasts this long.
const MAX_STALL_MS = 45_000;

// Torrents are released shortly after the player leaves them; the delay absorbs React
// StrictMode's dev-only unmount/remount so we don't kill a swarm we're about to reuse.
const pendingRelease = new Map<string, ReturnType<typeof setTimeout>>();
function scheduleRelease(magnet: string) {
  clearTimeout(pendingRelease.get(magnet));
  pendingRelease.set(
    magnet,
    setTimeout(() => {
      pendingRelease.delete(magnet);
      fetch(`/api/stream/release?magnet=${encodeURIComponent(magnet)}`, { method: 'POST', keepalive: true }).catch(() => {});
    }, 1500)
  );
}
function cancelRelease(magnet: string) {
  clearTimeout(pendingRelease.get(magnet));
  pendingRelease.delete(magnet);
}

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

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({ title, sources, isLive = false, subtitleQuery, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // --- Source selection & pipeline state ---
  const [sourceIndex, setSourceIndex] = useState(0);
  const [fileOverride, setFileOverride] = useState<number | undefined>(undefined);
  const source = sources[sourceIndex];
  const magnet = source?.magnet;
  const isTorrent = Boolean(magnet);
  const fileIndex = fileOverride ?? source?.fileIdx;

  const [rawPhase, setPhase] = useState<Phase>(isTorrent ? 'preparing' : 'probing');
  const [mode, setMode] = useState<Mode>('direct');
  const [offset, setOffset] = useState(0); // transcode start position (seconds into the film)
  const [knownDuration, setKnownDuration] = useState(0);
  const [prepare, setPrepare] = useState<PrepareStatus | null>(null);
  const [reencoding, setReencoding] = useState(false);

  // --- Playback UI state ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const [bufferTarget, setBufferTarget] = useState(START_BUFFER_SECONDS);
  const [ahead, setAhead] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [mediaDuration, setMediaDuration] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [subtitles, setSubtitles] = useState<SubtitleOption[]>([]);
  const [activeSub, setActiveSub] = useState<SubtitleOption | null>(null);
  const [subMenuOpen, setSubMenuOpen] = useState(false);

  const wantPlay = useRef(true);
  const autoPausing = useRef(false);
  const justSeeked = useRef(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prepareRef = useRef<PrepareStatus | null>(null);
  const sourceStartedAt = useRef(0);
  const bufferingSince = useRef(0);
  const resumeAt = useRef(0);

  // The film timeline: in transcode mode the <video> starts at 0 at `offset`.
  const base = mode === 'transcode' ? offset : 0;
  const duration = mode === 'transcode' ? knownDuration : mediaDuration || knownDuration;
  const timeline = useRef({ base: 0, duration: 0 });
  useEffect(() => {
    timeline.current = { base, duration };
  }, [base, duration]);
  const filmTime = () => timeline.current.base + (videoRef.current?.currentTime || 0);

  const sourceQuery = magnet
    ? `magnet=${encodeURIComponent(magnet)}${fileIndex !== undefined ? `&fileIndex=${fileIndex}` : ''}`
    : `url=${encodeURIComponent(source?.url || '')}`;
  const directUrl = magnet ? `/api/stream?${sourceQuery}` : source?.url || '';
  // Live/HLS streams can't be probed or converted: go straight to playback.
  const skipProbe = isLive || /\.m3u8(\?|$)/i.test(directUrl);
  const phase: Phase = rawPhase === 'probing' && skipProbe ? 'ready' : rawPhase;
  // Live channels whose servers block cross-origin reads are relayed through our server.
  const [liveRelay, setLiveRelay] = useState(false);
  const activeUrl =
    mode === 'transcode'
      ? `/api/playback/transcode?${sourceQuery}&start=${offset.toFixed(2)}`
      : isLive && liveRelay && /^https?:\/\//i.test(directUrl)
        ? `/api/live/proxy?u=${encodeURIComponent(directUrl)}`
        : directUrl;

  useEffect(() => {
    sourceStartedAt.current = Date.now();
  }, [sourceIndex, fileOverride]);

  // Lock page scroll behind the player.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Stop downloading a torrent once the player leaves it (source switch or close).
  useEffect(() => {
    if (!magnet) return;
    cancelRelease(magnet);
    return () => scheduleRelease(magnet);
  }, [magnet]);

  // --- Source switching ---
  const resetPipeline = useCallback((nextIsTorrent: boolean) => {
    setPhase(nextIsTorrent ? 'preparing' : 'probing');
    setMode('direct');
    setOffset(0);
    setKnownDuration(0);
    setMediaDuration(0);
    setPrepare(null);
    prepareRef.current = null;
    setReencoding(false);
    setBuffering(true);
    setBufferTarget(START_BUFFER_SECONDS);
    setError(null);
    bufferingSince.current = 0;
  }, []);

  const tryNextSource = useCallback(
    (reason: string, keepPosition: boolean) => {
      const next = sourceIndex + 1;
      if (next >= sources.length) {
        setError(`${reason} No other sources are available for this title.`);
        return;
      }
      resumeAt.current = keepPosition ? filmTime() : 0;
      setNotice(`${reason} Switching to another source (${next + 1} of ${sources.length})…`);
      setFileOverride(undefined);
      setSourceIndex(next);
      resetPipeline(Boolean(sources[next].magnet));
    },
     
    [sourceIndex, sources, resetPipeline]
  );
  const tryNextRef = useRef(tryNextSource);
  useEffect(() => {
    tryNextRef.current = tryNextSource;
  }, [tryNextSource]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 7000);
    return () => clearTimeout(t);
  }, [notice]);

  // --- 1. Torrent status: pre-buffer, stats, and failover while preparing ---
  useEffect(() => {
    if (!magnet) return;
    let cancelled = false;
    let failures = 0;
    const poll = async () => {
      try {
        const size = prepareRef.current?.fileSize || 0;
        const { duration: dur } = timeline.current;
        const from = size && dur > 0 ? Math.floor((filmTime() / dur) * size) : 0;
        const res = await fetch(`/api/stream/prepare?${sourceQuery}&from=${from}`);
        if (!res.ok) throw new Error(`prepare failed: ${res.status}`);
        const data: PrepareStatus = await res.json();
        if (cancelled) return;
        failures = 0;
        prepareRef.current = data;
        setPrepare(data);

        setPhase((p) => {
          if (p !== 'preparing') return p;
          if (data.state === 'ready') return 'probing';
          const elapsed = Date.now() - sourceStartedAt.current;
          const remaining = Math.max(0, data.headTarget - data.headBytes);
          const eta = data.downloadSpeed > 0 ? remaining / data.downloadSpeed : Infinity;
          if (data.state === 'error') tryNextRef.current('Couldn’t connect to this source.', false);
          else if (elapsed > NO_PEERS_MS && data.peers === 0) tryNextRef.current('No peers for this source.', false);
          else if (elapsed > SLOW_CHECK_MS && data.state === 'buffering' && eta > MAX_ETA_SECONDS) tryNextRef.current('This source is too slow.', false);
          else if (elapsed > MAX_PREPARE_MS) tryNextRef.current('This source is too slow.', false);
          return p;
        });
      } catch {
        if (!cancelled && ++failures >= 6) setError('The streaming server isn’t responding. Try again in a moment.');
      }
    };
    poll();
    const id = setInterval(poll, 1500);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
     
  }, [magnet, sourceQuery]);

  // --- 2. Probe: can the browser play this file directly, or does it need converting? ---
  useEffect(() => {
    if (phase !== 'probing') return;
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60_000);
    fetch(`/api/playback/probe?${sourceQuery}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((info) => {
        if (cancelled) return;
        const start = resumeAt.current;
        if (info?.duration) setKnownDuration(info.duration);
        if (info && !info.directPlayable) {
          setMode('transcode');
          setOffset(start);
          setReencoding(Boolean(info.reencodesVideo));
          resumeAt.current = 0;
        } else {
          setMode('direct');
        }
        setPhase('ready');
      })
      .catch(() => {
        if (cancelled) return;
        // Couldn't inspect the file: let the browser try; a playback error falls back to converting.
        setMode('direct');
        setPhase('ready');
      })
      .finally(() => clearTimeout(timer));
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [phase, sourceQuery]);

  // --- 3. Attach the media source ---
  useEffect(() => {
    const video = videoRef.current;
    if (!video || phase !== 'ready' || !activeUrl) return;

    let hls: Hls | null = null;
    let stallTimer: ReturnType<typeof setTimeout> | undefined;
    if ((/\.m3u8(\?|$)/i.test(activeUrl) || isLive) && Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, lowLatencyMode: true, backBufferLength: 90 });
      hls.loadSource(activeUrl);
      hls.attachMedia(video);
      // Retry a few times, then say so instead of spinning forever (channels go off air).
      let networkRetries = 0;
      let mediaRetries = 0;
      // Live channel that gets no picture within a few seconds (some servers block segments
      // without a fatal error surfacing): retry through our relay.
      if (isLive && !liveRelay) {
        stallTimer = setTimeout(() => {
          if (video.readyState < 2) setLiveRelay(true);
        }, 10_000);
      }
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal) return;
        const manifestFailed = data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR || data.details === Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT;
        // First network failure on a live channel: retry through our relay (usually a CORS block).
        if (isLive && !liveRelay && data.type === Hls.ErrorTypes.NETWORK_ERROR) setLiveRelay(true);
        else if (data.type === Hls.ErrorTypes.NETWORK_ERROR && !manifestFailed && networkRetries++ < 3) hls?.startLoad();
        else if (data.type === Hls.ErrorTypes.MEDIA_ERROR && mediaRetries++ < 2) hls?.recoverMediaError();
        else setError(isLive ? 'This channel is offline or not available in your region right now.' : 'Could not load this stream.');
      });
    } else {
      video.src = activeUrl;
    }

    return () => {
      clearTimeout(stallTimer);
      hls?.destroy();
      video.removeAttribute('src');
      video.load();
    };
  }, [activeUrl, isLive, phase, liveRelay]);

  // --- 4. Buffer gate: hold playback until enough is available ahead, then (re)start ---
  // Chrome stops fetching a paused video after a few seconds, so for torrents we ask the server
  // how much is downloaded from the current position, and otherwise accept "browser went idle".
  useEffect(() => {
    if (!buffering || phase !== 'ready') return;
    if (!bufferingSince.current) bufferingSince.current = Date.now();
    const id = setInterval(() => {
      const video = videoRef.current;
      if (!video) return;
      const a = bufferedAhead(video);
      const { duration: dur } = timeline.current;
      const now = filmTime();
      const nearEnd = dur > 0 && now + a >= dur - 0.5;
      const browserIdle = video.networkState === video.NETWORK_IDLE && a >= 1;
      let enough: boolean;
      let shown = a;

      if (isLive) {
        enough = video.readyState >= 3;
      } else if (magnet) {
        const st = prepareRef.current;
        const bytesPerSec = st?.fileSize && dur > 0 ? st.fileSize / dur : 0;
        const serverAhead = st?.complete ? Infinity : bytesPerSec ? (st?.aheadBytes || 0) / bytesPerSec : 0;
        shown = Math.max(a, isFinite(serverAhead) ? serverAhead : bufferTarget);
        enough = nearEnd || serverAhead >= bufferTarget || a >= bufferTarget || (!bytesPerSec && browserIdle);

        // A long stall on a swarm that can't keep up: move on, keeping the position.
        const tooSlow = bytesPerSec > 0 && !st?.complete && (st?.downloadSpeed || 0) < bytesPerSec * 0.9;
        if (!enough && tooSlow && isPlaying && Date.now() - bufferingSince.current > MAX_STALL_MS && sources.length > sourceIndex + 1) {
          tryNextRef.current('This source can’t keep up.', true);
          return;
        }
      } else {
        enough = nearEnd || a >= bufferTarget || browserIdle;
      }

      setAhead(shown);
      if (enough && video.readyState >= 3) {
        setBuffering(false);
        bufferingSince.current = 0;
        if (wantPlay.current) video.play().catch(() => setIsPlaying(false));
      }
    }, 400);
    return () => clearInterval(id);
     
  }, [buffering, phase, bufferTarget, isLive, magnet, isPlaying, sourceIndex, sources.length]);

  const onWaiting = () => {
    const video = videoRef.current;
    if (!video || isLive) return;
    if (!justSeeked.current && isPlaying) setBufferTarget((t) => Math.min(MAX_BUFFER_SECONDS, t * 2));
    justSeeked.current = false;
    if (!video.paused) {
      autoPausing.current = true;
      video.pause();
    }
    setBuffering(true);
  };

  const onVideoError = () => {
    if (phase !== 'ready' || isLive) {
      if (isLive) setError('Could not play this live stream.');
      return;
    }
    if (mode === 'direct') {
      // Browser rejected the file as-is: convert it (from the same position).
      const at = filmTime();
      setMode('transcode');
      setOffset(at);
      setBuffering(true);
      return;
    }
    tryNextRef.current('This file couldn’t be played.', true);
  };

  // --- 5. Subtitles ---
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

  const subtitleSrc = activeSub ? `${activeSub.src}&offset=${base.toFixed(2)}` : '';

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
  }, [activeSub, subtitleSrc]);

  const chooseSubtitle = (sub: SubtitleOption | null) => {
    setActiveSub(sub);
    setPreferredSubtitleLang(sub ? sub.lang : 'off');
    setSubMenuOpen(false);
  };

  // --- Controls ---
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (buffering) {
      wantPlay.current = !wantPlay.current;
      setIsPlaying(wantPlay.current);
    } else if (video.paused) {
      wantPlay.current = true;
      video.play().catch(() => {});
    } else {
      wantPlay.current = false;
      video.pause();
    }
  }, [buffering]);

  const seekTo = (target: number) => {
    const video = videoRef.current;
    if (!video || isLive || phase !== 'ready') return;
    const t = Math.max(0, Math.min(duration > 0 ? duration - 1 : target, target));
    justSeeked.current = true;
    setCurrentTime(t);
    if (mode === 'transcode') {
      const local = t - offset;
      const end = video.buffered.length ? video.buffered.end(video.buffered.length - 1) : 0;
      if (local >= 0 && local <= end) {
        video.currentTime = local; // already converted: seek inside the current stream
      } else {
        setOffset(t); // restart the conversion at the new position
        setBuffering(true);
      }
    } else {
      video.currentTime = t;
    }
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
      revealControls();
      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'arrowleft':
          e.preventDefault();
          seekTo(filmTime() - 10);
          break;
        case 'arrowright':
          e.preventDefault();
          seekTo(filmTime() + 10);
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'm':
          toggleMute();
          break;
        case 'c':
          if (subtitles.length) chooseSubtitle(activeSub ? null : subtitles[0]);
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
  }, [togglePlay, toggleFullscreen, toggleMute, revealControls, onClose, subtitles, activeSub, subMenuOpen, duration, isLive, mode, offset, phase]);

  // --- Overlay status ---
  const videoFiles = (prepare?.files || []).filter((f) => VIDEO_FILE.test(f.name));
  const preparingPct = prepare && prepare.headTarget > 0 ? Math.min(99, Math.round((prepare.headBytes / prepare.headTarget) * 100)) : 0;
  const bitrate = prepare?.fileSize && duration > 0 ? prepare.fileSize / duration : 0;
  const swarmTooSlow = isTorrent && !prepare?.complete && bitrate > 0 && (prepare?.downloadSpeed || 0) < bitrate * 0.9;
  const peersLine = isTorrent && prepare && prepare.peers > 0 ? `${prepare.peers} peers · ${formatRate(prepare.downloadSpeed)}` : null;

  let statusText: string | null = null;
  if (phase === 'preparing') {
    statusText = !prepare || prepare.state === 'connecting' ? 'Connecting to peers…' : `Downloading the start of the video… ${preparingPct}%`;
  } else if (phase === 'probing') {
    statusText = 'Preparing video…';
  } else if (buffering) {
    statusText = isLive ? 'Connecting…' : `Buffering… ${Math.min(Math.floor(ahead), bufferTarget)} / ${bufferTarget}s`;
  }
  const canSkipSource = sources.length > sourceIndex + 1;
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
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          if (isFinite(v.duration)) setMediaDuration(v.duration);
          if (mode === 'direct' && resumeAt.current > 0) {
            v.currentTime = resumeAt.current;
            resumeAt.current = 0;
          }
        }}
        onDurationChange={(e) => {
          const d = e.currentTarget.duration;
          if (isFinite(d)) setMediaDuration(d);
        }}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          setCurrentTime(base + v.currentTime);
          if (v.buffered.length) setBufferedEnd(base + v.buffered.end(v.buffered.length - 1));
        }}
        onProgress={(e) => {
          const v = e.currentTarget;
          if (v.buffered.length) setBufferedEnd(base + v.buffered.end(v.buffered.length - 1));
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
        onError={onVideoError}
      >
        {activeSub && (
          <track key={`${activeSub.id}-${base}`} kind="subtitles" src={subtitleSrc} srcLang={activeSub.lang} label={activeSub.label} default />
        )}
      </video>

      {/* Status overlay */}
      {statusText && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/50">
          <div className="w-12 h-12 rounded-full border-4 border-white/15 border-t-rose-500 animate-spin" />
          <p className="text-white text-sm font-semibold">{statusText}</p>
          {peersLine && <p className="text-xs text-zinc-400">{peersLine}</p>}
          {phase === 'ready' && buffering && mode === 'transcode' && reencoding && (
            <p className="text-xs text-zinc-500">Converting this video for your browser</p>
          )}
          {swarmTooSlow && buffering && phase === 'ready' && (
            <p className="max-w-sm text-center text-xs text-amber-300/90 px-4">
              This source downloads slower than it plays ({formatRate(prepare?.downloadSpeed || 0)} vs {formatRate(bitrate)} needed).
            </p>
          )}
          {canSkipSource && (
            <button
              onClick={() => tryNextSource('Skipped.', phase === 'ready')}
              className="mt-1 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white"
            >
              <SkipForward className="w-3.5 h-3.5" />
              Try another source
            </button>
          )}
          {sources.length > 1 && <p className="text-[11px] text-zinc-500">Source {sourceIndex + 1} of {sources.length}</p>}
        </div>
      )}

      {notice && !error && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 max-w-md px-4 py-2.5 rounded-xl bg-zinc-900/95 border border-zinc-700 text-xs text-zinc-200 shadow-xl text-center">
          {notice}
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
        <button onClick={onClose} aria-label="Close player" className="p-2.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-white border border-zinc-700/60">
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
              <div
                className="absolute h-1 rounded-full bg-white/35"
                style={{ left: `${(base / duration) * 100}%`, width: `${Math.max(0, Math.min(100, ((bufferedEnd - base) / duration) * 100))}%` }}
              />
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
          <div className="flex items-center gap-1">
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
                  resumeAt.current = 0;
                  setFileOverride(parseInt(e.target.value, 10));
                  resetPipeline(true);
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
