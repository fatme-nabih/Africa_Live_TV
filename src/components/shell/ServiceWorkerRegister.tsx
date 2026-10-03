'use client';

import { useEffect } from 'react';

/** Enregistre le service worker hors-ligne (UX-504), en production seulement : le développement reste sans cache. */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      // Navigateur ou contexte non sécurisé : l'application fonctionne sans écran hors-ligne.
    });
  }, []);
  return null;
}
