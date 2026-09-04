'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  RotateCcw, RotateCw, Activity, ArrowDownCircle, Users,
  Sparkles, AlertCircle, RefreshCw, Radio
} from 'lucide-react';
import Hls from 'hls.js';
import { TorrentStats } from '@/types';

interface VideoPlayerModalProps {
  title: string;
  streamUrl: string;
  magnet?: string;
  isTorrent?: boolean;
  isLive?: boolean;
  onClose: () => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  title,
  streamUrl,
  magnet,
  isTorrent = false,
  isLive = false,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [useTranscode, setUseTranscode] = useState(false);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Torrent Swarm Stats
  const [torrentStats, setTorrentStats] = useState<TorrentStats | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Active Stream URL resolution
  const activeUrl = React.useMemo(() => {
    if (!isTorrent || !magnet) return streamUrl;
    let url = `/api/stream?magnet=${encodeURIComponent(magnet)}`;
    if (selectedFileIndex !== undefined) {
      url += `&fileIndex=${selectedFileIndex}`;
    }
    if (useTranscode) {
      url += `&transcode=true`;
    }
    return url;
  }, [streamUrl, magnet, isTorrent, selectedFileIndex, useTranscode]);

  // HLS / Direct Media Player Lifecycle
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setIsLoading(true);
    setError(null);

    // Destroy previous HLS instance if any
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHlsStream = activeUrl.includes('.m3u8') || isLive;

