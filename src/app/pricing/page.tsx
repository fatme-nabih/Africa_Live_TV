'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Show } from '@clerk/nextjs';
import { Check, Gift, ArrowRight } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import BrandWatermark from '@/components/BrandWatermark';
import { checkoutRequestSchema, checkoutResponseSchema } from '@/lib/payment-contracts';

const features = [
  'Lancement des sources compatibles depuis le lecteur web ou VLC',
  'Recherche, filtres, catégories et favoris synchronisés',
  'Accès aux fonctions de l’application pendant la période souscrite',
  'Compte utilisateur sécurisé et sans publicité injectée',
];

export default function PricingPage() {
  const [loading, setLoading] = useState<'lumina_all_access_monthly' | 'lumina_all_access_annual' | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const attemptKeys = useRef(new Map<string, string>());

  const handleSubscribe = async (planCode: 'lumina_all_access_monthly' | 'lumina_all_access_annual') => {
    try {
      setLoading(planCode);
      setMessage(null);
      const idempotencyKey = attemptKeys.current.get(planCode) ?? crypto.randomUUID();
      attemptKeys.current.set(planCode, idempotencyKey);
      const request = checkoutRequestSchema.safeParse({
        planCode, firstName, lastName, phone, idempotencyKey,
      });
      if (!request.success) {
        setMessage('Renseignez votre nom et un numéro au format international, par exemple +221771234567.');
        return;
      }
      const res = await fetch('/api/checkout/naboopay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request.data),
      });

      const rawData: unknown = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setMessage('Veuillez vous connecter pour vous abonner.');
          return;
        }
        setMessage('La tentative de paiement n’a pas pu être créée. Réessayez avec la même tentative.');
        return;
      }

      const data = checkoutResponseSchema.safeParse(rawData);
      if (!data.success) {
        setMessage('Réponse de paiement invalide. Aucune redirection n’a été effectuée.');
        return;
      }
      if (!data.data.checkout_url) {
        if (data.data.status === 'failed' || data.data.status === 'canceled') {
          attemptKeys.current.delete(planCode);
          setMessage('Cette tentative est terminée. Cliquez à nouveau pour créer une nouvelle tentative.');
        } else {
          setMessage('La création est en cours de vérification. N’effectuez pas un second paiement.');
        }
        return;
      }
      let parsed: URL;
      try {
        parsed = new URL(data.data.checkout_url);
      } catch {
        setMessage('URL de paiement invalide.');
        return;
      }
      if (parsed.protocol !== 'https:' || !(parsed.hostname === 'checkout.naboopay.com' || parsed.hostname.endsWith('.naboopay.com'))) {
        setMessage('Destination de paiement non autorisée.');
        return;
      }
      const safeCheckoutUrl = `https://${encodeURIComponent(parsed.hostname)}${parsed.pathname}${parsed.search}`;
      const link = document.createElement('a');
      link.setAttribute('href', safeCheckoutUrl);
      link.setAttribute('rel', 'noopener noreferrer');
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      setMessage('Connexion interrompue. Réessayez : la même clé de tentative sera conservée.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <main className="relative min-h-screen bg-black px-5 py-10 text-zinc-100 overflow-hidden">
      <BrandWatermark />

      <div className="relative z-10 mx-auto max-w-5xl">
        {/* Navigation Bar */}
        <nav className="mb-10 flex items-center justify-between border-b border-white/[0.08] pb-5">
          <Link href="/" className="group flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/10 border border-amber-400/25 p-1">
              <BrandLogo className="h-full w-full" />
            </div>
            <span className="text-base font-bold tracking-tight text-white group-hover:text-amber-300 transition">
              Africa Live
            </span>
          </Link>
          <Show when="signed-in">
            <Link
              href="/app"
              className="rounded-xl border border-amber-400/40 bg-gradient-to-r from-emerald-500/20 via-amber-400/25 to-rose-500/20 hover:from-emerald-500/30 hover:via-amber-400/35 hover:to-rose-500/30 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-amber-200 transition backdrop-blur-md shadow-sm"
            >
              Ouvrir l&apos;application
            </Link>
          </Show>
        </nav>

        <section className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          {/* Left Column: Presentation */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span>Offre unique panafricaine</span>
            </div>
            <h1 className="mt-4 text-3xl font-black leading-tight text-white sm:text-5xl">
              Un seul accès pour toute l&apos;application.
            </h1>
            <p className="mt-4 max-w-xl text-sm sm:text-base leading-relaxed text-zinc-300">
              L&apos;abonnement donne accès aux fonctions d&apos;Africa Live, y compris au lancement des sources disponibles et compatibles. Payez via Orange Money, Wave ou carte bancaire.
            </p>

            <ul className="mt-6 space-y-3">
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-xs sm:text-sm text-zinc-300">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <Check className="h-3 w-3" />
                  </div>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 rounded-2xl border border-amber-400/30 bg-black/40 backdrop-blur-xl p-5 text-xs text-amber-200 shadow-lg shadow-black/40">
              <p className="font-bold flex items-center gap-2 text-sm text-amber-300">
                <Gift size={16} className="text-amber-400 shrink-0" /> Profitez de 5 jours d’essai sans engagement !
              </p>
              <p className="mt-2 leading-relaxed text-zinc-300">
                Nouveau sur Africa Live ? Votre compte inclut automatiquement 5 jours d&apos;essai avec accès à l&apos;application et à la lecture. Après l&apos;essai, le catalogue reste consultable avec un compte, mais lancer une source requiert un abonnement.
              </p>
            </div>
          </div>

          {/* Right Column: Checkout Info & Plans */}
          <div className="flex flex-col gap-6">
            {/* User details form */}
            <div className="grid gap-4 rounded-2xl border border-white/[0.08] bg-black/40 backdrop-blur-xl p-6 sm:grid-cols-2 shadow-xl shadow-black/40">
              <label className="text-xs font-medium text-zinc-300">
                Prénom
                <input
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  autoComplete="given-name"
                  maxLength={50}
                  placeholder="Ex: Fatou"
                  className="mt-1.5 w-full rounded-xl border border-white/[0.1] bg-white/[0.03] px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 transition"
                />
              </label>
              <label className="text-xs font-medium text-zinc-300">
                Nom
                <input
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  autoComplete="family-name"
                  maxLength={50}
                  placeholder="Ex: Diop"
                  className="mt-1.5 w-full rounded-xl border border-white/[0.1] bg-white/[0.03] px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 transition"
                />
              </label>
              <label className="text-xs font-medium text-zinc-300 sm:col-span-2">
                Téléphone au format international (Wave / Orange Money)
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value.trim())}
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="+221771234567"
                  maxLength={16}
                  className="mt-1.5 w-full rounded-xl border border-white/[0.1] bg-white/[0.03] px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 transition"
                />
              </label>
              {message && (
                <div role="alert" className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-200 sm:col-span-2">
                  {message}
                </div>
              )}
            </div>

            {/* Mensuel */}
            <div className="rounded-2xl border border-white/[0.08] bg-black/40 backdrop-blur-xl p-6 shadow-xl shadow-black/40 transition hover:border-white/20 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white">Abonnement Mensuel</h3>
                  <span className="rounded-full bg-white/[0.04] border border-white/[0.08] px-2.5 py-0.5 text-[11px] font-medium text-zinc-400">
                    Sans engagement
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-zinc-400">Accès aux fonctions de l’application et à la lecture des sources compatibles pendant 30 jours.</p>
                <div className="mt-4 flex items-baseline gap-1.5 text-3xl font-black text-white">
                  990 <span className="text-base font-bold text-amber-400">FCFA</span>
                  <span className="text-xs font-normal text-zinc-500">/ mois</span>
                </div>
              </div>

              <button
                onClick={() => handleSubscribe('lumina_all_access_monthly')}
                disabled={loading !== null}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] hover:bg-white/[0.1] hover:border-white/25 py-2.5 text-xs sm:text-sm font-semibold text-white transition backdrop-blur-md active:scale-[0.99] disabled:opacity-50"
              >
                <span>{loading === 'lumina_all_access_monthly' ? 'Génération du lien...' : 'Payer avec NabooPay (990 FCFA)'}</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {/* Annuel */}
            <div className="relative rounded-2xl border border-amber-400/40 bg-black/50 backdrop-blur-2xl p-6 shadow-2xl shadow-black/50 transition hover:border-amber-400/60 flex flex-col justify-between">
              <div className="absolute top-0 right-4 -translate-y-1/2 rounded-full border border-amber-400/40 bg-gradient-to-r from-emerald-500/40 via-amber-400/50 to-rose-500/40 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-100 shadow-md backdrop-blur-md">
                ★ 2 Mois Offerts • Plus Économique
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white">Abonnement Annuel</h3>
                  <span className="rounded-full bg-amber-400/10 border border-amber-400/30 px-2.5 py-0.5 text-[11px] font-bold text-amber-300">
                    Application annuelle
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-zinc-300">12 mois d&apos;accès aux fonctions de l’application et à la lecture des sources compatibles, au prix de 10 mois.</p>
                <div className="mt-4 flex items-baseline gap-1.5 text-3xl font-black text-white">
                  9 900 <span className="text-base font-bold text-amber-400">FCFA</span>
                  <span className="text-xs font-normal text-zinc-400">/ an</span>
                </div>
              </div>

              <button
                onClick={() => handleSubscribe('lumina_all_access_annual')}
                disabled={loading !== null}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-400/40 bg-gradient-to-r from-emerald-500/25 via-amber-400/30 to-rose-500/25 hover:from-emerald-500/35 hover:via-amber-400/40 hover:to-rose-500/35 py-2.5 text-xs sm:text-sm font-bold text-amber-100 shadow-lg shadow-black/40 backdrop-blur-md transition active:scale-[0.99] disabled:opacity-50"
              >
                <span>{loading === 'lumina_all_access_annual' ? 'Génération du lien...' : 'Payer avec NabooPay (9 900 FCFA)'}</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
