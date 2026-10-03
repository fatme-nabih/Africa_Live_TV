import type { MetadataRoute } from 'next';

// Manifeste unique de l'application (Next.js le publie sur /manifest.webmanifest).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Africa Live — Le live qui vient à vous',
    short_name: 'Africa Live',
    description: 'L’Afrique en direct : chaînes TV, dépêches, carte et météo.',
    lang: 'fr',
    id: '/app/live',
    start_url: '/app/live',
    scope: '/',
    categories: ['news', 'entertainment'],
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#000000',
    icons: [
      { src: '/africa-live-icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/africa-live-icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    // Raccourcis de l'icône installée (appui long) : les deux portes d'entrée de l'application.
    shortcuts: [
      { name: 'Radar Afrique', short_name: 'Radar', description: 'Dépêches, carte et météo par pays', url: '/app/live',
        icons: [{ src: '/africa-live-icon-192.png', sizes: '192x192', type: 'image/png' }] },
      { name: 'TV en direct', short_name: 'TV', description: 'Chaînes en direct, Reprendre et zapping', url: '/app',
        icons: [{ src: '/africa-live-icon-192.png', sizes: '192x192', type: 'image/png' }] },
    ],
  };
}
