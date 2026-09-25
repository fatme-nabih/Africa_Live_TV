'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Show } from '@clerk/nextjs';
import { Check } from 'lucide-react';

const features = [
  'Accès complet au catalogue Africa Live',
  'Lecteur navigateur avec secours VLC',
  'Filtres, recherche et favoris',
  'Compte utilisateur protégé',
];

export default function PricingPage() {
  const [loading, setLoading] = useState<'lumina_all_access_monthly' | 'lumina_all_access_annual' | null>(null);

  const handleSubscribe = async (planCode: 'lumina_all_access_monthly' | 'lumina_all_access_annual') => {
    try {
      setLoading(planCode);
      const res = await fetch('/api/checkout/naboopay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planCode }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          alert('Veuillez vous connecter pour vous abonner.');
          return;
        }
        throw new Error(data.error || 'Erreur lors de la création de la transaction');
      }

      // Redirection vers NabooPay Checkout
      window.location.href = data.checkout_url;
    } catch (error) {
      console.error('Erreur checkout:', error);
      alert('Une erreur est survenue lors de la création de votre transaction. Veuillez réessayer.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <main className="min-h-screen bg-black px-5 py-10 text-zinc-100">
      <div className="mx-auto max-w-5xl">
        <nav className="mb-10 flex items-center justify-between">
          <Link href="/" className="text-sm font-bold text-zinc-300 transition hover:text-yellow-200">
            Africa Live
          </Link>
          <Show when="signed-in">
            <Link
              href="/app"
              className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-black text-black transition hover:bg-yellow-300"
            >
              Ouvrir l'app
            </Link>
          </Show>
        </nav>

        <section className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-300">Offre unique</p>
            <h1 className="mt-4 text-4xl font-black leading-tight text-white sm:text-5xl">
              Un seul accès pour toute l'app.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-zinc-400">
              Profitez d'Africa Live TV sans limites. Payez facilement, rapidement et en toute sécurité via Orange Money, Wave, ou par carte bancaire.
            </p>

            <ul className="mt-7 space-y-3">
              {features.map((feature) => (
                <li key={feature} className="flex gap-3 text-sm text-zinc-300">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-yellow-300" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-6">
            {/* Mensuel */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-6 shadow-2xl transition hover:border-zinc-700 flex flex-col">
              <h3 className="text-xl font-bold text-white">Abonnement Mensuel</h3>
              <p className="mt-2 text-sm text-zinc-400 flex-1">Accès complet pendant 30 jours. Sans engagement.</p>
              <div className="mt-4 flex items-baseline text-4xl font-black text-white">
                990 <span className="ml-1 text-lg font-medium text-zinc-500">FCFA</span>
              </div>
              <button
                onClick={() => handleSubscribe('lumina_all_access_monthly')}
                disabled={loading !== null}
                className="mt-6 w-full rounded-lg bg-zinc-800 py-3 text-sm font-bold text-white transition hover:bg-zinc-700 disabled:opacity-50"
              >
                {loading === 'lumina_all_access_monthly' ? 'Génération du lien...' : 'Payer avec NabooPay'}
              </button>
            </div>

            {/* Annuel */}
            <div className="rounded-lg border-2 border-yellow-400 bg-zinc-900 p-6 shadow-2xl relative flex flex-col">
              <div className="absolute top-0 right-4 -translate-y-1/2 rounded-full bg-yellow-400 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-black">
                Le plus économique
              </div>
              <h3 className="text-xl font-bold text-white">Abonnement Annuel</h3>
              <p className="mt-2 text-sm text-zinc-400 flex-1">12 mois d'accès au prix de 10 mois. La meilleure offre pour en profiter toute l'année.</p>
              <div className="mt-4 flex items-baseline text-4xl font-black text-white">
                9 900 <span className="ml-1 text-lg font-medium text-zinc-500">FCFA</span>
              </div>
              <button
                onClick={() => handleSubscribe('lumina_all_access_annual')}
                disabled={loading !== null}
                className="mt-6 w-full rounded-lg bg-yellow-400 py-3 text-sm font-black text-black transition hover:bg-yellow-300 disabled:opacity-50 shadow-[0_0_20px_rgba(250,204,21,0.2)]"
              >
                {loading === 'lumina_all_access_annual' ? 'Génération du lien...' : 'Payer avec NabooPay'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
