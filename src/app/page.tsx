import Image from 'next/image';
import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { UserButton } from '@clerk/nextjs';
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
import PaymentMethods from '@/components/pricing/PaymentMethods';
import PlanCard, { PLAN_COPY } from '@/components/pricing/PlanCard';
import { ButtonLink } from '@/components/ui';
import { isAnonymousE2EMode, isLocalDevMode } from '@/lib/local-dev';
import { formatCount, type PublicCategoryId } from '@/lib/public-stats';
import { getPublicStats } from '@/lib/public-stats-server';

// Trois bénéfices, une icône par idée.
const BENEFITS = [
  {
    icon: Radar,
    title: 'L’actualité, pays par pays',
    description: 'Les dépêches de rédactions africaines et internationales, une carte du continent et la météo locale, au même endroit.',
  },
  {
    icon: Tv,
    title: 'Le direct en un geste',
    description: 'Les chaînes du pays choisi, « Reprendre » et le zapping. La lecture se fait dans le navigateur, ou dans VLC quand la source l’exige.',
  },
  {
    icon: Leaf,
    title: 'Pensé pour votre forfait',
    description: 'Le mode Éco data réduit les images et la lecture automatique. Paiement par Wave, Orange Money ou carte, partage sur WhatsApp.',
  },
] as const;

const CATEGORIES: ReadonlyArray<{ id: PublicCategoryId; name: string; icon: typeof Newspaper; desc: string }> = [
  { id: 'news', name: 'Info', icon: Newspaper, desc: 'Journaux, débats et info continue.' },
  { id: 'sports', name: 'Sport', icon: Trophy, desc: 'Football, lutte et autres disciplines, selon les chaînes.' },
  { id: 'music', name: 'Musique', icon: Music2, desc: 'Mbalax, afrobeats, coupé-décalé, rumba, gospel…' },
  { id: 'movies', name: 'Cinéma et séries', icon: Film, desc: 'Fictions, Nollywood et documentaires.' },
];

