import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Screentime',
    short_name: 'Screentime',
    description: 'Movies, series, anime, and live TV streamed on demand.',
    start_url: '/',
    display: 'standalone',
    background_color: '#08080b',
    theme_color: '#08080b',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
