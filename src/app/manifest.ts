import type { MetadataRoute } from 'next';

// Manifeste unique de l'application (Next.js le publie sur /manifest.webmanifest).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Africa Live — Le live qui vient à vous',
    short_name: 'Africa Live',
    description: 'L’Afrique en direct : chaînes TV, dépêches, carte et météo.',
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
