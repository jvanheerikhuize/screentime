'use client';

import React, { useState } from 'react';
import { Radio, Play, Globe, Sparkles, Tv } from 'lucide-react';
import { LiveChannel } from '@/types';
import { LIVE_CHANNELS } from '@/lib/channels/liveChannels';

interface LiveChannelsGridProps {
  onPlayChannel: (channel: LiveChannel) => void;
}

export const LiveChannelsGrid: React.FC<LiveChannelsGridProps> = ({ onPlayChannel }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', 'News', 'Space & Science', 'Sports', 'Documentary', 'Entertainment'];

  const filtered = LIVE_CHANNELS.filter((ch) => {
    if (selectedCategory === 'All') return true;
    return ch.category === selectedCategory;
  });

  return (
    <div className="space-y-6 pt-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-600/20 text-rose-500 border border-rose-500/30 flex items-center justify-center">
            <Radio className="w-5 h-5 animate-pulse text-rose-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              Free Live TV & Public Streams
              <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-600/20 text-rose-400 border border-rose-500/30 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                24/7 Live
              </span>
            </h1>
            <p className="text-xs text-zinc-400">
              Free-to-air international news, NASA space livestreams, sports, and documentaries powered by IPTV-org.
            </p>
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar bg-zinc-950 p-1 rounded-xl border border-zinc-800">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-rose-600 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of channels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map((channel) => (
          <div
            key={channel.id}
            onClick={() => onPlayChannel(channel)}
            className="group p-4 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-800 hover:border-rose-500/50 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-rose-600/10 hover:-translate-y-1 flex flex-col justify-between"
          >
            <div className="space-y-3">
              {/* Card Image Banner */}
              <div className="relative h-32 w-full rounded-xl overflow-hidden bg-zinc-950">
                <img
                  src={channel.logo}
                  alt={channel.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />

                {/* Live Badge */}
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-600/90 text-white text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  LIVE
                </div>

                {/* Country Badge */}
                <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-zinc-950/80 text-zinc-300 text-[10px] font-medium border border-zinc-700/60 backdrop-blur-md">
                  {channel.country}
                </div>
              </div>

              {/* Channel Meta */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                  {channel.category}
                </span>
                <h3 className="text-sm font-bold text-white group-hover:text-rose-400 transition-colors truncate">
                  {channel.name}
                </h3>
                <p className="text-xs text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                  {channel.description}
                </p>
              </div>
            </div>

            {/* Action */}
            <div className="pt-4 flex items-center justify-between border-t border-zinc-800/60 mt-3">
              <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                <Globe className="w-3 h-3" />
                {channel.language}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPlayChannel(channel);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-600/20 group-hover:scale-105 transition-all"
              >
                <Play className="w-3 h-3 fill-white" />
                Watch
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
