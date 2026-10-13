import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import UiKit from './UiKit';

export const metadata: Metadata = {
  title: 'Africa Live — Kit de design',
  robots: { index: false, follow: false },
};

// Page de revue du système de design : réservée au développement.
export default function UiKitPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <UiKit />;
}
