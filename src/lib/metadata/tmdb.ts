import { MediaItem } from '@/types';
import { cinemetaService } from './cinemeta';

// Curated high quality seed media for instant out-of-the-box browsing & playback testing
export const FEATURED_HERO: MediaItem = {
  id: 'featured-1',
  tmdbId: 693134,
  imdbId: 'tt15239678', // Dune: Part Two
  title: 'Dune: Part Two',
  overview: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family. Facing a choice between the love of his life and the fate of the universe, he endeavors to prevent a terrible future.',
  posterPath: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
  backdropPath: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1920&auto=format&fit=crop&q=80',
  mediaType: 'movie',
  releaseDate: '2024-03-01',
  voteAverage: 8.8,
  voteCount: 9400,
  genres: ['Sci-Fi', 'Adventure', 'Action', 'Drama'],
  duration: 166,
  trailerUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
};

export const SAMPLE_MEDIA_CATALOG: MediaItem[] = [
  // Blockbuster & Sci-Fi Movies
  {
    id: 'movie-1',
    tmdbId: 693134,
    imdbId: 'tt15239678',
    title: 'Dune: Part Two',
    overview: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.',
    posterPath: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
    backdropPath: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1920&auto=format&fit=crop&q=80',
    mediaType: 'movie',
    releaseDate: '2024-03-01',
    voteAverage: 8.8,
    voteCount: 9400,
    genres: ['Sci-Fi', 'Adventure', 'Action'],
    duration: 166,
  },
  {
    id: 'movie-2',
    tmdbId: 872585,
    imdbId: 'tt15398776',
    title: 'Oppenheimer',
    overview: 'The story of J. Robert Oppenheimer’s role in the development of the atomic bomb during World War II.',
    posterPath: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80',
    backdropPath: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1920&auto=format&fit=crop&q=80',
    mediaType: 'movie',
    releaseDate: '2023-07-21',
    voteAverage: 8.9,
    voteCount: 12500,
    genres: ['Drama', 'History', 'Biography'],
    duration: 180,
  },
  {
    id: 'movie-3',
    tmdbId: 157336,
    imdbId: 'tt0816692',
    title: 'Interstellar',
    overview: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity’s survival.',
    posterPath: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
    backdropPath: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&auto=format&fit=crop&q=80',
    mediaType: 'movie',
    releaseDate: '2014-11-05',
    voteAverage: 9.1,
    voteCount: 34000,
    genres: ['Sci-Fi', 'Drama', 'Adventure'],
    duration: 169,
  },
  {
    id: 'movie-4',
    tmdbId: 335984,
    imdbId: 'tt1856101',
    title: 'Blade Runner 2049',
    overview: 'Young Blade Runner K’s discovery of a long-buried secret leads him to track down former Blade Runner Rick Deckard.',
    posterPath: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
    backdropPath: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1920&auto=format&fit=crop&q=80',
    mediaType: 'movie',
    releaseDate: '2017-10-06',
    voteAverage: 8.7,
    voteCount: 15800,
    genres: ['Sci-Fi', 'Cyberpunk', 'Mystery'],
    duration: 164,
  },
  {
    id: 'movie-5',
    tmdbId: 27205,
    imdbId: 'tt1375666',
    title: 'Inception',
    overview: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea.',
    posterPath: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
    backdropPath: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1920&auto=format&fit=crop&q=80',
    mediaType: 'movie',
    releaseDate: '2010-07-16',
    voteAverage: 8.8,
    voteCount: 36000,
    genres: ['Sci-Fi', 'Action', 'Thriller'],
    duration: 148,
  },
  {
    id: 'movie-6',
    tmdbId: 603,
    imdbId: 'tt0133093',
    title: 'The Matrix',
    overview: 'A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.',
    posterPath: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80',
    backdropPath: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1920&auto=format&fit=crop&q=80',
    mediaType: 'movie',
    releaseDate: '1999-03-31',
    voteAverage: 8.7,
    voteCount: 25000,
    genres: ['Sci-Fi', 'Action', 'Cyberpunk'],
    duration: 136,
  },

  // Open Source & Creative Commons Originals
  {
    id: 'sample-cosmos',
    tmdbId: 823464,
    imdbId: 'tt4843632',
    title: 'Cosmos Laundromat',
    overview: 'On a desolate island, a suicidal sheep named Franck meets a quirky salesman who offers him the gift of a lifetime.',
    posterPath: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
    backdropPath: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1920&auto=format&fit=crop&q=80',
    mediaType: 'movie',
    releaseDate: '2015-08-10',
    voteAverage: 8.7,
    voteCount: 1420,
    genres: ['Animation', 'Sci-Fi', 'Short'],
    duration: 12,
  },
  {
    id: 'sample-bbb',
    tmdbId: 101,
    imdbId: 'tt1254207',
    title: 'Big Buck Bunny',
    overview: 'A large and lovable rabbit deals with bullying forest creatures in this iconic open-source animated short film.',
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
    id: 'sample-tos',
    tmdbId: 102,
    imdbId: 'tt2423320',
    title: 'Tears of Steel',
    overview: 'Set in a dystopian future Amsterdam, a group of scientists and soldiers attempt to rewrite history.',
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
    id: 'sample-sintel',
    tmdbId: 103,
    imdbId: 'tt1727587',
    title: 'Sintel',
    overview: 'A lonely young woman searches for a baby dragon she befriended and nursed back to health.',
    posterPath: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
    backdropPath: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1920&auto=format&fit=crop&q=80',
    mediaType: 'movie',
    releaseDate: '2010-09-27',
    voteAverage: 8.4,
    voteCount: 4200,
    genres: ['Animation', 'Fantasy', 'Adventure'],
    duration: 15,
  },

  // TV Series
  {
    id: 'tv-1',
    tmdbId: 1396,
    imdbId: 'tt0903747',
    title: 'Breaking Bad',
    overview: 'A chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine with a former student.',
    posterPath: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80',
    backdropPath: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1920&auto=format&fit=crop&q=80',
    mediaType: 'tv',
    firstAirDate: '2008-01-20',
    voteAverage: 9.5,
    voteCount: 22000,
    genres: ['Drama', 'Crime', 'Thriller'],
    seasons: [
      {
        seasonNumber: 1,
        name: 'Season 1',
        episodeCount: 7,
        episodes: [
          { id: 101, episodeNumber: 1, seasonNumber: 1, name: 'Pilot', overview: 'Walter White learns he has terminal cancer and teams up with Jesse Pinkman.', stillPath: null, voteAverage: 9.1 },
          { id: 102, episodeNumber: 2, seasonNumber: 1, name: 'Cat\'s in the Bag...', overview: 'Walt and Jesse attempt to dispose of two bodies in an unorthodox manner.', stillPath: null, voteAverage: 8.8 },
          { id: 103, episodeNumber: 3, seasonNumber: 1, name: '...And the Bag\'s in the River', overview: 'Walt wrestles with a fateful moral dilemma in Jesse\'s basement.', stillPath: null, voteAverage: 8.9 },
        ],
      },
    ],
  },
  {
    id: 'tv-2',
    tmdbId: 66732,
    imdbId: 'tt4574334',
    title: 'Stranger Things',
    overview: 'When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces, and one strange little girl.',
    posterPath: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80',
    backdropPath: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1920&auto=format&fit=crop&q=80',
    mediaType: 'tv',
    firstAirDate: '2016-07-15',
    voteAverage: 8.9,
    voteCount: 18000,
    genres: ['Sci-Fi', 'Mystery', 'Drama'],
    seasons: [
      {
        seasonNumber: 1,
        name: 'Season 1',
        episodeCount: 8,
        episodes: [
          { id: 201, episodeNumber: 1, seasonNumber: 1, name: 'The Vanishing of Will Byers', overview: 'A boy goes missing near a top secret lab.', stillPath: null, voteAverage: 8.7 },
          { id: 202, episodeNumber: 2, seasonNumber: 1, name: 'The Weirdo on Maple Street', overview: 'The boys shelter a girl with supernatural telekinesis.', stillPath: null, voteAverage: 8.9 },
        ],
      },
    ],
  },
  {
    id: 'tv-3',
    tmdbId: 100088,
    imdbId: 'tt3581920',
    title: 'The Last of Us',
    overview: 'Twenty years after a fungal pandemic ravages the planet, a hardened survivor takes charge of a 14-year-old girl who may be humanity\'s last hope.',
    posterPath: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=80',
    backdropPath: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1920&auto=format&fit=crop&q=80',
    mediaType: 'tv',
    firstAirDate: '2023-01-15',
    voteAverage: 9.0,
    voteCount: 14000,
    genres: ['Drama', 'Sci-Fi', 'Action'],
    seasons: [
      {
        seasonNumber: 1,
        name: 'Season 1',
        episodeCount: 9,
        episodes: [
          { id: 301, episodeNumber: 1, seasonNumber: 1, name: 'When You\'re Lost in the Darkness', overview: 'Twenty years after a fungal outbreak destroys society, Joel takes on a smuggling mission.', stillPath: null, voteAverage: 9.3 },
          { id: 302, episodeNumber: 2, seasonNumber: 1, name: 'Infected', overview: 'Joel, Tess, and Ellie navigate through a flooded and infected downtown Boston.', stillPath: null, voteAverage: 9.2 },
        ],
      },
    ],
  },
  {
    id: 'tv-4',
    tmdbId: 87108,
    imdbId: 'tt8712704',
    title: 'Chernobyl',
    overview: 'In April 1986, an explosion at the Chernobyl nuclear power plant in the USSR becomes one of the world\'s worst man-made catastrophes.',
    posterPath: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
    backdropPath: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1920&auto=format&fit=crop&q=80',
    mediaType: 'tv',
    firstAirDate: '2019-05-06',
    voteAverage: 9.4,
    voteCount: 16000,
    genres: ['Drama', 'History', 'Thriller'],
    seasons: [
      {
        seasonNumber: 1,
        name: 'Miniseries',
        episodeCount: 5,
        episodes: [
          { id: 401, episodeNumber: 1, seasonNumber: 1, name: '1:23:45', overview: 'Plant workers and firefighters desperately attempt to control the catastrophic core explosion.', stillPath: null, voteAverage: 9.5 },
          { id: 402, episodeNumber: 2, seasonNumber: 1, name: 'Please Remain Calm', overview: 'With millions at risk, nuclear physicist Ulana Khomyuk warns of a second imminent explosion.', stillPath: null, voteAverage: 9.6 },
        ],
      },
    ],
  },
  {
    id: 'tv-5',
    tmdbId: 60574,
    imdbId: 'tt2575988',
    title: 'Silicon Valley',
    overview: 'Follows the struggle of Richard Hendricks, a Silicon Valley engineer trying to build his compression algorithm company Pied Piper.',
    posterPath: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80',
    backdropPath: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1920&auto=format&fit=crop&q=80',
    mediaType: 'tv',
    firstAirDate: '2014-04-06',
    voteAverage: 8.6,
    voteCount: 7800,
    genres: ['Comedy', 'Tech'],
    seasons: [
      {
        seasonNumber: 1,
        name: 'Season 1',
        episodeCount: 8,
        episodes: [
          { id: 501, episodeNumber: 1, seasonNumber: 1, name: 'Minimum Viable Product', overview: 'Richard develops a revolutionary compression algorithm.', stillPath: null, voteAverage: 8.8 },
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
      return cinemetaService.search(query);
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
    const found = SAMPLE_MEDIA_CATALOG.find((m) => String(m.id) === String(id) || String(m.tmdbId) === String(id));
    if (found) return found;

    // IMDb ids come from the keyless Cinemeta catalog.
    if (/^tt\d+$/.test(String(id))) {
      return cinemetaService.getMeta(String(id), mediaType);
    }

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
