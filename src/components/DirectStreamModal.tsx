'use client';

import React, { useState } from 'react';
import { X, Magnet, Play, Sparkles, Link, Zap } from 'lucide-react';

interface DirectStreamModalProps {
  onClose: () => void;
  onPlayMagnet: (magnet: string, title: string) => void;
  onPlayDirectUrl: (url: string, title: string) => void;
}

const PRESET_STREAMS = [
  {
    title: 'Cosmos Laundromat (Open Movie 1080p)',
    type: 'torrent',
    magnet: 'magnet:?xt=urn:btih:c9e15763f722f23e98a29decdfae341b98d53056&dn=Cosmos+Laundromat&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337',
  },
  {
    title: 'Big Buck Bunny (1080p Surround)',
    type: 'torrent',
    magnet: 'magnet:?xt=urn:btih:dd8255ecdc7ca55fb0bbf81323d87062db1f6d1c&dn=Big+Buck+Bunny&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337',
  },
  {
    title: 'Tears of Steel (Open VFX Sci-Fi)',
    type: 'torrent',
    magnet: 'magnet:?xt=urn:btih:209c310cd6b191af46b911a474694077f09a5390&dn=Tears+of+Steel&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337',
  },
  {
    title: 'Direct CDN MP4 Demo Stream',
    type: 'direct',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  },
];

export const DirectStreamModal: React.FC<DirectStreamModalProps> = ({
  onClose,
  onPlayMagnet,
  onPlayDirectUrl,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [customTitle, setCustomTitle] = useState('');

  const handleStartStream = (e: React.FormEvent) => {
    e.preventDefault();
    const val = inputVal.trim();
    if (!val) return;

    const title = customTitle.trim() || (val.startsWith('magnet:') ? 'Custom Torrent Stream' : 'Direct Media Stream');

    if (val.startsWith('magnet:') || val.length === 40) {
      const magnet = val.startsWith('magnet:') ? val : `magnet:?xt=urn:btih:${val}`;
      onPlayMagnet(magnet, title);
    } else {
      onPlayDirectUrl(val, title);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="space-y-1">
          <div className="w-10 h-10 rounded-xl bg-rose-600/20 text-rose-500 border border-rose-500/30 flex items-center justify-center mb-3">
            <Magnet className="w-5 h-5" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Stream Any Magnet or Direct Media URL
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            Paste a BitTorrent magnet link, infohash, or direct media stream URL to start streaming immediately in your browser.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleStartStream} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Magnet Link, Infohash, or Media Stream URL
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="magnet:?xt=urn:btih:... or https://example.com/video.mp4"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-xs sm:text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-rose-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Stream Display Title (Optional)
            </label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="e.g. My Movie 1080p"
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-rose-500"
            />
          </div>

          <button
            type="submit"
            disabled={!inputVal.trim()}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 disabled:opacity-40 text-white font-semibold text-sm shadow-xl shadow-rose-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <Play className="w-4 h-4 fill-white" />
            Launch Instant Stream
          </button>
        </form>

        {/* Quick Demo Presets */}
        <div className="space-y-2 pt-2 border-t border-zinc-800">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Quick Test Swarm Presets
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PRESET_STREAMS.map((preset, i) => (
              <button
                key={i}
                onClick={() => {
                  if (preset.type === 'torrent' && preset.magnet) {
                    onPlayMagnet(preset.magnet, preset.title);
                  } else if (preset.url) {
                    onPlayDirectUrl(preset.url, preset.title);
                  }
                }}
                className="p-2.5 bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/50 hover:border-rose-500/50 rounded-xl text-left transition-all group"
              >
                <p className="text-xs font-semibold text-zinc-200 group-hover:text-rose-400 truncate">
                  {preset.title}
                </p>
                <span className="text-[10px] text-zinc-500 uppercase font-medium">
                  {preset.type === 'torrent' ? '⚡ P2P Torrent' : '🌐 Direct CDN'}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
