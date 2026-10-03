import { HelpCircle, Home, Tv } from 'lucide-react';
import OffAirScreen from '@/components/brand/OffAirScreen';
import { ButtonLink } from '@/components/ui';

export default function NotFound() {
  return (
    <OffAirScreen
      code="404"
      title="Page hors antenne"
      description="Le programme, la chaîne ou l’adresse demandée n’existe pas ou a été déplacé. Vérifiez l’adresse ou reprenez le fil du direct : le live revient à vous."
      actions={(
        <>
          <ButtonLink href="/app/live" variant="primary" icon={<Tv size={16} aria-hidden="true" />}>
            Ouvrir le dashboard
          </ButtonLink>
          <ButtonLink href="/" variant="secondary" icon={<Home size={16} aria-hidden="true" />}>
            Accueil
          </ButtonLink>
          <ButtonLink href="/contact" variant="ghost" icon={<HelpCircle size={16} aria-hidden="true" />}>
            Besoin d’aide ?
          </ButtonLink>
        </>
      )}
    />
  );
}
