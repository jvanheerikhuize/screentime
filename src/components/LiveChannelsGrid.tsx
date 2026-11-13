'use client';

import React, { useState } from 'react';
import { Play, Globe, Tv } from 'lucide-react';
import { LiveChannel } from '@/types';
import { LIVE_CHANNELS } from '@/lib/channels/liveChannels';
import { PageHeader } from '@/components/PageHeader';

interface LiveChannelsGridProps {
  onPlayChannel: (channel: LiveChannel) => void;
}

const CATEGORIES = ['All', 'News', 'Space & Science', 'Sports', 'Documentary', 'Entertainment'];

export const LiveChannelsGrid: React.FC<LiveChannelsGridProps> = ({ onPlayChannel }) => {
  const [category, setCategory] = useState('All');
  const channels = LIVE_CHANNELS.filter((ch) => category === 'All' || ch.category === category);

  return (
    <div>
      <PageHeader eyebrow="Live" title="Live TV" description="Free-to-air news, space, sports and documentary channels, around the clock." />

      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              category === cat ? 'bg-white text-zinc-950' : 'bg-white/[0.05] text-zinc-300 ring-1 ring-inset ring-white/[0.08] hover:bg-white/10 hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {channels.map((channel) => (
          <button
            key={channel.id}
            onClick={() => onPlayChannel(channel)}
            className="group text-left rounded-2xl overflow-hidden bg-white/[0.03] ring-1 ring-inset ring-white/[0.07] hover:ring-white/20 hover:bg-white/[0.05] transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/50"
          >
            <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-zinc-800 via-zinc-900 to-rose-950/40">
              <Tv className="absolute inset-0 m-auto w-10 h-10 text-white/15" />
              <img
                src={channel.logo}
                alt=""
                onError={(e) => (e.currentTarget.style.display = 'none')}
                className="relative w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-lg shadow-rose-900/40">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                Live
              </span>
              <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-md text-[10px] font-medium text-zinc-200">
                {channel.country}
              </span>
              <span className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                <Play className="w-4 h-4 fill-current ml-0.5" />
              </span>
            </div>
            <div className="p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{channel.category}</p>
              <h3 className="mt-1 font-display text-base font-semibold text-white truncate">{channel.name}</h3>
              <p className="mt-1 text-xs text-zinc-400 line-clamp-2 leading-relaxed">{channel.description}</p>
              <p className="mt-3 inline-flex items-center gap-1 text-[11px] text-zinc-500">
                <Globe className="w-3 h-3" />
                {channel.language}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
