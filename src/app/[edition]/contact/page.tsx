import type { Metadata } from 'next';
import { getEdition } from '@/i18n/edition';
import { I18nProvider } from '@/i18n/client';
import { clientMessages } from '@/i18n/server';
import { publicPageMetadata } from '@/i18n/metadata';
import ContactForm from './ContactForm';

export async function generateMetadata(): Promise<Metadata> {
  return publicPageMetadata(await getEdition(), '/contact');
}

/** Page publique statique par édition : seul le formulaire est un composant client, avec les textes `contact` de l'édition. */
export default async function ContactPage() {
  const edition = await getEdition();
  return (
    <I18nProvider messages={clientMessages(edition, ['contact'])}>
      <ContactForm />
    </I18nProvider>
  );
}
