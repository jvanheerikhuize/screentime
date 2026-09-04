import { MediaItem } from '@/types';

// Curated high quality seed media for instant out-of-the-box browsing & playback testing
export const FEATURED_HERO: MediaItem = {
  id: 'featured-1',
  tmdbId: 823464,
  imdbId: 'tt4843632',
  title: 'Cosmos Laundromat',
  overview: 'On a desolate island, a suicidal sheep named Franck meets a quirky salesman named Victor, who offers him the gift of a lifetime: the chance to see what his life could have been.',
  posterPath: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
  backdropPath: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1920&auto=format&fit=crop&q=80',
  mediaType: 'movie',
  releaseDate: '2024-05-15',
  voteAverage: 8.7,
  voteCount: 1420,
  genres: ['Sci-Fi', 'Animation', 'Fantasy', 'Adventure'],
  duration: 12,
  trailerUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
};

export const SAMPLE_MEDIA_CATALOG: MediaItem[] = [
  {
    id: 'sample-1',
    tmdbId: 101,
    imdbId: 'tt1254207',
    title: 'Big Buck Bunny',
    overview: 'A large and lovable rabbit deals with bullying forest creatures in this iconic open-source animated short film produced by the Blender Institute.',
    posterPath: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80',
    backdropPath: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1920&auto=format&fit=crop&q=80',
    mediaType: 'movie',
    releaseDate: '2008-04-10',
    voteAverage: 7.9,
    voteCount: 3200,
    genres: ['Animation', 'Comedy', 'Short'],
    duration: 10,
  },
  {
    id: 'sample-2',
    tmdbId: 102,
    imdbId: 'tt2423320',
    title: 'Tears of Steel',
    overview: 'Set in a dystopian future Amsterdam, a group of scientists and soldiers attempt to rewrite history to prevent a technological catastrophe.',
    posterPath: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=80',
    backdropPath: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1920&auto=format&fit=crop&q=80',
    mediaType: 'movie',
    releaseDate: '2012-09-26',
    voteAverage: 8.2,
    voteCount: 1850,
    genres: ['Sci-Fi', 'Action', 'VFX'],
    duration: 12,
  },
  {
    id: 'sample-3',
    tmdbId: 103,
    imdbId: 'tt1727587',
    title: 'Sintel',
    overview: 'A lonely young woman searches for a baby dragon she befriended and nursed back to health after it is snatched by an adult dragon.',
    posterPath: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
    backdropPath: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1920&auto=format&fit=crop&q=80',
    mediaType: 'movie',
    releaseDate: '2010-09-27',
    voteAverage: 8.4,
    voteCount: 4200,
    genres: ['Animation', 'Fantasy', 'Adventure'],
    duration: 15,
  },
  {
    id: 'sample-4',
    tmdbId: 104,
    imdbId: 'tt10584350',
    title: 'Cyberpunk Chronicles',
    overview: 'In a neon-drenched metropolis governed by rogue corporate algorithms, a rogue bio-hacker uncovers an encrypted truth.',
    posterPath: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
    backdropPath: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1920&auto=format&fit=crop&q=80',
    mediaType: 'tv',
    firstAirDate: '2023-11-04',
    voteAverage: 8.8,
    voteCount: 5120,
    genres: ['Sci-Fi', 'Cyberpunk', 'Thriller'],
    seasons: [
      {
        seasonNumber: 1,
        name: 'Season 1',
        episodeCount: 8,
        episodes: [
          { id: 1041, episodeNumber: 1, seasonNumber: 1, name: 'Neon Genesis', overview: 'A routine data transfer uncovers a ghost signal.', stillPath: null, voteAverage: 8.9 },
          { id: 1042, episodeNumber: 2, seasonNumber: 1, name: 'Memory Leak', overview: 'Chasing the encrypted breadcrumbs deep into the grid.', stillPath: null, voteAverage: 8.6 },
        ],
      },
    ],
  },
  {
    id: 'sample-5',
    tmdbId: 105,
    imdbId: 'tt0816692', // Interstellar
    title: 'Interstellar Horizons',
    overview: 'An expedition beyond the known solar system pushes human resilience and astrophysics to the absolute edge.',
    posterPath: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
    backdropPath: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&auto=format&fit=crop&q=80',
    mediaType: 'movie',
    releaseDate: '2024-01-18',
    voteAverage: 9.1,
    voteCount: 7800,
    genres: ['Sci-Fi', 'Drama', 'Space'],
    duration: 148,
  },
  {
    id: 'sample-6',
    tmdbId: 106,
    imdbId: 'tt2575988', // Silicon Valley
    title: 'Silicon Valley Heist',
    overview: 'A syndicate of rogue network engineers orchestrate the largest decentralized financial heist in human history.',
    posterPath: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80',
    backdropPath: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1920&auto=format&fit=crop&q=80',
    mediaType: 'tv',
    firstAirDate: '2024-03-01',
    voteAverage: 8.5,
    voteCount: 2300,
    genres: ['Crime', 'Drama', 'Tech'],
    seasons: [
      {
        seasonNumber: 1,
        name: 'Season 1',
        episodeCount: 6,
        episodes: [
          { id: 1061, episodeNumber: 1, seasonNumber: 1, name: 'Zero Day', overview: 'Infiltrating the core exchange node.', stillPath: null, voteAverage: 8.7 },
        ],
      },
    ],
  },
];

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMG_URL = 'https://image.tmdb.org/t/p';

