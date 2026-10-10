'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Gift, ShieldCheck } from 'lucide-react';
import BrandBackdrop from '@/components/brand/BrandBackdrop';
import Faq from '@/components/marketing/Faq';
import PaymentMethods from '@/components/pricing/PaymentMethods';
import PlanCard, { PLAN_COPY } from '@/components/pricing/PlanCard';
import AppShell from '@/components/shell/AppShell';
import { Button } from '@/components/ui';
import { checkoutRequestSchema, checkoutResponseSchema } from '@/lib/payment-contracts';
import { checkoutAction, safeCheckoutDestination } from '@/lib/payment-attempt-policy';
import { CHECKOUT_PLANS, readCheckoutAttempt, saveCheckoutAttempt, replaceCheckoutAttempt, finishCheckoutAttempt } from '@/lib/checkout-attempt';

type PlanCode = 'lumina_all_access_monthly' | 'lumina_all_access_annual';

export default function PricingPage() {
  const [loading, setLoading] = useState<PlanCode | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const busy = useRef(false);
  const [trackingId,setTrackingId]=useState<string|null>(null);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      const attempt = CHECKOUT_PLANS.map(readCheckoutAttempt).find(value => value?.attemptId);
      if (active && attempt?.attemptId) setTrackingId(attempt.attemptId);
    });
    return () => { active = false; };
  }, []);

  const handleSubscribe = async (planCode: PlanCode) => {
    if (busy.current) return;
    busy.current = true;
    try {
      setLoading(planCode);
      setMessage(null);
      const attempt = readCheckoutAttempt(planCode) ?? { key: crypto.randomUUID(), attemptId: null };
      const idempotencyKey = attempt.key;
      const request = checkoutRequestSchema.safeParse({
        planCode, firstName, lastName, phone, idempotencyKey,
      });
      if (!request.success) {
        setMessage('Renseignez votre nom et un numéro au format international, par exemple +221771234567.');
        return;
      }
      saveCheckoutAttempt(planCode, attempt);
      const res = await fetch('/api/checkout/naboopay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Checkout-Protocol': '2' },
        body: JSON.stringify(request.data),
      });

      const rawData: unknown = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setMessage('Veuillez vous connecter pour vous abonner.');
          return;
        }
        setMessage('L’issue du paiement reste à vérifier. Réessayez avec la même tentative.');
        return;
      }

      const data = checkoutResponseSchema.safeParse(rawData);
      if (!data.success) {
        setMessage('Réponse de paiement invalide. Aucune redirection n’a été effectuée.');
        return;
      }
      const confirmed = { key: data.data.idempotency_key ?? attempt.key, attemptId: data.data.checkout_attempt_id };
      if (!replaceCheckoutAttempt(planCode,attempt.key,confirmed)) {
        setTrackingId(readCheckoutAttempt(planCode)?.attemptId ?? null);
        const result = checkoutAction(data.data.status,data.data.checkout_url) === 'finished' ? (data.data.status === 'completed' ? 'Paiement réussi. ' : data.data.status === 'refunded' ? 'Paiement remboursé. ' : 'Paiement non abouti. ') : '';
        setMessage(result + 'Une autre tentative est déjà suivie. Sa vérification reste conservée.');
        return;
      }
      const action = checkoutAction(data.data.status, data.data.checkout_url);
      if (action === 'finished') {
        finishCheckoutAttempt(planCode, confirmed);
        setTrackingId(current => current === confirmed.attemptId ? null : current);
        const result = data.data.status === 'completed' ? 'Paiement réussi.' : data.data.status === 'refunded' ? 'Paiement remboursé.' : 'Paiement non abouti.';
        setMessage(result + ' Cette tentative est terminée. Cliquez à nouveau pour créer une nouvelle tentative.');
        return;
      }
      setTrackingId(confirmed.attemptId);
      if (action === 'track') {
        setMessage('La création est en cours de vérification. N’effectuez pas un second paiement.');
        return;
      }
      const safeCheckoutUrl = safeCheckoutDestination(data.data.checkout_url!);
      if (!safeCheckoutUrl) {
        setMessage('Destination de paiement non autorisée.');
        return;
      }
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
      busy.current = false;
      setLoading(null);
    }
  };

  const planAction = (planCode: PlanCode, featured: boolean) => {
    const copy = planCode === 'lumina_all_access_annual' ? PLAN_COPY.annual : PLAN_COPY.monthly;
    return (
      <Button
        onClick={() => handleSubscribe(planCode)}
        disabled={loading !== null}
        variant={featured ? 'primary' : 'secondary'}
        size="lg"
        block
      >
        <span>{loading === planCode ? 'Ouverture du paiement…' : copy.cta}</span>
        <ArrowRight size={16} aria-hidden="true" />
      </Button>
    );
  };

  return (
    <AppShell mode="auto">
    <main className="relative flex-1 overflow-hidden bg-black px-4 py-8 text-text sm:px-6 sm:py-12">
      <BrandBackdrop variant="hero" />

      <div className="relative z-10 mx-auto max-w-5xl">
        <header className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-al-gold">Tarifs</p>
          <h1 className="font-display mt-2 text-3xl font-bold leading-tight text-text sm:text-5xl">
            Un seul accès, toute l’Afrique en direct.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-text-muted">
            Le Radar, la TV, vos favoris et le zapping, pour 30 jours ou 12 mois. Payez par mobile money ou par carte,
            sans renouvellement automatique.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-pill border border-line-gold bg-surface-1 px-3.5 py-2 text-sm font-semibold text-text">
            <Gift size={16} aria-hidden="true" className="shrink-0 text-al-gold" />
            Nouveau compte : 5 jours d’essai offerts, sans carte bancaire.
          </p>
        </header>

        <section aria-labelledby="pricing-details" className="mt-8 grid gap-4 rounded-card border border-line bg-surface-1/90 p-5 sm:grid-cols-2 sm:p-6">
          <h2 id="pricing-details" className="text-sm font-bold text-text sm:col-span-2">
            Vos coordonnées pour le paiement
          </h2>
          <label className="text-sm font-medium text-text">
            Prénom
            <input
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              autoComplete="given-name"
              maxLength={50}
              placeholder="Ex : Fatou"
              className={inputClass}
            />
          </label>
          <label className="text-sm font-medium text-text">
            Nom
            <input
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              autoComplete="family-name"
              maxLength={50}
              placeholder="Ex : Diop"
              className={inputClass}
            />
          </label>
          <label className="text-sm font-medium text-text sm:col-span-2">
            Téléphone au format international (Wave / Orange Money)
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value.trim())}
              autoComplete="tel"
              inputMode="tel"
              placeholder="+221771234567"
              maxLength={16}
              className={inputClass}
            />
          </label>
          {trackingId && <a className="text-sm text-al-gold underline" href={`/pricing/success?order_id=${encodeURIComponent(trackingId)}`}>Suivre la vérification du paiement</a>}
          {message && (
            <div role="alert" className="rounded-control border border-line-gold bg-al-gold/10 p-3 text-sm text-text sm:col-span-2">
              {message}
            </div>
          )}
        </section>

        <div className="mt-10 grid items-stretch gap-8 md:grid-cols-2 md:gap-6">
          <PlanCard {...PLAN_COPY.annual} featured action={planAction('lumina_all_access_annual', true)} />
          <PlanCard {...PLAN_COPY.monthly} action={planAction('lumina_all_access_monthly', false)} />
        </div>

        <div className="mt-6 flex flex-col items-center gap-3 text-center">
          <PaymentMethods className="justify-center" />
          <p className="flex items-center gap-1.5 text-xs text-text-muted">
            <ShieldCheck size={14} aria-hidden="true" className="text-al-green" />
            Paiement sécurisé par NabooPay. Vous confirmez l’opération sur votre téléphone ou votre carte.
          </p>
        </div>

        <section aria-labelledby="pricing-faq" className="mx-auto mt-14 max-w-3xl">
          <h2 id="pricing-faq" className="font-display text-xl font-bold text-text">Questions fréquentes</h2>
          <Faq ids={['trial', 'price', 'source']} className="mt-5" />
        </section>
      </div>
    </main>
    </AppShell>
  );
}

const inputClass =
  'mt-1.5 min-h-11 w-full rounded-control border border-line bg-surface-2 px-3.5 text-sm text-text placeholder:text-text-muted transition focus:border-al-gold focus:outline-none focus:ring-1 focus:ring-al-gold';
