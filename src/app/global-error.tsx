'use client';

import { RotateCcw } from 'lucide-react';
import OffAirScreen from '@/components/brand/OffAirScreen';
import { Button } from '@/components/ui';
import './globals.css';

/** Dernier recours (erreur dans la mise en page racine) : document autonome, même ton « hors antenne ». */
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="fr">
      <body>
        <title>Africa Live — Signal interrompu</title>
        <OffAirScreen
          alert
          illustration="acacia"
          title="Signal interrompu"
          description="Africa Live n’a pas pu s’afficher. Réessayez dans un instant : le live revient à vous."
          actions={<Button variant="primary" onClick={() => retry()} icon={<RotateCcw size={16} aria-hidden="true" />}>Réessayer</Button>}
        />
      </body>
    </html>
  );
}
