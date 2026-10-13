import type { Metadata } from 'next';
import { getEdition } from '@/i18n/edition';
import { publicPageMetadata } from '@/i18n/metadata';
import PricingClient from './PricingClient';

export async function generateMetadata(): Promise<Metadata> {
  return publicPageMetadata(await getEdition(), '/pricing');
}

/** Page publique des tarifs : métadonnées par édition côté serveur, formulaire de paiement inchangé côté client. */
export default function PricingPage() {
  return <PricingClient />;
}