export default async function HomePage() {
  if (isLocalDevMode()) redirect('/app/live');
  const [{ userId, sessionClaims }, stats] = await Promise.all([
    isAnonymousE2EMode() ? { userId: null, sessionClaims: null } : auth(),
    getPublicStats(),
  ]);
  const startHref = userId ? '/app/live' : '/sign-up';

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-text selection:bg-al-yellow selection:text-black">
      <BrandBackdrop variant="hero" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="sticky top-0 z-50 flex min-h-16 items-center justify-between gap-4 border-b border-line bg-black/70 backdrop-blur-xl sm:min-h-20">
          <div className="bg-tricolor-bar absolute top-0 right-0 left-0 h-0.5" aria-hidden="true" />
          <Link href="/" className="flex items-center gap-3">
            <GoldRing className="size-11 sm:size-12">
              <BrandLogo className="size-10 sm:size-11" decorative />
            </GoldRing>
            <div className="flex flex-col gap-1.5">
              <Wordmark className="text-base sm:text-xl" />
              <span className="hidden text-xs font-semibold text-al-gold sm:block">Le live qui vient à vous</span>
            </div>
          </Link>

          <nav aria-label="Navigation principale" className="flex items-center gap-3 text-sm font-semibold sm:gap-6">
            <Link href="#benefices" className="hidden text-text-muted transition hover:text-text md:block">Découvrir</Link>
            <Link href="#tarifs" className="hidden text-al-gold transition hover:text-text sm:block">Tarifs</Link>
            <Link href="#faq" className="hidden text-text-muted transition hover:text-text md:block">FAQ</Link>
            <div className="hidden h-4 w-px bg-line md:block" />
            {userId ? (
              <div className="flex items-center gap-3">
                {sessionClaims?.metadata?.role === 'admin' && (
                  <ButtonLink href="/admin" variant="ghost" size="sm" className="hidden sm:inline-flex">Administration</ButtonLink>
                )}
                <ButtonLink href="/app/live" variant="secondary" size="sm">
                  <span className="sm:hidden">Dashboard</span>
                  <span className="hidden sm:inline">Ouvrir le dashboard</span>
                </ButtonLink>
                <UserButton />
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <Link href="/sign-in" className="inline-flex min-h-11 items-center px-2 text-sm font-medium whitespace-nowrap text-text transition hover:text-al-gold sm:px-3">
                  Se connecter
                </Link>
                <span className="hidden sm:block">
                  <ButtonLink href="/sign-up" variant="secondary" size="sm">Commencer</ButtonLink>
                </span>
              </div>
            )}
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
              Dalal ak jàmm · Actualités, carte et direct
            </p>

            <h1 className="font-display mt-6 text-4xl font-bold tracking-tight text-text sm:text-6xl lg:text-[3.75rem] lg:leading-[1.1]">
              L’Afrique{' '}
              <span className="relative inline-block text-al-yellow">
                à portée de regard.
                <span aria-hidden="true" className="bg-tricolor-bar absolute -bottom-1.5 left-0 h-1 w-full rounded-pill" />
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-text sm:text-lg">
              Suivez ce qui se passe dans chaque pays, puis passez au direct de ses chaînes, sans changer d’application.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink href={startHref} variant="primary" size="lg">
                {userId ? 'Accéder au dashboard' : 'Profiter de 5 jours d’essai gratuit'}
                <ArrowRight size={18} aria-hidden="true" />
              </ButtonLink>
              {!userId && (
                <ButtonLink href="/sign-in" variant="secondary" size="lg" icon={<Sparkles size={16} aria-hidden="true" className="text-al-gold" />}>
                  J’ai déjà un compte
                </ButtonLink>
              )}
            </div>

            <p className="mt-5 flex items-center gap-2 text-sm text-text-muted">
              <Gift size={16} aria-hidden="true" className="shrink-0 text-al-gold" />
              Sans carte bancaire, puis dès 990 FCFA, sans renouvellement automatique.
            </p>

            {stats && (
              <dl aria-label="Le catalogue aujourd’hui" className="mt-8 grid max-w-lg grid-cols-3 gap-3">
                <Stat value={formatCount(stats.totalChannels)} label="chaînes" />
                <Stat value={formatCount(stats.africanChannels)} label="chaînes africaines" />
                <Stat value={formatCount(stats.africanCountries)} label="pays d’Afrique" />
              </dl>
            )}
          </div>

          <figure className="relative mx-auto w-full max-w-2xl lg:max-w-none">
            <div aria-hidden="true" className="pointer-events-none absolute -inset-4 rounded-card bg-tricolor-bar opacity-10 blur-2xl" />
            <Image
              src="/landing/hero-radar-tv.webp"
              alt="Aperçu d’Africa Live : le Radar avec la carte de l’Afrique et le fil des dépêches, et la TV sur mobile."
              width={1200}
              height={760}
              sizes="(min-width: 1024px) 50vw, 100vw"
              loading="eager"
              fetchPriority="high"
              className="relative h-auto w-full rounded-card border border-line-gold shadow-2xl shadow-black/60"
            />
            <figcaption className="mt-2 text-center text-xs text-text-muted">Aperçu réalisé avec des données d’exemple.</figcaption>
          </figure>
        </section>

        <KenteBand className="w-full" />

        <section id="benefices" aria-labelledby="benefices-title" className="py-16 sm:py-20">
          <h2 id="benefices-title" className="font-display max-w-2xl text-3xl font-bold tracking-tight text-text sm:text-4xl">
            Informez-vous, puis regardez.
          </h2>
          <ul className="mt-10 grid gap-5 md:grid-cols-3">
            {BENEFITS.map(({ icon: Icon, title, description }) => (
              <li key={title} className="rounded-card border border-line bg-surface-1/90 p-6">
                <span className="flex size-11 items-center justify-center rounded-control border border-line-gold bg-al-gold/10 text-al-gold">
                  <Icon size={22} aria-hidden="true" />
                </span>
                <h3 className="font-display mt-5 text-lg font-bold text-text">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">{description}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="categories" aria-labelledby="categories-title" className="pb-16 sm:pb-20">
          <h2 id="categories-title" className="font-display text-2xl font-bold tracking-tight text-text sm:text-3xl">
            De Dakar à Nairobi, vos chaînes par genre
          </h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CATEGORIES.map(({ id, name, icon: Icon, desc }) => (
              <li key={id} className="rounded-card border border-line bg-surface-1/90 p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex size-10 items-center justify-center rounded-control border border-line-gold bg-al-gold/10 text-al-gold">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  {stats && stats.categories[id] > 0 && (
                    <span className="text-sm font-semibold text-al-gold">{formatCount(stats.categories[id])} chaînes</span>
                  )}
                </div>
                <h3 className="font-display mt-4 text-lg font-bold text-text">{name}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{desc}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="tarifs" aria-labelledby="tarifs-title" className="border-t border-line py-16 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 id="tarifs-title" className="font-display text-3xl font-bold tracking-tight text-text sm:text-4xl">
              Deux formules, sans surprise
            </h2>
            <p className="mt-3 text-base text-text-muted">
              5 jours d’essai offerts à la création du compte. Ensuite, vous payez seulement si vous continuez.
            </p>
          </div>
          <div className="mx-auto mt-10 grid max-w-4xl items-stretch gap-8 md:grid-cols-2 md:gap-6">
            <PlanCard
              {...PLAN_COPY.annual}
              featured
              action={<ButtonLink href="/pricing" variant="secondary" size="lg" block className="border-al-gold/60">Choisir l’annuel<ArrowRight size={16} aria-hidden="true" /></ButtonLink>}
            />
            <PlanCard
              {...PLAN_COPY.monthly}
              action={<ButtonLink href="/pricing" variant="secondary" size="lg" block>Choisir le mensuel<ArrowRight size={16} aria-hidden="true" /></ButtonLink>}
            />
          </div>
          <PaymentMethods className="mt-6 justify-center" />
        </section>

        <section id="faq" aria-labelledby="faq-title" className="border-t border-line py-16 sm:py-20">
          <h2 id="faq-title" className="font-display text-3xl font-bold tracking-tight text-text sm:text-4xl">Questions fréquentes</h2>
          <Faq className="mt-8 max-w-3xl" />
        </section>

        <section className="pb-16">
          <div className="rounded-card border border-line-gold bg-surface-1 p-8 text-center sm:p-12">
            <BrandLogo className="mx-auto size-16" />
            <h2 className="font-display mt-5 text-2xl font-bold text-text sm:text-4xl">Le live qui vient à vous.</h2>
            <p className="mx-auto mt-3 max-w-xl text-base text-text-muted">
              Le Radar et la TV de toute l’Afrique, dans un seul espace.
            </p>
            <div className="mt-7 flex justify-center">
              <ButtonLink href={startHref} variant="secondary" size="lg">
                {userId ? 'Ouvrir mon dashboard' : 'Créer mon compte'}
                <ArrowRight size={18} aria-hidden="true" />
              </ButtonLink>
            </div>
          </div>
        </section>

        <footer className="border-t border-line py-10 text-sm text-text-muted">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <BrandLogo className="size-8" decorative />
              <Wordmark className="text-sm" />
            </div>
            <nav aria-label="Liens du pied de page" className="flex flex-wrap gap-x-6 gap-y-3">
              <Link href="/pricing" className="transition hover:text-al-gold">Tarifs</Link>
              <Link href="/contact" className="transition hover:text-text">Contact</Link>
              <Link href="/cgu" className="transition hover:text-text">CGU et vente</Link>
              <Link href="/privacy" className="transition hover:text-text">Confidentialité</Link>
              <Link href={userId ? '/account' : '/sign-in'} className="transition hover:text-al-gold">
                {userId ? 'Mon compte' : 'Se connecter'}
              </Link>
            </nav>
          </div>
          <p className="mt-8 border-t border-line pt-6 text-xs">
            © {new Date().getFullYear()} Africa Live. La lecture se fait depuis la source du diffuseur, quand elle est disponible et compatible.
          </p>
        </footer>
      </div>
    </main>
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
