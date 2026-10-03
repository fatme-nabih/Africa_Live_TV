'use client';

import { Home, RotateCcw } from 'lucide-react';
import OffAirScreen from '@/components/brand/OffAirScreen';
import { Button, ButtonLink } from '@/components/ui';

/** Erreur inattendue d'une page publique : ton « hors antenne », jamais de message technique. */
export default function RootError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <OffAirScreen
      alert
      illustration="acacia"
      title="Signal interrompu"
      description="Cette page n’a pas pu s’afficher. Ce n’est pas de votre fait : réessayez dans un instant, le live revient à vous."
      actions={(
        <>
          <Button variant="primary" onClick={() => retry()} icon={<RotateCcw size={16} aria-hidden="true" />}>Réessayer</Button>
          <ButtonLink href="/" variant="secondary" icon={<Home size={16} aria-hidden="true" />}>Accueil</ButtonLink>
        </>
      )}
    />
  );
}
