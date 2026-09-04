'use client';

import React, { useState, useEffect } from 'react';
import { X, SlidersHorizontal, Key, HardDrive, Check, Zap, Info } from 'lucide-react';
import { UserSettings } from '@/types';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [settings, setSettings] = useState<UserSettings>({
    tmdbApiKey: '',
    realDebridToken: '',
    autoTranscode: true,
    defaultSubtitleLang: 'en',
    maxPeers: 60,
    hardwareAcceleration: true,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const local = localStorage.getItem('screentime_settings');
    if (local) {
      try {
        setSettings(JSON.parse(local));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('screentime_settings', JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
          <div className="w-10 h-10 rounded-xl bg-zinc-800 text-zinc-200 border border-zinc-700 flex items-center justify-center mb-3">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Settings & Integrations
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            Configure streaming engine parameters, metadata providers, and API keys.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-5">
          {/* TMDB API Key */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-rose-400" />
              TMDB API Key (The Movie Database)
            </label>
            <input
              type="text"
              value={settings.tmdbApiKey}
              onChange={(e) => setSettings({ ...settings, tmdbApiKey: e.target.value })}
              placeholder="Enter your TMDB API v3 key (optional)"
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-rose-500 font-mono"
            />
            <p className="text-[11px] text-zinc-500 mt-1">
              If left blank, Screentime uses its built-in open media catalog.
            </p>
          </div>

          {/* Real-Debrid / Torbox Token */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Real-Debrid / Debrid API Token (Optional)
            </label>
            <input
              type="password"
              value={settings.realDebridToken}
              onChange={(e) => setSettings({ ...settings, realDebridToken: e.target.value })}
              placeholder="API Token for high-speed CDN unmetered caching"
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-rose-500 font-mono"
            />
          </div>

          {/* Max Swarm Peers */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Max Swarm Peers
              </label>
              <input
                type="number"
                min={10}
                max={200}
                value={settings.maxPeers}
                onChange={(e) => setSettings({ ...settings, maxPeers: parseInt(e.target.value, 10) || 60 })}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-rose-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Default Subtitles
              </label>
              <select
                value={settings.defaultSubtitleLang}
                onChange={(e) => setSettings({ ...settings, defaultSubtitleLang: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-rose-500"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="nl">Dutch</option>
                <option value="none">Disabled</option>
              </select>
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3 pt-2">
            <label className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 rounded-xl cursor-pointer">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-zinc-200">Auto FFmpeg Transcoder</span>
                <p className="text-[11px] text-zinc-500">Automatically remux MKV/AVI/AC3 audio for web compatibility</p>
              </div>
              <input
                type="checkbox"
                checked={settings.autoTranscode}
                onChange={(e) => setSettings({ ...settings, autoTranscode: e.target.checked })}
                className="w-4 h-4 rounded accent-rose-500"
              />
            </label>
          </div>

          {/* Save Button */}
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition-all"
          >
            {saved ? (
              <>
                <Check className="w-4 h-4 text-white" />
                Settings Saved!
              </>
            ) : (
              'Save Preferences'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
