import { fr } from '@/i18n/fr';
import { HelpCircle, Home, Tv } from 'lucide-react';
import OffAirScreen from '@/components/brand/OffAirScreen';
import { ButtonLink } from '@/components/ui';

export default async function NotFound() {
  const t = fr;
  return (
    <OffAirScreen
      code="404"
      title={t.errors.copy["Page hors antenne"]}
      description={t.errors.copy["Le programme, la chaîne ou l’adresse demandée n’existe pas ou a été déplacé. Vérifiez l’adresse ou reprenez le fil du direct : le live revient à vous."]}
      actions={(
        <>
          <ButtonLink href="/app/live" variant="primary" icon={<Tv size={16} aria-hidden="true" />}>
            {t.errors.copy["Ouvrir le dashboard"]}</ButtonLink>
          <ButtonLink href="/" variant="secondary" icon={<Home size={16} aria-hidden="true" />}>
            {t.errors.copy["Accueil"]}</ButtonLink>
          <ButtonLink href="/contact" variant="ghost" icon={<HelpCircle size={16} aria-hidden="true" />}>
            {t.errors.copy["Besoin d’aide ?"]}</ButtonLink>
        </>
      )}
    />
  );
}
