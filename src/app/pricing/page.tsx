'use client';

import { useRef, useState } from 'react';
import { Check, Gift, ArrowRight } from 'lucide-react';
import BrandBackdrop from '@/components/brand/BrandBackdrop';
import AppShell from '@/components/shell/AppShell';
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
    <AppShell mode="auto">
    <main className="relative flex-1 bg-black px-5 py-10 text-text overflow-hidden">
      <BrandBackdrop variant="hero" />

      <div className="relative z-10 mx-auto max-w-5xl">
        <section className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          {/* Left Column: Presentation */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-al-gold/30 bg-al-gold/10 px-3 py-1 text-xs font-semibold text-al-gold">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-al-green opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-al-green" />
              </span>
              <span>Offre unique panafricaine</span>
            </div>
            <h1 className="font-display mt-4 text-3xl font-bold leading-tight text-text sm:text-5xl">
              Un seul accès pour toute l&apos;application.
            </h1>
            <p className="mt-4 max-w-xl text-sm sm:text-base leading-relaxed text-text">
              L&apos;abonnement donne accès aux fonctions d&apos;Africa Live, y compris au lancement des sources disponibles et compatibles. Payez via Orange Money, Wave ou carte bancaire.
            </p>

            <ul className="mt-6 space-y-3">
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-xs sm:text-sm text-text">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-al-green/20 text-al-green border border-al-green/30">
                    <Check className="h-3 w-3" />
                  </div>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 rounded-2xl border border-al-gold/30 bg-black/40 p-5 text-xs text-text shadow-lg shadow-black/40">
              <p className="font-bold flex items-center gap-2 text-sm text-al-gold">
                <Gift size={16} className="text-al-gold shrink-0" /> Profitez de 5 jours d’essai sans engagement !
              </p>
              <p className="mt-2 leading-relaxed text-text">
                Nouveau sur Africa Live ? Votre compte inclut automatiquement 5 jours d&apos;essai avec accès à l&apos;application et à la lecture. Après l&apos;essai, le catalogue reste consultable avec un compte, mais lancer une source requiert un abonnement.
              </p>
            </div>
          </div>

          {/* Right Column: Checkout Info & Plans */}
          <div className="flex flex-col gap-6">
            {/* User details form */}
            <div className="grid gap-4 rounded-2xl border border-line bg-surface-1/80 p-6 sm:grid-cols-2 shadow-xl shadow-black/40">
              <label className="text-xs font-medium text-text">
                Prénom
                <input
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  autoComplete="given-name"
                  maxLength={50}
                  placeholder="Ex: Fatou"
                  className="mt-1.5 w-full rounded-xl border border-line bg-white/[0.03] px-3.5 py-2 text-xs text-text placeholder:text-text-muted focus:border-al-gold focus:outline-none focus:ring-1 focus:ring-al-gold transition"
                />
              </label>
              <label className="text-xs font-medium text-text">
                Nom
                <input
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  autoComplete="family-name"
                  maxLength={50}
                  placeholder="Ex: Diop"
                  className="mt-1.5 w-full rounded-xl border border-line bg-white/[0.03] px-3.5 py-2 text-xs text-text placeholder:text-text-muted focus:border-al-gold focus:outline-none focus:ring-1 focus:ring-al-gold transition"
                />
              </label>
              <label className="text-xs font-medium text-text sm:col-span-2">
                Téléphone au format international (Wave / Orange Money)
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value.trim())}
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="+221771234567"
                  maxLength={16}
                  className="mt-1.5 w-full rounded-xl border border-line bg-white/[0.03] px-3.5 py-2 text-xs text-text placeholder:text-text-muted focus:border-al-gold focus:outline-none focus:ring-1 focus:ring-al-gold transition"
                />
              </label>
              {message && (
                <div role="alert" className="rounded-xl border border-al-gold/30 bg-al-gold/10 p-3 text-xs text-text sm:col-span-2">
                  {message}
                </div>
              )}
            </div>

            {/* Mensuel */}
            <div className="rounded-2xl border border-line bg-surface-1/80 p-6 shadow-xl shadow-black/40 transition hover:border-white/20 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg font-bold text-text">Abonnement Mensuel</h3>
                  <span className="rounded-full bg-white/[0.04] border border-line px-2.5 py-0.5 text-xs font-medium text-text-muted">
                    Sans engagement
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-text-muted">Accès aux fonctions de l’application et à la lecture des sources compatibles pendant 30 jours.</p>
                <div className="font-display mt-4 flex items-baseline gap-1.5 text-3xl font-bold text-text">
                  990 <span className="text-base font-bold text-al-gold">FCFA</span>
                  <span className="text-xs font-normal text-text-muted">/ mois</span>
                </div>
              </div>

              <button
                onClick={() => handleSubscribe('lumina_all_access_monthly')}
                disabled={loading !== null}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] hover:bg-white/[0.1] hover:border-white/25 py-2.5 text-xs sm:text-sm font-semibold text-text transition active:scale-[0.99] disabled:opacity-50"
              >
                <span>{loading === 'lumina_all_access_monthly' ? 'Génération du lien...' : 'Payer avec NabooPay (990 FCFA)'}</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {/* Annuel */}
            <div className="relative rounded-2xl border border-al-gold/40 bg-black/50 p-6 shadow-2xl shadow-black/50 transition hover:border-al-gold/60 flex flex-col justify-between">
              <div className="absolute top-0 right-4 -translate-y-1/2 rounded-full bg-al-gold px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-black shadow-md">
                ★ 2 Mois Offerts • Plus Économique
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg font-bold text-text">Abonnement Annuel</h3>
                  <span className="rounded-full bg-al-gold/10 border border-al-gold/30 px-2.5 py-0.5 text-xs font-bold text-al-gold">
                    Application annuelle
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-text">12 mois d&apos;accès aux fonctions de l’application et à la lecture des sources compatibles, au prix de 10 mois.</p>
                <div className="font-display mt-4 flex items-baseline gap-1.5 text-3xl font-bold text-text">
                  9 900 <span className="text-base font-bold text-al-gold">FCFA</span>
                  <span className="text-xs font-normal text-text-muted">/ an</span>
                </div>
              </div>

              <button
                onClick={() => handleSubscribe('lumina_all_access_annual')}
                disabled={loading !== null}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-transparent bg-al-yellow hover:brightness-110 py-2.5 text-xs sm:text-sm font-bold text-black shadow-lg shadow-black/40 transition active:scale-[0.99] disabled:opacity-50"
              >
                <span>{loading === 'lumina_all_access_annual' ? 'Génération du lien...' : 'Payer avec NabooPay (9 900 FCFA)'}</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
    </AppShell>
  );
}
