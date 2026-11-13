'use client';

import React, { useState, useEffect } from 'react';
import {
  SlidersHorizontal, Check, Plus, Trash2, Server, RefreshCw, CheckCircle2, AlertCircle,
  Film, Sparkles, CalendarClock, Tv, Captions, Radar, Database, Puzzle, RotateCcw,
} from 'lucide-react';
import { UserSettings } from '@/types';
import { DEFAULT_ADDON_URLS, cleanAddonUrls, isDefaultAddonList } from '@/lib/scrapers/addonUrls';
import { Modal } from './Modal';
import { getPreferredSubtitleLang, setPreferredSubtitleLang } from '@/lib/subtitleLanguages';

const SUBTITLE_LANGUAGES: [string, string][] = [
  ['off', 'Off'], ['en', 'English'], ['nl', 'Dutch'], ['de', 'German'], ['fr', 'French'], ['es', 'Spanish'],
  ['it', 'Italian'], ['pt', 'Portuguese'], ['pl', 'Polish'], ['sv', 'Swedish'], ['da', 'Danish'], ['no', 'Norwegian'],
  ['fi', 'Finnish'], ['tr', 'Turkish'], ['ru', 'Russian'], ['el', 'Greek'], ['cs', 'Czech'], ['hu', 'Hungarian'],
  ['ro', 'Romanian'], ['ar', 'Arabic'], ['he', 'Hebrew'], ['ja', 'Japanese'], ['ko', 'Korean'], ['zh', 'Chinese'],
];

const DEFAULT_SETTINGS: UserSettings = {
  defaultSubtitleLang: 'en',
  addonUrls: DEFAULT_ADDON_URLS,
  prowlarrEnabled: false,
  prowlarrUrl: 'http://localhost:9696',
  prowlarrApiKey: '',
  jackettEnabled: false,
  jackettUrl: 'http://localhost:9117',
  jackettApiKey: '',
};

interface IntegrationState {
  tmdbConfigured: boolean;
  trackerCount: number;
}

const inputClass =
  'w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-rose-500 font-mono';

function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-0.5">
      <h3 className="text-xs font-bold text-white uppercase tracking-wider">{children}</h3>
      {hint && <p className="text-[11px] text-zinc-500">{hint}</p>}
    </div>
  );
}

