export interface MediaItem {
  id: string | number;
  tmdbId?: number;
  imdbId?: string;
  title: string;
  originalTitle?: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  mediaType: 'movie' | 'tv';
  releaseDate?: string;
  firstAirDate?: string;
  voteAverage: number;
  voteCount?: number;
  genres: string[];
  duration?: number;
  trailerUrl?: string;
  seasons?: Season[];
}

export interface Season {
  seasonNumber: number;
  name: string;
  episodeCount: number;
  overview?: string;
  posterPath?: string;
  episodes: Episode[];
}

export interface Episode {
  id: number;
  episodeNumber: number;
  seasonNumber: number;
  name: string;
  overview: string;
  stillPath: string | null;
  airDate?: string;
  voteAverage?: number;
}

export interface StreamSource {
  id: string;
  name: string;
  title: string;
  magnet?: string;
  url?: string;
  quality: '4K' | '1080p' | '720p' | '480p' | 'Auto';
  size?: string;
  seeds?: number;
  peers?: number;
  provider: string;
  type: 'torrent' | 'direct' | 'debrid';
}

export interface TorrentStats {
  infoHash: string;
  name: string;
  totalSize: number;
  downloaded: number;
  uploaded: number;
  downloadSpeed: number; // bytes/sec
  uploadSpeed: number;   // bytes/sec
  peers: number;
  progress: number;      // 0 to 1
  files: TorrentFileMeta[];
}

export interface TorrentFileMeta {
  index: number;
  name: string;
  length: number;
  path: string;
}

export interface SubtitleTrack {
  id: string;
  label: string;
  language: string;
  src: string;
  default?: boolean;
}

export interface UserSettings {
  tmdbApiKey: string;
  realDebridToken: string;
  autoTranscode: boolean;
  defaultSubtitleLang: string;
  maxPeers: number;
  hardwareAcceleration: boolean;
}
