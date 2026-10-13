'use client';
import { useI18n } from '@/i18n/client';

import { Home, RotateCcw } from 'lucide-react';
import OffAirScreen from '@/components/brand/OffAirScreen';
import { Button, ButtonLink } from '@/components/ui';

/** Erreur inattendue d'une page publique : ton « hors antenne », jamais de message technique. */
export default function RootError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const { t } = useI18n();
  return (
    <OffAirScreen
      alert
      illustration="acacia"
      title={t.errors.copy["Signal interrompu"]}
      description={t.errors.copy["Cette page n’a pas pu s’afficher. Ce n’est pas de votre fait : réessayez dans un instant, le live revient à vous."]}
      actions={(
        <>
          <Button variant="primary" onClick={() => retry()} icon={<RotateCcw size={16} aria-hidden="true" />}>{t.errors.copy["Réessayer"]}</Button>
          <ButtonLink href="/" variant="secondary" icon={<Home size={16} aria-hidden="true" />}>{t.errors.copy["Accueil"]}</ButtonLink>
        </>
      )}
    />
  );
}