function SourceRow({
  icon: Icon, name, provides, status, on = true,
}: { icon: React.ElementType; name: string; provides: string; status: string; on?: boolean }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className="w-8 h-8 shrink-0 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
        <Icon className="w-4 h-4 text-zinc-300" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-white">{name}</span>
        <span className="block text-[11px] text-zinc-500 truncate">{provides}</span>
      </span>
      <span
        className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
          on ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/5 text-zinc-400'
        }`}
      >
        {status}
      </span>
    </li>
  );
}

type IndexerType = 'prowlarr' | 'jackett';

function IndexerSection({
  type, label, keyHint, settings, setSettings,
}: {
  type: IndexerType;
  label: string;
  keyHint: string;
  settings: UserSettings;
  setSettings: (s: UserSettings) => void;
}) {
  const enabledKey = `${type}Enabled` as const;
  const urlKey = `${type}Url` as const;
  const apiKeyKey = `${type}ApiKey` as const;
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<{ success: boolean; message: string } | null>(null);

  const test = async () => {
    if (!settings[urlKey] || !settings[apiKeyKey]) {
      setStatus({ success: false, message: 'Enter the URL and API key first' });
      return;
    }
    setTesting(true);
    setStatus(null);
    try {
      const res = await fetch('/api/integrations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, hostUrl: settings[urlKey], apiKey: settings[apiKeyKey] }),
      });
      setStatus(await res.json());
    } catch (e) {
      setStatus({ success: false, message: e instanceof Error ? e.message : 'Connection test failed' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="py-3">
      <label className="flex items-center justify-between gap-3 cursor-pointer">
        <span className="flex items-center gap-2 text-sm font-semibold text-white">
          <Server className="w-4 h-4 text-zinc-400" />
          {label}
        </span>
        <input
          type="checkbox"
          checked={Boolean(settings[enabledKey])}
          onChange={(e) => setSettings({ ...settings, [enabledKey]: e.target.checked })}
          className="w-4 h-4 rounded accent-rose-500 cursor-pointer"
        />
      </label>
      {settings[enabledKey] && (
        <div className="space-y-2 pt-3">
          <input
            type="text"
            aria-label={`${label} URL`}
            value={settings[urlKey] || ''}
            onChange={(e) => setSettings({ ...settings, [urlKey]: e.target.value })}
            placeholder={type === 'prowlarr' ? 'http://192.168.1.100:9696' : 'http://192.168.1.100:9117'}
            className={inputClass}
          />
          <input
            type="password"
            aria-label={`${label} API key`}
            value={settings[apiKeyKey] || ''}
            onChange={(e) => setSettings({ ...settings, [apiKeyKey]: e.target.value })}
            placeholder={keyHint}
            className={inputClass}
          />
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={test}
              disabled={testing}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin text-rose-500' : ''}`} />
              Test connection
            </button>
            {status && (
              <span className={`text-xs font-semibold flex items-center gap-1 ${status.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                {status.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                {status.message}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [integrations, setIntegrations] = useState<IntegrationState | null>(null);
  const [ffmpegReady, setFfmpegReady] = useState<boolean | null>(null);
  const [newAddonUrl, setNewAddonUrl] = useState('');
  const [addonError, setAddonError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('screentime_settings') || '{}');
      // Keep only settings that still exist (older versions stored more).
      const next: UserSettings = { ...DEFAULT_SETTINGS };
      for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof UserSettings)[]) {
        if (parsed[key] !== undefined) (next as unknown as Record<string, unknown>)[key] = parsed[key];
      }
      next.defaultSubtitleLang = getPreferredSubtitleLang();
      next.addonUrls = cleanAddonUrls(parsed.addonUrls);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time load from localStorage
      setSettings(next);
    } catch {
      // no saved settings
    }
    let cancelled = false;
    fetch('/api/integrations')
      .then((r) => r.json())
      .then((d: IntegrationState) => !cancelled && setIntegrations(d))
      .catch(() => {});
    fetch('/api/health')
      .then((r) => r.json())
      .then((d: { ffmpeg?: boolean }) => !cancelled && setFfmpegReady(Boolean(d.ffmpeg)))
      .catch(() => !cancelled && setFfmpegReady(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('screentime_settings', JSON.stringify(settings));
    setPreferredSubtitleLang(settings.defaultSubtitleLang);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAddAddon = () => {
    const raw = newAddonUrl.trim();
    if (!raw) return;
    let valid = false;
    try {
      valid = /^https?:$/.test(new URL(raw).protocol);
    } catch {
      // not a URL
    }
    if (!valid) {
      setAddonError('Enter the addon’s https:// address');
      return;
    }
    const [clean] = cleanAddonUrls([raw]);
    setAddonError('');
    if (!settings.addonUrls.includes(clean)) setSettings({ ...settings, addonUrls: [...settings.addonUrls, clean] });
    setNewAddonUrl('');
  };

  const handleRemoveAddon = (url: string) => {
    const left = settings.addonUrls.filter((u) => u !== url);
    setSettings({ ...settings, addonUrls: left.length ? left : DEFAULT_ADDON_URLS });
  };

  return (
    <Modal onClose={onClose} maxWidth="max-w-xl" label="Settings">
      <div className="p-6 sm:p-8 space-y-6">
        <div className="space-y-1">
          <div className="w-10 h-10 rounded-xl bg-zinc-800 text-zinc-200 border border-zinc-700 flex items-center justify-center mb-3">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Settings</h2>
          <p className="text-xs sm:text-sm text-zinc-400">Sources, stream addons and subtitles.</p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Built-in sources */}
          <section className="space-y-2">
            <SectionTitle hint="Free and open, no account or key needed.">Built-in sources & server</SectionTitle>
            <ul className="divide-y divide-zinc-800/80 rounded-2xl border border-zinc-800 bg-zinc-950/80 px-4">
              <SourceRow icon={Film} name="Cinemeta" provides="Movie and series catalog" status="On" />
              <SourceRow
                icon={Database}
                name="TMDB"
                provides={integrations?.tmdbConfigured ? 'Extra metadata and trending lists' : 'Optional: set TMDB_API_KEY on the server'}
                status={integrations?.tmdbConfigured ? 'On' : 'Off'}
                on={Boolean(integrations?.tmdbConfigured)}
              />
              <SourceRow icon={Sparkles} name="AniList" provides="Anime catalog and episodes" status="On" />
              <SourceRow icon={CalendarClock} name="TVmaze" provides="New episodes today, series status" status="On" />
              <SourceRow icon={Tv} name="Free-TV" provides="Free-to-air live channels" status="On" />
              <SourceRow icon={Captions} name="OpenSubtitles" provides="Subtitles in your language" status="On" />
              <SourceRow
                icon={Radar}
                name="Public trackers"
                provides="ngosang/trackerslist, refreshed daily"
                status={integrations ? `${integrations.trackerCount} trackers` : 'On'}
              />
              <SourceRow
                icon={Server}
                name="FFmpeg transcoder"
                provides={
                  ffmpegReady === false
                    ? 'Missing on server — install ffmpeg for MKV/HEVC conversion'
                    : 'On-the-fly MKV, HEVC, and audio conversion'
                }
                status={ffmpegReady === null ? 'Checking…' : ffmpegReady ? 'Ready' : 'Missing'}
                on={ffmpegReady !== false}
              />
            </ul>
          </section>

          {/* Stream addons */}
          <section className="space-y-2">
            <div className="flex items-end justify-between gap-3">
              <SectionTitle hint="Stremio addons searched for every title.">Stream addons</SectionTitle>
              {!isDefaultAddonList(settings.addonUrls) && (
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, addonUrls: DEFAULT_ADDON_URLS })}
                  className="text-[11px] font-semibold text-zinc-400 hover:text-white flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
              )}
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3 space-y-1.5">
              {settings.addonUrls.map((url) => (
                <div key={url} className="flex items-center gap-2 p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs">
                  <Puzzle className="w-3.5 h-3.5 shrink-0 text-zinc-500" />
                  <span className="font-mono text-zinc-300 truncate flex-1">{url.replace(/^https?:\/\//, '')}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAddon(url)}
                    aria-label={`Remove ${url}`}
                    className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-red-400 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={newAddonUrl}
                  onChange={(e) => setNewAddonUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddAddon();
                    }
                  }}
                  placeholder="https://… addon or manifest URL"
                  className={inputClass}
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
              {addonError && <p className="text-[11px] text-rose-400">{addonError}</p>}
            </div>
          </section>

          {/* Self-hosted indexers */}
          <section className="space-y-2">
            <SectionTitle hint="Optional: search your own Prowlarr or Jackett too.">Self-hosted indexers</SectionTitle>
            <div className="divide-y divide-zinc-800/80 rounded-2xl border border-zinc-800 bg-zinc-950/80 px-4">
              <IndexerSection
                type="prowlarr"
                label="Prowlarr"
                keyHint="Settings → General → API Key"
                settings={settings}
                setSettings={setSettings}
              />
              <IndexerSection
                type="jackett"
                label="Jackett"
                keyHint="API key, top right of the Jackett dashboard"
                settings={settings}
                setSettings={setSettings}
              />
            </div>
          </section>

          {/* Subtitles */}
          <section className="space-y-2">
            <SectionTitle hint="Turned on automatically when available. You can also change it in the player (CC).">
              Subtitle language
            </SectionTitle>
            <select
              value={settings.defaultSubtitleLang}
              aria-label="Subtitle language"
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
          </section>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition-all"
          >
            {saved ? (
              <>
                <Check className="w-4 h-4 text-white" />
                Saved
              </>
            ) : (
              'Save'
            )}
          </button>
        </form>
      </div>
    </Modal>
  );
};
