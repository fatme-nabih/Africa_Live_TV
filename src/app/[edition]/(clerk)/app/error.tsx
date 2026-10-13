'use client';
import { useI18n } from '@/i18n/client';

import { Radar, RotateCcw } from 'lucide-react';
import OffAirScreen from '@/components/brand/OffAirScreen';
import { Button, ButtonLink } from '@/components/ui';

/** Erreur dans le Radar ou la TV : la coquille (barres haute et basse) reste en place pour repartir ailleurs. */
export default function AppError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const { t } = useI18n();
  return (
    <OffAirScreen
      inset
      alert
      illustration="lion"
      title={t.errors.copy["Signal interrompu"]}
      description={t.errors.copy["Cet écran n’a pas pu s’afficher. Réessayez, ou repartez du Radar en attendant le retour du signal."]}
      actions={(
        <>
          <Button variant="primary" onClick={() => retry()} icon={<RotateCcw size={16} aria-hidden="true" />}>{t.errors.copy["Réessayer"]}</Button>
          <ButtonLink href="/app/live" variant="secondary" icon={<Radar size={16} aria-hidden="true" />}>{t.errors.copy["Ouvrir le Radar"]}</ButtonLink>
        </>
      )}
    />
  );
}
