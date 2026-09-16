import Link from 'next/link';
import { PricingTable, Show } from '@clerk/nextjs';
import { Check } from 'lucide-react';

const features = [
  'Acces complet au catalogue Africa Live',
  'Lecteur navigateur avec secours VLC',
  'Filtres, recherche et favoris',
  'Compte utilisateur protege',
];

export default function PricingPage() {
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
              Ouvrir l app
            </Link>
          </Show>
        </nav>

        <section className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-300">Offre unique</p>
            <h1 className="mt-4 text-4xl font-black leading-tight text-white sm:text-5xl">
              Un seul acces pour toute l app.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-zinc-400">
              L abonnement B2C est géré par Clerk Billing. Cette instance utilise la passerelle
              de test Clerk : aucun paiement réel n est encaissé pendant la validation.
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

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 shadow-2xl shadow-yellow-950/10">
            <PricingTable
              for="user"
              newSubscriptionRedirectUrl="/account"
              appearance={{
                variables: {
                  colorPrimary: '#facc15',
                  colorBackground: '#09090b',
                  colorForeground: '#fafafa',
                  colorMutedForeground: '#a1a1aa',
                  borderRadius: '0.5rem',
                },
              }}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
