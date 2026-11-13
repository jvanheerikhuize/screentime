'use client';

import React, { useState, useEffect } from 'react';
import {
  X, SlidersHorizontal, Key, Check, Globe, Plus, Trash2,
  Server, RefreshCw, CheckCircle2, AlertCircle
} from 'lucide-react';
import { UserSettings } from '@/types';
import { DEFAULT_ADDON_URLS, cleanAddonUrls } from '@/lib/scrapers/stremioAddons';
import { Modal } from './Modal';
import { setPreferredSubtitleLang } from '@/lib/subtitleLanguages';

const SUBTITLE_LANGUAGES: [string, string][] = [
  ['off', 'Off'], ['en', 'English'], ['nl', 'Dutch'], ['de', 'German'], ['fr', 'French'], ['es', 'Spanish'],
  ['it', 'Italian'], ['pt', 'Portuguese'], ['pl', 'Polish'], ['sv', 'Swedish'], ['da', 'Danish'], ['no', 'Norwegian'],
  ['fi', 'Finnish'], ['tr', 'Turkish'], ['ru', 'Russian'], ['el', 'Greek'], ['cs', 'Czech'], ['hu', 'Hungarian'],
  ['ro', 'Romanian'], ['ar', 'Arabic'], ['he', 'Hebrew'], ['ja', 'Japanese'], ['ko', 'Korean'], ['zh', 'Chinese'],
];

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [settings, setSettings] = useState<UserSettings>({
    tmdbApiKey: '',
    autoTranscode: true,
    defaultSubtitleLang: 'en',
    maxPeers: 60,
    hardwareAcceleration: true,
    addonUrls: DEFAULT_ADDON_URLS,
    prowlarrEnabled: false,
    prowlarrUrl: 'http://localhost:9696',
    prowlarrApiKey: '',
    jackettEnabled: false,
    jackettUrl: 'http://localhost:9117',
    jackettApiKey: '',
  });

  const [newAddonUrl, setNewAddonUrl] = useState('');
  const [saved, setSaved] = useState(false);

  // Connection testing state
  const [testingProwlarr, setTestingProwlarr] = useState(false);
  const [prowlarrStatus, setProwlarrStatus] = useState<{ success: boolean; message: string } | null>(null);

  const [testingJackett, setTestingJackett] = useState(false);
  const [jackettStatus, setJackettStatus] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    const local = localStorage.getItem('screentime_settings');
    if (local) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { realDebridToken, ...parsed } = JSON.parse(local); // paid debrid support was removed
        setSettings((prev) => ({ ...prev, ...parsed, addonUrls: cleanAddonUrls(parsed.addonUrls) }));
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

  const handleAddAddon = () => {
    if (!newAddonUrl.trim()) return;
    const clean = newAddonUrl.trim().replace(/\/+$/, '');
    if (!settings.addonUrls.includes(clean)) {
      setSettings({
        ...settings,
        addonUrls: [...settings.addonUrls, clean],
      });
    }
    setNewAddonUrl('');
  };

  const handleRemoveAddon = (urlToRemove: string) => {
    setSettings({
      ...settings,
      addonUrls: settings.addonUrls.filter((u) => u !== urlToRemove),
    });
  };

  const handleTestProwlarr = async () => {
    if (!settings.prowlarrUrl || !settings.prowlarrApiKey) {
      setProwlarrStatus({ success: false, message: 'Please enter Prowlarr Host URL and API key' });
      return;
    }
    setTestingProwlarr(true);
    setProwlarrStatus(null);
    try {
      const res = await fetch('/api/integrations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'prowlarr',
          hostUrl: settings.prowlarrUrl,
          apiKey: settings.prowlarrApiKey,
        }),
      });
      const data = await res.json();
      setProwlarrStatus(data);
    } catch (e: any) {
      setProwlarrStatus({ success: false, message: e.message || 'Connection test failed' });
    } finally {
      setTestingProwlarr(false);
    }
  };

  const handleTestJackett = async () => {
    if (!settings.jackettUrl || !settings.jackettApiKey) {
      setJackettStatus({ success: false, message: 'Please enter Jackett Host URL and API key' });
      return;
    }
    setTestingJackett(true);
    setJackettStatus(null);
    try {
      const res = await fetch('/api/integrations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'jackett',
          hostUrl: settings.jackettUrl,
          apiKey: settings.jackettApiKey,
        }),
      });
      const data = await res.json();
      setJackettStatus(data);
    } catch (e: any) {
      setJackettStatus({ success: false, message: e.message || 'Connection test failed' });
    } finally {
      setTestingJackett(false);
    }
  };

  return (
    <Modal onClose={onClose} maxWidth="max-w-xl">
      <div className="p-6 sm:p-8 space-y-6">

        {/* Header */}
        <div className="space-y-1">
          <div className="w-10 h-10 rounded-xl bg-zinc-800 text-zinc-200 border border-zinc-700 flex items-center justify-center mb-3">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Settings & Integrations
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            Configure self-hosted aggregators (Prowlarr/Jackett), Stremio addons, and metadata API keys.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-6">
          {/* 1. Self-Hosted Prowlarr Indexer Section */}
          <div className="space-y-3 bg-zinc-950/80 p-4 rounded-2xl border border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-rose-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Prowlarr Indexer Aggregator
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.prowlarrEnabled}
                onChange={(e) => setSettings({ ...settings, prowlarrEnabled: e.target.checked })}
                className="w-4 h-4 rounded accent-rose-500 cursor-pointer"
              />
            </div>
            <p className="text-[11px] text-zinc-400">
              Connect to your local or remote Prowlarr instance to query all configured private and public torrent indexers via the v1 API.
            </p>

            {settings.prowlarrEnabled && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                    Prowlarr Host URL
                  </label>
                  <input
                    type="text"
                    value={settings.prowlarrUrl || ''}
                    onChange={(e) => setSettings({ ...settings, prowlarrUrl: e.target.value })}
                    placeholder="http://localhost:9696 or http://192.168.1.100:9696"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-rose-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                    Prowlarr API Key
                  </label>
                  <input
                    type="password"
                    value={settings.prowlarrApiKey || ''}
                    onChange={(e) => setSettings({ ...settings, prowlarrApiKey: e.target.value })}
                    placeholder="Prowlarr Settings -> General -> Security -> API Key"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-rose-500 font-mono"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleTestProwlarr}
                    disabled={testingProwlarr}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testingProwlarr ? 'animate-spin text-rose-500' : ''}`} />
                    Test Connection
                  </button>

                  {prowlarrStatus && (
                    <span
                      className={`text-xs font-semibold flex items-center gap-1 ${
                        prowlarrStatus.success ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {prowlarrStatus.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                      {prowlarrStatus.message}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. Self-Hosted Jackett / Torznab Section */}
          <div className="space-y-3 bg-zinc-950/80 p-4 rounded-2xl border border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Jackett / Torznab Aggregator
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.jackettEnabled}
                onChange={(e) => setSettings({ ...settings, jackettEnabled: e.target.checked })}
                className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
              />
            </div>
            <p className="text-[11px] text-zinc-400">
              Query Jackett Torznab feeds to fetch releases from all configured trackers.
            </p>

            {settings.jackettEnabled && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                    Jackett Host URL
                  </label>
                  <input
                    type="text"
                    value={settings.jackettUrl || ''}
                    onChange={(e) => setSettings({ ...settings, jackettUrl: e.target.value })}
                    placeholder="http://localhost:9117 or http://192.168.1.100:9117"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-rose-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                    Jackett API Key
                  </label>
                  <input
                    type="password"
                    value={settings.jackettApiKey || ''}
                    onChange={(e) => setSettings({ ...settings, jackettApiKey: e.target.value })}
                    placeholder="Top right of Jackett dashboard"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-rose-500 font-mono"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleTestJackett}
                    disabled={testingJackett}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testingJackett ? 'animate-spin text-amber-500' : ''}`} />
                    Test Connection
                  </button>

                  {jackettStatus && (
                    <span
                      className={`text-xs font-semibold flex items-center gap-1 ${
                        jackettStatus.success ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {jackettStatus.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                      {jackettStatus.message}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 3. Stremio Addons Section */}
          <div className="space-y-2 bg-zinc-950/80 p-4 rounded-2xl border border-zinc-800">
            <label className="block text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-rose-400" />
              Stremio Addon Endpoints
            </label>
            <div className="space-y-1.5 pt-1">
              {settings.addonUrls.map((url) => (
                <div
                  key={url}
                  className="flex items-center justify-between p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs"
                >
                  <span className="font-mono text-zinc-300 truncate max-w-[320px]">{url}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAddon(url)}
                    className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-red-400 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={newAddonUrl}
                onChange={(e) => setNewAddonUrl(e.target.value)}
                placeholder="https://torrentio.strem.fun or custom addon URL"
                className="flex-1 bg-zinc-900 border border-zinc-700/70 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-rose-500 font-mono"
              />
              <button
                type="button"
                onClick={handleAddAddon}
                className="px-3 py-2 bg-zinc-800 hover:bg-rose-600 text-white text-xs font-semibold rounded-xl flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
          </div>

          {/* 4. TMDB */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-rose-400" />
                TMDB API key (optional, free)
              </label>
              <input
                type="text"
                value={settings.tmdbApiKey}
                onChange={(e) => setSettings({ ...settings, tmdbApiKey: e.target.value })}
                placeholder="Enter your TMDB API v3 key"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-2 text-xs sm:text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-rose-500 font-mono"
              />
            </div>
          </div>

          {/* Subtitles */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-300">Subtitle language</label>
            <select
              value={settings.defaultSubtitleLang}
              onChange={(e) => {
                setSettings({ ...settings, defaultSubtitleLang: e.target.value });
                setPreferredSubtitleLang(e.target.value);
              }}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
            >
              {SUBTITLE_LANGUAGES.map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-zinc-500">Turned on automatically when available. You can also change it in the player (CC).</p>
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
    </Modal>
  );
};