    if (isHlsStream && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });
      hlsRef.current = hls;

      hls.loadSource(activeUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        video.play().then(() => setIsPlaying(true)).catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              setError('Failed to connect to live stream feed.');
              setIsLoading(false);
              break;
          }
        }
      });
    } else if (isHlsStream && video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Apple Safari HLS playback
      video.src = activeUrl;
      video.addEventListener('loadedmetadata', () => {
        setIsLoading(false);
        video.play().then(() => setIsPlaying(true)).catch(() => {});
      });
    } else {
      // Direct MP4 / WebM / Torrent HTTP stream
      video.src = activeUrl;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [activeUrl, isLive]);

  // Torrent Stats Polling
  useEffect(() => {
    if (!isTorrent || !magnet) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/stream/stats?magnet=${encodeURIComponent(magnet)}`);
        if (res.ok) {
          const data = await res.json();
          setTorrentStats(data);
        }
      } catch (e) {
        // ignore polling error
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [isTorrent, magnet]);

  // Hide Controls on Idle
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3500);
  };

  // Play / Pause Toggle
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch((err) => console.error(err));
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  // Time & Buffer Tracking
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
    if (videoRef.current.buffered.length > 0) {
      const end = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
      setBufferedEnd(end);
    }
  };

  // Seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = target;
      setCurrentTime(target);
    }
  };

  const skipTime = (seconds: number) => {
    if (videoRef.current && !isLive) {
      videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
    }
  };

  // Volume
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const next = !isMuted;
    setIsMuted(next);
    videoRef.current.muted = next;
  };

  // Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(console.error);
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(console.error);
    }
  };

  // Playback Speed
  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'arrowleft':
          e.preventDefault();
          skipTime(-10);
          break;
        case 'arrowright':
          e.preventDefault();
          skipTime(10);
          break;
        case 'arrowup':
          e.preventDefault();
          if (videoRef.current) {
            const nv = Math.min(1, videoRef.current.volume + 0.1);
            setVolume(nv);
            videoRef.current.volume = nv;
          }
          break;
        case 'arrowdown':
          e.preventDefault();
          if (videoRef.current) {
            const nv = Math.max(0, videoRef.current.volume - 0.1);
            setVolume(nv);
            videoRef.current.volume = nv;
          }
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'escape':
          if (!document.fullscreenElement) {
            onClose();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, onClose, duration, isLive]);

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center select-none overflow-hidden"
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain cursor-pointer"
        onClick={togglePlay}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => {
          if (videoRef.current) {
            setDuration(videoRef.current.duration || 0);
            setIsLoading(false);
            setError(null);
            videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
          }
        }}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => {
          setIsLoading(false);
          setIsPlaying(true);
        }}
        onPause={() => setIsPlaying(false)}
        onError={() => {
          setIsLoading(false);
          setError('Playback encountered an error or format issue. Try enabling Transcoding below.');
        }}
        playsInline
      />

      {/* Loading Spinner & Swarm Buffer HUD */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 pointer-events-none gap-3 z-20">
          <div className="w-14 h-14 rounded-full border-4 border-rose-500/20 border-t-rose-500 animate-spin" />
          <p className="text-white text-sm font-semibold tracking-wide flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-rose-400 animate-pulse" />
            {isTorrent ? 'Buffering torrent swarm...' : isLive ? 'Connecting to live broadcast stream...' : 'Loading media stream...'}
          </p>
          {isTorrent && torrentStats && (
            <div className="text-xs text-zinc-300 bg-zinc-900/80 px-3 py-1.5 rounded-full border border-zinc-700/60 backdrop-blur-md flex items-center gap-3">
              <span>Peers: <strong className="text-emerald-400">{torrentStats.peers}</strong></span>
              <span>Speed: <strong className="text-rose-400">{formatBytes(torrentStats.downloadSpeed)}/s</strong></span>
            </div>
          )}
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="absolute top-20 max-w-lg bg-red-950/90 border border-red-700/80 rounded-2xl p-4 text-white z-30 shadow-2xl backdrop-blur-md flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-2 flex-1">
            <p className="text-sm font-medium">{error}</p>
            {!useTranscode && !isLive && (
              <button
                onClick={() => {
                  setUseTranscode(true);
                  setError(null);
                  setIsLoading(true);
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Switch to On-the-Fly Transcoder (FFmpeg)
              </button>
            )}
          </div>
        </div>
      )}

      {/* Top Overlay Bar */}
      <div
        className={`absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/90 via-black/40 to-transparent flex items-center justify-between transition-opacity duration-300 z-20 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-white border border-zinc-700/60 transition-transform hover:scale-105 active:scale-95 shadow-lg"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white drop-shadow truncate max-w-md sm:max-w-xl">
              {title}
            </h1>
            {isTorrent ? (
              <span className="text-xs text-rose-400 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                P2P BitTorrent Stream
              </span>
            ) : isLive ? (
              <span className="text-xs text-rose-400 font-semibold flex items-center gap-1.5 uppercase tracking-wider">
                <Radio className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                24/7 Live Broadcast
              </span>
            ) : null}
          </div>
        </div>

        {/* Live Swarm Stats HUD (when streaming torrent) */}
        {isTorrent && torrentStats && (
          <div className="hidden md:flex items-center gap-3 bg-zinc-900/80 border border-zinc-800 backdrop-blur-md px-3.5 py-1.5 rounded-2xl text-xs text-zinc-300">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span>{torrentStats.peers} peers</span>
            </div>
            <span className="text-zinc-600">|</span>
            <div className="flex items-center gap-1.5">
              <ArrowDownCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>{formatBytes(torrentStats.downloadSpeed)}/s</span>
            </div>
            <span className="text-zinc-600">|</span>
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span>{(torrentStats.progress * 100).toFixed(1)}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/95 via-black/60 to-transparent transition-opacity duration-300 z-20 space-y-3 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Seekbar (hidden in 24/7 live mode) */}
        {!isLive && (
          <div className="relative group/seek flex items-center">
            {duration > 0 && (
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-zinc-600/60 rounded-full pointer-events-none"
                style={{ width: `${(bufferedEnd / duration) * 100}%` }}
              />
            )}
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-rose-500 hover:h-2 transition-all"
            />
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-between gap-4">
          {/* Left Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="p-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30 transition-transform hover:scale-105 active:scale-95"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
            </button>

            {!isLive && (
              <>
                <button
                  onClick={() => skipTime(-10)}
                  className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800/80 transition-colors"
                  title="Rewind 10s"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  onClick={() => skipTime(10)}
                  className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800/80 transition-colors"
                  title="Forward 10s"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </>
            )}

            {/* Volume */}
            <div className="flex items-center gap-2 group/volume">
              <button
                onClick={toggleMute}
                className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800/80 transition-colors"
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 sm:w-20 h-1 bg-zinc-700 rounded-full appearance-none accent-rose-500 cursor-pointer opacity-80 group-hover/volume:opacity-100 transition-opacity"
              />
            </div>

            {/* Time Stamp / Live Indicator */}
            {isLive ? (
              <span className="flex items-center gap-1.5 text-xs font-bold text-rose-500 bg-rose-600/20 px-2 py-0.5 rounded-md uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                LIVE
              </span>
            ) : (
              <span className="text-xs font-mono text-zinc-400 pl-1">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            )}
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Multi-file selection inside torrent */}
            {isTorrent && torrentStats?.files && torrentStats.files.length > 1 && (
              <div className="relative">
                <select
                  value={selectedFileIndex}
                  onChange={(e) => setSelectedFileIndex(parseInt(e.target.value, 10))}
                  className="bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-rose-500 cursor-pointer"
                >
                  {torrentStats.files.map((file) => (
                    <option key={file.index} value={file.index}>
                      {file.name} ({formatBytes(file.length)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Transcode Toggle */}
            {!isLive && (
              <button
                onClick={() => setUseTranscode(!useTranscode)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                  useTranscode
                    ? 'bg-rose-600/30 border-rose-500 text-rose-300'
                    : 'bg-zinc-900/80 border-zinc-700 text-zinc-400 hover:text-white'
                }`}
                title="Transcode video stream via FFmpeg"
              >
                {useTranscode ? 'Transcode: ON' : 'Direct Play'}
              </button>
            )}

            {/* Speed Selector (non-live) */}
            {!isLive && (
              <div className="flex items-center bg-zinc-900/80 border border-zinc-800 rounded-lg p-0.5 text-xs text-zinc-300">
                {[1, 1.25, 1.5].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => handleSpeedChange(speed)}
                    className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                      playbackSpeed === speed ? 'bg-zinc-700 text-white font-bold' : 'hover:text-white'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            )}

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800/80 transition-colors"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
