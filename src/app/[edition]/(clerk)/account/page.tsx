import { EditionPreferences } from '@/components/shell/AccountPreferences';
import { getI18n } from '@/i18n/server';
import { redirect } from 'next/navigation';
import { UserProfile } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import { count, eq } from 'drizzle-orm';
import { AlertCircle, ArrowRight, CreditCard, ShieldCheck, Sparkles } from 'lucide-react';

import { db } from '@/db';
import type { Dictionary } from '@/i18n/dictionary';
import { format } from '@/i18n/message';
import { getEdition } from '@/i18n/edition';
import { dateTimeFormat, intlLocale } from '@/i18n/format';
import { userFavorites } from '@/db/schema';
import { getCurrentAccessDecision } from '@/lib/access-control';
import { isEdition } from '@/lib/editions';
import { accessGauge, accountAccessView, planLabel } from '@/lib/access-gauge';
import AccessMeter from '@/components/account/AccessMeter';
import AccountActivity from '@/components/account/AccountActivity';
import AppShell from '@/components/shell/AppShell';
import EcoToggle from '@/components/shell/EcoToggle';
import { getAdministratorAccess } from '@/lib/admin-access';
import BrandBackdrop from '@/components/brand/BrandBackdrop';
import { ButtonLink } from '@/components/ui';

function formatStatus(status: string, reason: string | undefined, labels: Dictionary['account']['copy']) {
  if (reason === 'administrator_access') return labels['Actif (Administrateur)'];
  const statuses: Record<string, string> = {
    active: 'Actif',
    trial: 'Essai actif',
    grace: 'Délai de grâce',
    expired: 'Expiré',
    past_due: 'Paiement requis',
    blocked: 'Bloqué',
  };

  return (labels as Record<string, string>)[statuses[status]] ?? status;
}

