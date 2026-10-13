import EditionSwitcher, { EditionLandingLine } from '@/components/shell/EditionSwitcher';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Film,
  Gift,
  Leaf,
  Music2,
  Newspaper,
  Radar,
  Sparkles,
  Trophy,
  Tv,
} from 'lucide-react';
import { redirect } from 'next/navigation';
import BrandLogo from '@/components/BrandLogo';
import BrandBackdrop from '@/components/brand/BrandBackdrop';
import GoldRing from '@/components/brand/GoldRing';
import KenteBand from '@/components/brand/KenteBand';
import Wordmark from '@/components/brand/Wordmark';
import Faq from '@/components/marketing/Faq';
import SessionSwitch from '@/components/marketing/SessionSwitch';
import { TemplateText, YearText } from '@/components/marketing/RichText';
import PaymentMethods from '@/components/pricing/PaymentMethods';
import PlanCard from '@/components/pricing/PlanCard';
import { ButtonLink } from '@/components/ui';
import { isLocalDevMode } from '@/lib/local-dev';
import { formatCount, type PublicCategoryId } from '@/lib/public-stats';
import { getPublicStats } from '@/lib/public-stats-server';
import { I18nProvider } from '@/i18n/client';
import { clientMessages, getI18n } from '@/i18n/server';
import { getEdition } from '@/i18n/edition';
import { publicPageMetadata } from '@/i18n/metadata';
import { plural } from '@/i18n/format';
import { editionHref, editionLinkPrefetch } from '@/lib/edition-routing';
import type { Metadata } from 'next';

// Trois bénéfices, une icône par idée ; textes dans le dictionnaire de l'édition (EDI-501).
const BENEFITS = [
  { id: 'news', icon: Radar },
  { id: 'live', icon: Tv },
  { id: 'data', icon: Leaf },
] as const;

const CATEGORIES: ReadonlyArray<{ id: PublicCategoryId; icon: typeof Newspaper }> = [
  { id: 'news', icon: Newspaper },
  { id: 'sports', icon: Trophy },
  { id: 'music', icon: Music2 },
  { id: 'movies', icon: Film },
];

export async function generateMetadata(): Promise<Metadata> {
  return publicPageMetadata(await getEdition(), '/');
}

// Page statique, régénérée au plus toutes les 10 minutes (chiffres publics, eux-mêmes en cache 1 h) : aucun rendu par requête.
// La session n'est jamais lue côté serveur et Clerk n'est pas chargé ici (UX-603) : les zones qui en dépendent passent par
// <EditionSwitcher /><SessionSwitch> (version visiteur d'abord). Le menu de compte et l'accès Administration vivent dans l'application.
// 10 minutes plutôt qu'une heure : si la base est injoignable pendant le build, la page sans chiffres est vite remplacée.
export const revalidate = 600;

