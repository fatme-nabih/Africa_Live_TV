import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Africa Live',
    short_name: 'Africa Live',
    description: 'Radar panafricain et chaînes TV en direct.',
    lang: 'fr',
    start_url: '/app/live',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#000000',
    icons: [
      { src: '/africa-live-icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/africa-live-icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