export class TMDBService {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.TMDB_API_KEY || '';
  }

  public async getTrending(mediaType: 'movie' | 'tv' | 'all' = 'all', timeWindow: 'day' | 'week' = 'week'): Promise<MediaItem[]> {
    if (!this.apiKey) {
      return SAMPLE_MEDIA_CATALOG;
    }

    try {
      const res = await fetch(`${TMDB_BASE_URL}/trending/${mediaType}/${timeWindow}?api_key=${this.apiKey}`);
      if (!res.ok) throw new Error(`TMDB error: ${res.statusText}`);
      const data = await res.json();
      return this.transformTMDBList(data.results);
    } catch (e) {
      console.warn('[TMDBService] Failed to fetch trending, returning fallback catalog:', e);
      return SAMPLE_MEDIA_CATALOG;
    }
  }

  public async search(query: string): Promise<MediaItem[]> {
    if (!query.trim()) return [];

    if (!this.apiKey) {
      const q = query.toLowerCase();
      return SAMPLE_MEDIA_CATALOG.filter(
        (m) => m.title.toLowerCase().includes(q) || m.overview.toLowerCase().includes(q) || m.genres.some((g) => g.toLowerCase().includes(q))
      );
    }

    try {
      const res = await fetch(`${TMDB_BASE_URL}/search/multi?api_key=${this.apiKey}&query=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error(`TMDB error: ${res.statusText}`);
      const data = await res.json();
      return this.transformTMDBList(data.results.filter((i: any) => i.media_type === 'movie' || i.media_type === 'tv'));
    } catch (e) {
      console.warn('[TMDBService] Search error:', e);
      return [];
    }
  }

  public async getDetails(id: string | number, mediaType: 'movie' | 'tv' = 'movie'): Promise<MediaItem | null> {
    // Check fallback catalog first
    const found = SAMPLE_MEDIA_CATALOG.find((m) => String(m.id) === String(id) || String(m.tmdbId) === String(id));
    if (found) return found;

    if (!this.apiKey) return null;

    try {
      const res = await fetch(`${TMDB_BASE_URL}/${mediaType}/${id}?api_key=${this.apiKey}&append_to_response=videos,credits,external_ids`);
      if (!res.ok) return null;
      const data = await res.json();

      let trailerUrl = '';
      if (data.videos?.results?.length) {
        const trailer = data.videos.results.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube') || data.videos.results[0];
        if (trailer) trailerUrl = `https://www.youtube.com/watch?v=${trailer.key}`;
      }

      const imdbId = data.external_ids?.imdb_id || data.imdb_id;

      return {
        id: data.id,
        tmdbId: data.id,
        imdbId: imdbId || undefined,
        title: data.title || data.name,
        originalTitle: data.original_title || data.original_name,
        overview: data.overview || '',
        posterPath: data.poster_path ? `${TMDB_IMG_URL}/w780${data.poster_path}` : null,
        backdropPath: data.backdrop_path ? `${TMDB_IMG_URL}/original${data.backdrop_path}` : null,
        mediaType,
        releaseDate: data.release_date,
        firstAirDate: data.first_air_date,
        voteAverage: data.vote_average || 0,
        voteCount: data.vote_count || 0,
        genres: (data.genres || []).map((g: any) => g.name),
        duration: data.runtime || (data.episode_run_time ? data.episode_run_time[0] : undefined),
        trailerUrl,
      };
    } catch (e) {
      console.warn('[TMDBService] Details error:', e);
      return null;
    }
  }

  private transformTMDBList(results: any[]): MediaItem[] {
    return results.map((item) => ({
      id: item.id,
      tmdbId: item.id,
      title: item.title || item.name,
      originalTitle: item.original_title || item.original_name,
      overview: item.overview || '',
      posterPath: item.poster_path ? `${TMDB_IMG_URL}/w500${item.poster_path}` : null,
      backdropPath: item.backdrop_path ? `${TMDB_IMG_URL}/w1280${item.backdrop_path}` : null,
      mediaType: item.media_type === 'tv' || item.first_air_date ? 'tv' : 'movie',
      releaseDate: item.release_date,
      firstAirDate: item.first_air_date,
      voteAverage: Number((item.vote_average || 0).toFixed(1)),
      voteCount: item.vote_count || 0,
      genres: [],
    }));
  }
}

export const tmdbService = new TMDBService();