export default async function HomePage() {
  if (isLocalDevMode()) redirect('/app/live');
  const stats = await getPublicStats();
  const { edition, t: dictionary } = await getI18n();
  const t = dictionary.landing;
  const plans = dictionary.pricing.plans;
  const href = (path: string) => editionHref(path, edition);
  const count = (value: number) => formatCount(value, edition);

  return (
    <I18nProvider messages={clientMessages(edition, ['pricing'])}>
    <main className="relative min-h-screen overflow-hidden bg-black text-text selection:bg-al-yellow selection:text-black">
      <BrandBackdrop variant="hero" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="sticky top-0 z-50 flex min-h-16 items-center justify-between gap-4 border-b border-line bg-black/70 backdrop-blur-xl sm:min-h-20">
          <div className="bg-tricolor-bar absolute top-0 inset-x-0 h-0.5" aria-hidden="true" />
          <Link href={href('/')} className="flex items-center gap-3">
            <GoldRing className="size-11 sm:size-12">
              <BrandLogo className="size-10 sm:size-11" decorative />
            </GoldRing>
            <div className="flex flex-col gap-1.5">
              <Wordmark className="text-base sm:text-xl" />
              <span className="hidden text-xs font-semibold text-al-gold sm:block">{t.signature}</span>
            </div>
          </Link>

          <nav aria-label={dictionary.shell.nav.label} className="flex items-center gap-3 text-sm font-semibold sm:gap-6">
            <Link href="#benefices" className="hidden text-text-muted transition hover:text-text md:block">{t.nav.discover}</Link>
            <Link href="#tarifs" className="hidden text-al-gold transition hover:text-text sm:block">{t.nav.pricing}</Link>
            <EditionSwitcher />
            <Link href="#faq" className="hidden text-text-muted transition hover:text-text md:block">{t.nav.faq}</Link>
            <div className="hidden h-4 w-px bg-line md:block" />
            <div className="flex items-center gap-2 sm:gap-3">
              <SessionSwitch
                signedOut={<>
                  <Link href={href('/sign-in')} prefetch={editionLinkPrefetch(href('/sign-in'))} className="inline-flex min-h-11 items-center px-2 text-sm font-medium whitespace-nowrap text-text transition hover:text-al-gold sm:px-3">
                    {dictionary.shell.header.signIn}
                  </Link>
                  <span className="hidden sm:block">
                    <ButtonLink href={href('/sign-up')} variant="secondary" size="sm">{dictionary.shell.header.start}</ButtonLink>
                  </span>
                </>}
                signedIn={
                  <ButtonLink href={href('/app/live')} variant="secondary" size="sm">
                    <span className="sm:hidden">{t.nav.dashboardShort}</span>
                    <span className="hidden sm:inline">{t.nav.dashboard}</span>
                  </ButtonLink>
                }
              />
            </div>
          </nav>
        </header>

        {/* Hero : promesse, une action principale, chiffres issus de la base et aperçu réel de l'application. */}
        <section className="grid gap-10 pt-10 pb-14 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-12 lg:py-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-pill border border-line-gold bg-al-gold/10 px-3.5 py-1 text-xs font-semibold text-al-gold">
              <span className="relative flex size-2" aria-hidden="true">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-al-green opacity-75 motion-reduce:animate-none" />
                <span className="relative inline-flex size-2 rounded-full bg-al-green" />
              </span>
              {t.badge}
            </p>

            <h1 className="font-display mt-6 text-4xl font-bold tracking-tight text-text sm:text-6xl lg:text-[3.75rem] lg:leading-[1.1]">
              {t.titleStart}{' '}
              <span className="relative inline-block text-al-yellow">
                {t.titleHighlight}
                <span aria-hidden="true" className="bg-tricolor-bar absolute -bottom-1.5 start-0 h-1 w-full rounded-pill" />
              </span>
            </h1>
          <EditionLandingLine />

            <p className="mt-6 max-w-xl text-base leading-relaxed text-text sm:text-lg">
              {t.lead}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <SessionSwitch
                signedOut={<>
                  <ButtonLink href={href('/sign-up')} variant="primary" size="lg">
                    {t.trial}
                    <ArrowRight className="rtl:-scale-x-100" size={18} aria-hidden="true" />
                  </ButtonLink>
                  <ButtonLink href={href('/sign-in')} variant="secondary" size="lg" icon={<Sparkles size={16} aria-hidden="true" className="text-al-gold" />}>
                    {t.haveAccount}
                  </ButtonLink>
                </>}
                signedIn={
                  <ButtonLink href={href('/app/live')} variant="primary" size="lg">
                    {t.openDashboard}
                    <ArrowRight className="rtl:-scale-x-100" size={18} aria-hidden="true" />
                  </ButtonLink>
                }
              />
            </div>

            <p className="mt-5 flex items-center gap-2 text-sm text-text-muted">
              <Gift size={16} aria-hidden="true" className="shrink-0 text-al-gold" />
              {t.noCard}
            </p>

            {stats && (
              <dl aria-label={t.statsAria} className="mt-8 grid max-w-lg grid-cols-3 gap-3">
                <Stat value={count(stats.totalChannels)} label={t.statChannels} />
                <Stat value={count(stats.africanChannels)} label={t.statAfrican} />
                <Stat value={count(stats.africanCountries)} label={t.statCountries} />
              </dl>
            )}
          </div>

          <figure className="relative mx-auto w-full max-w-2xl lg:max-w-none">
            <div aria-hidden="true" className="pointer-events-none absolute -inset-4 rounded-card bg-tricolor-bar opacity-10 blur-2xl" />
            <Image
              src="/landing/hero-radar-tv.webp"
              alt={t.heroAlt}
              width={1200}
              height={760}
              sizes="(min-width: 1024px) 50vw, 100vw"
              loading="eager"
              fetchPriority="high"
              className="relative h-auto w-full rounded-card border border-line-gold shadow-2xl shadow-black/60"
            />
            <figcaption className="mt-2 text-center text-xs text-text-muted">{t.heroCaption}</figcaption>
          </figure>
        </section>

        <KenteBand className="w-full" />

        <section id="benefices" aria-labelledby="benefices-title" className="py-16 sm:py-20">
          <h2 id="benefices-title" className="font-display max-w-2xl text-3xl font-bold tracking-tight text-text sm:text-4xl">
            {t.benefitsTitle}
          </h2>
          <ul className="mt-10 grid gap-5 md:grid-cols-3">
            {BENEFITS.map(({ id, icon: Icon }) => (
              <li key={id} className="rounded-card border border-line bg-surface-1/90 p-6">
                <span className="flex size-11 items-center justify-center rounded-control border border-line-gold bg-al-gold/10 text-al-gold">
                  <Icon size={22} aria-hidden="true" />
                </span>
                <h3 className="font-display mt-5 text-lg font-bold text-text">{t.benefits[id].title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">{t.benefits[id].description}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="categories" aria-labelledby="categories-title" className="pb-16 sm:pb-20">
          <h2 id="categories-title" className="font-display text-2xl font-bold tracking-tight text-text sm:text-3xl">
            {t.categoriesTitle}
          </h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CATEGORIES.map(({ id, icon: Icon }) => (
              <li key={id} className="rounded-card border border-line bg-surface-1/90 p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex size-10 items-center justify-center rounded-control border border-line-gold bg-al-gold/10 text-al-gold">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  {stats && stats.categories[id] > 0 && (
                    <span className="text-sm font-semibold text-al-gold"><TemplateText template={plural(edition, stats.categories[id], t.categoryCount)} values={{ count: count(stats.categories[id]) }} /></span>
                  )}
                </div>
                <h3 className="font-display mt-4 text-lg font-bold text-text">{t.categories[id].name}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{t.categories[id].desc}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="tarifs" aria-labelledby="tarifs-title" className="border-t border-line py-16 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 id="tarifs-title" className="font-display text-3xl font-bold tracking-tight text-text sm:text-4xl">
              {t.plansTitle}
            </h2>
            <p className="mt-3 text-base text-text-muted">
              {t.plansLead}
            </p>
          </div>
          <div className="mx-auto mt-10 grid max-w-4xl items-stretch gap-8 md:grid-cols-2 md:gap-6">
            <PlanCard
              {...plans.annual}
              featured
              action={<ButtonLink href={href('/pricing')} variant="secondary" size="lg" block className="border-al-gold/60">{t.chooseAnnual}<ArrowRight className="rtl:-scale-x-100" size={16} aria-hidden="true" /></ButtonLink>}
            />
            <PlanCard
              {...plans.monthly}
              action={<ButtonLink href={href('/pricing')} variant="secondary" size="lg" block>{t.chooseMonthly}<ArrowRight className="rtl:-scale-x-100" size={16} aria-hidden="true" /></ButtonLink>}
            />
          </div>
          <PaymentMethods className="mt-6 justify-center" />
        </section>

        <section id="faq" aria-labelledby="faq-title" className="border-t border-line py-16 sm:py-20">
          <h2 id="faq-title" className="font-display text-3xl font-bold tracking-tight text-text sm:text-4xl">{t.faqTitle}</h2>
          <Faq className="mt-8 max-w-3xl" />
        </section>

        <section className="pb-16">
          <div className="rounded-card border border-line-gold bg-surface-1 p-8 text-center sm:p-12">
            <BrandLogo className="mx-auto size-16" />
            <h2 className="font-display mt-5 text-2xl font-bold text-text sm:text-4xl">{t.closingTitle}</h2>
            <p className="mx-auto mt-3 max-w-xl text-base text-text-muted">
              {t.closingLead}
            </p>
            <div className="mt-7 flex justify-center">
              <SessionSwitch
                signedOut={<ButtonLink href={href('/sign-up')} variant="secondary" size="lg">{t.createAccount}<ArrowRight className="rtl:-scale-x-100" size={18} aria-hidden="true" /></ButtonLink>}
                signedIn={<ButtonLink href={href('/app/live')} variant="secondary" size="lg">{t.openMyDashboard}<ArrowRight className="rtl:-scale-x-100" size={18} aria-hidden="true" /></ButtonLink>}
              />
            </div>
          </div>
        </section>

        <footer className="border-t border-line py-10 text-sm text-text-muted">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <BrandLogo className="size-8" decorative />
              <Wordmark className="text-sm" />
            </div>
            <nav aria-label={t.footerAria} className="flex flex-wrap gap-x-6 gap-y-3">
              <Link href={href('/pricing')} className="transition hover:text-al-gold">{t.footer.pricing}</Link>
              <Link href={href('/contact')} className="transition hover:text-text">{t.footer.contact}</Link>
              <Link href={href('/cgu')} className="transition hover:text-text">{t.footer.cgu}</Link>
              <Link href={href('/privacy')} className="transition hover:text-text">{t.footer.privacy}</Link>
              <SessionSwitch
                signedOut={<Link href={href('/sign-in')} prefetch={editionLinkPrefetch(href('/sign-in'))} className="transition hover:text-al-gold">{t.footer.signIn}</Link>}
                signedIn={<Link href={href('/account')} prefetch={editionLinkPrefetch(href('/account'))} className="transition hover:text-al-gold">{t.footer.account}</Link>}
              />
            </nav>
          </div>
          <p className="mt-8 border-t border-line pt-6 text-xs">
            <YearText template={t.copyright} />
          </p>
        </footer>
      </div>
    </main>
    </I18nProvider>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col-reverse rounded-control border border-line bg-surface-1/90 px-3 py-3">
      <dt className="mt-0.5 text-xs text-text-muted">{label}</dt>
      <dd className="font-display text-lg font-bold text-text sm:text-2xl">{value}</dd>
    </div>
  );
}