export default async function AccountPage(props: {
  searchParams?: Promise<{ access?: string }>;
}) {
  const { t } = await getI18n();
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in?redirect_url=/account');
  }

  const searchParams = props.searchParams ? await props.searchParams : {};
  const isAccessRequired = searchParams.access === 'required';

  const { user, decision: accessDecision, subscriptions } = await getCurrentAccessDecision();
  const currentSubscription = subscriptions[0];
  const admin = await getAdministratorAccess();
  const isAdmin = admin.allowed;
  // Carte « Mon accès » : un administrateur voit son accès administrateur partout (affichage seulement).
  const decision = accountAccessView(accessDecision, isAdmin);
  const [favorites] = user
    ? await db.select({ value: count() }).from(userFavorites).where(eq(userFavorites.userId, user.id))
    : [{ value: 0 }];
  const computedGauge = accessGauge(decision, currentSubscription?.planCode);
  const gauge = computedGauge ? { ...computedGauge, label: computedGauge.daysLeft === 0 ? t.account.copy['Se termine aujourd’hui'] : computedGauge.daysLeft === 1 ? t.account.copy['1 jour restant'] : format(t.account.copy['{v0} jours restants'], {v0: computedGauge.daysLeft}) } : null;
  const edition = await getEdition();
  const endDate = decision.expiresAt
    ? dateTimeFormat(intlLocale(edition), { dateStyle: 'long' }).format(new Date(decision.expiresAt))
    : null;

  return (
    <AppShell admin={isAdmin} preferenceIdentity={user ? { userId: user.id, clerkUserId: user.clerkUserId, local: accessDecision.reason === 'local_development', edition: isEdition(user.preferredEdition) ? user.preferredEdition : null } : undefined}>
    <main className="relative flex-1 overflow-hidden bg-black px-4 py-8 text-text sm:px-6">
      <BrandBackdrop variant="app" />

      <div className="relative z-10 mx-auto max-w-6xl">
        {isAccessRequired && !decision.hasAccess && (
          <div className="mb-6 flex items-start gap-3 rounded-card border border-line-gold bg-al-gold/10 p-4 text-sm text-text">
            <AlertCircle size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-al-gold" />
            <div>
              <p className="font-bold text-text">{t.account.copy["Abonnement ou période d'essai requis"]}</p>
              <p className="mt-1 leading-relaxed text-text-muted">
                {t.account.copy["Votre compte ne dispose plus d'un accès actif. Vous pouvez toujours consulter le catalogue TV ; un abonnement est nécessaire pour accéder au dashboard et lancer une source."]}</p>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <section aria-labelledby="access-title" className="h-fit rounded-card border border-line bg-surface-1/90 p-5 shadow-xl shadow-black/40 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-al-gold">{t.account.copy["Compte"]}</p>
                <h1 id="access-title" className="font-display mt-2 text-2xl font-bold text-text">{t.account.copy["Mon accès"]}</h1>
              </div>
              <span className="flex size-10 items-center justify-center rounded-control border border-line-gold bg-al-gold/10 text-al-gold">
                <ShieldCheck size={20} aria-hidden="true" />
              </span>
            </div>

            <p className="mt-5">
              <span className={`inline-flex items-center gap-1.5 rounded-pill border px-3 py-1 text-sm font-semibold ${decision.hasAccess ? 'border-al-green/30 bg-al-green/15 text-al-green' : 'border-al-red/30 bg-al-red/15 text-al-red-soft'}`}>
                <span aria-hidden="true" className={`size-1.5 rounded-full ${decision.hasAccess ? 'bg-al-green' : 'bg-al-red'}`} />
                {formatStatus(decision.status, decision.reason, t.account.copy)}
              </span>
            </p>

            {gauge && <div className="mt-5"><AccessMeter gauge={gauge} /></div>}

            <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-text-muted">{t.account.copy["Formule"]}</dt>
                <dd className="mt-1 font-medium text-text">{(t.account.copy as Record<string, string>)[planLabel(currentSubscription?.planCode, decision)] ?? planLabel(currentSubscription?.planCode, decision)}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-text-muted">{decision.hasAccess || isAdmin ? t.account.copy["Échéance"] : t.account.copy["Terminé le"]}</dt>
                <dd className="mt-1 font-medium text-text">{isAdmin ? t.account.copy["Accès permanent"] : endDate ?? (decision.hasAccess ? t.account.copy["Sans échéance connue"] : t.account.copy["Aucun accès en cours"])}</dd>
              </div>
              <div className="sm:col-span-2 lg:col-span-1 xl:col-span-2">
                <dt className="text-xs font-bold uppercase tracking-wider text-text-muted">{t.account.copy["E-mail"]}</dt>
                <dd className="mt-1 break-all font-medium text-text">{user?.email ?? t.account.copy["Non renseigné"]}</dd>
              </div>
            </dl>

            {(!decision.hasAccess || gauge?.endingSoon) && (
              <div className="mt-6">
                <ButtonLink href="/pricing" variant="primary" block icon={<Sparkles size={16} aria-hidden="true" />}>
                  <span>{decision.hasAccess ? t.account.copy["Prolonger mon accès"] : t.account.copy["Activer mon abonnement"]}{t.account.copy[" (dès 990 FCFA)"]}</span>
                  <ArrowRight className="rtl:-scale-x-100" size={16} aria-hidden="true" />
                </ButtonLink>
              </div>
            )}

            <div className="mt-6 rounded-control border border-line bg-surface-2 p-4">
              <EcoToggle variant="switch" />
            </div>

            <EditionPreferences />

            <p className="mt-4 flex gap-3 text-xs leading-relaxed text-text-muted">
              <CreditCard size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-al-gold" />
              {t.pricing.accountPaymentCaption}</p>
          </section>

          <div className="min-w-0">
            <AccountActivity favoritesCount={Number(favorites?.value ?? 0)} />
          </div>
        </div>

        {/* Le widget de profil Clerk a besoin de toute la largeur : dans une colonne, il était coupé sur desktop. */}
        <section aria-label={t.account.copy["Profil et sécurité"]} className="mt-6 overflow-x-auto rounded-card border border-line bg-surface-1/90 p-3 shadow-xl shadow-black/40">
          <UserProfile routing="hash" />
        </section>
      </div>
    </main>
    </AppShell>
  );
}
