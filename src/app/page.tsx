import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { UserButton } from '@clerk/nextjs';
import {
  ArrowRight,
  Heart,
  Radar,
  Tv,
  Sparkles,
  Globe2,
  CheckCircle2,
  Zap,
  ExternalLink,
  ChevronDown,
  Film,
  Trophy,
  Music2,
  Newspaper,
  MonitorPlay,
  CreditCard,
  Smartphone,
  ShieldCheck,
  Check,
  Gift,
} from 'lucide-react';
import { redirect } from 'next/navigation';
import BrandLogo from '@/components/BrandLogo';
import BrandBackdrop from '@/components/brand/BrandBackdrop';
import GoldRing from '@/components/brand/GoldRing';
import KenteBand from '@/components/brand/KenteBand';
import Wordmark from '@/components/brand/Wordmark';
import { ButtonLink } from '@/components/ui';
import LandingDashboardPreview from '@/components/LandingDashboardPreview';
import { isAnonymousE2EMode, isLocalDevMode } from '@/lib/local-dev';

export default async function HomePage() {
  if (isLocalDevMode()) redirect('/app/live');
  const { userId, sessionClaims } = isAnonymousE2EMode()
    ? { userId: null, sessionClaims: null }
    : await auth();

  const metrics = [
    { label: 'Carte interactive', value: 'Afrique', icon: Globe2, detail: 'Explorer les pays et leurs médias' },
    { label: 'Veille médiatique', value: 'Multi-sources', icon: Newspaper, detail: 'Dépêches et publications d’origine' },
    { label: 'Météo', value: 'Par ville', icon: Globe2, detail: 'Suivre les conditions locales' },
    { label: 'Télévision', value: 'Web & VLC', icon: Tv, detail: 'Un accès depuis le dashboard' },
  ];

  const features = [
    {
      icon: Radar,
      title: 'Un dashboard pour suivre l’Afrique',
      description: 'Parcourez les dépêches de plusieurs médias, consultez leurs sources et retrouvez le contexte du pays qui vous intéresse.',
      badge: 'Veille multi-sources',
    },
    {
      icon: Globe2,
      title: 'Une carte pour explorer et comprendre',
      description: 'Sélectionnez un pays pour retrouver ses médias et ses chaînes. Consultez aussi la météo et les couches de suivi disponibles.',
      badge: 'Exploration par pays',
    },
    {
      icon: Heart,
      title: 'Favoris Personnalisés',
      description: 'Constituez votre sélection sur mesure et retrouvez rapidement les chaînes qui comptent pour vous.',
      badge: 'Bouquet sur mesure',
    },
    {
      icon: Zap,
      title: 'La TV à portée de main',
      description: 'Depuis le dashboard, ouvrez l’app TV et ses filtres. La lecture utilise votre navigateur ou VLC selon la disponibilité et la compatibilité de la source.',
      badge: 'Web & VLC',
    },
  ];

  const categories = [
    { name: 'Actualités & Info', icon: Newspaper, count: '1 400+ chaînes', desc: 'RTS, CRTV, ORTB, France 24, BBC Afrique...' },
    { name: 'Sport en Direct', icon: Trophy, count: '650+ chaînes', desc: 'CAN, Championnats locaux, sports de combat, athlétisme' },
    { name: 'Musique & Rythmes', icon: Music2, count: '1 200+ chaînes', desc: 'Afrobeats, Coupé-décalé, Mbalax, Rumba, Gospel...' },
    { name: 'Cinéma & Séries', icon: Film, count: '980+ chaînes', desc: 'Nollywood, fictions panafricaines, documentaires & cinéma' },
  ];

  const faqs = [
    {
      q: 'Qu’est-ce qu’Africa Live ?',
      a: 'Africa Live réunit un dashboard de veille panafricaine, une carte interactive, des dépêches et la météo. L’app TV est accessible depuis le dashboard ; la lecture dépend de la disponibilité et de la compatibilité des sources.',
    },
    {
      q: 'Ai-je besoin d’installer un logiciel pour regarder les chaînes ?',
      a: 'Non ! La plupart des chaînes compatibles se lancent instantanément dans le lecteur vidéo Web intégré. Pour les flux nécessitant des codecs spécifiques ou pour une expérience grand écran optimisée, un bouton vous permet d’ouvrir le flux dans VLC en un seul clic.',
    },
    {
      q: 'Comment fonctionne la lecture directe ?',
      a: 'Africa Live respecte strictement la transmission directe : votre navigateur ou VLC se connecte directement à la source officielle du diffuseur. Aucun intermédiaire ni transcodage serveur n’est imposé, garantissant une latence minimale et une authenticité totale.',
    },
    {
      q: 'Comment fonctionne l’essai gratuit de 5 jours ?',
      a: 'Dès la création de votre compte, vous profitez automatiquement de 5 jours d’essai sans engagement ni obligation d’achat. Aucune carte bancaire ni information de paiement n’est requise à l’inscription. Durant ces 5 jours, vous accédez librement à l’ensemble des 11 700+ chaînes, sur le web et sur VLC. À la fin des 5 jours, vous choisissez d’activer le forfait de votre choix (990 FCFA/mois ou 9 900 FCFA/an) par Wave, Orange Money ou CB. Si vous ne souscrivez pas, aucun montant n’est débité.',
    },
    {
      q: 'Quels sont les tarifs d’abonnement et comment puis-je payer ?',
      a: 'Africa Live propose deux formules transparentes sans engagement : le Forfait Mensuel à 990 FCFA (30 jours) et le Forfait Annuel à 9 900 FCFA (12 mois au prix de 10). Vous pouvez régler instantanément et en toute sécurité par Wave, Orange Money ou carte bancaire (Visa/Mastercard) via notre passerelle agréée NabooPay. Votre accès au direct est débloqué automatiquement dans la seconde suivant votre paiement.',
    },
    {
      q: 'Puis-je enregistrer mes chaînes préférées ?',
      a: 'Oui. Cliquez sur l’icône cœur sur n’importe quelle chaîne pour l’ajouter à vos favoris. Vous retrouverez votre sélection personnelle en tête de liste à chacune de vos connexions.',
    },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-text selection:bg-al-yellow selection:text-black">
      {/* Brand transparent background watermark */}
      <BrandBackdrop variant="hero" />

      {/* Ambient background glows with tricolor accents */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[650px] w-[950px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-al-green/10 via-al-yellow/8 to-al-red/10 blur-[140px]" />
      <div className="pointer-events-none absolute top-[40%] right-[-10%] -z-10 h-[500px] w-[500px] rounded-full bg-al-gold/5 blur-[130px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Sticky Header */}
        <header className="sticky top-0 z-50 flex min-h-16 sm:min-h-20 items-center justify-between gap-4 border-b border-line bg-black/60 backdrop-blur-2xl">
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-tricolor-bar opacity-80" />
          <Link href="/" aria-label="Africa Live, accueil" className="group flex items-center gap-3">
            <GoldRing className="size-11 sm:size-12">
              <BrandLogo className="size-10 sm:size-11" />
            </GoldRing>
            <div className="flex flex-col gap-1.5">
              <Wordmark className="text-base sm:text-xl" />
              <span className="hidden text-xs font-semibold text-al-gold sm:block">
                Le live qui vient à vous
              </span>
            </div>
          </Link>

          {/* Navigation links & CTA */}
          <nav aria-label="Navigation principale" className="flex items-center gap-3 sm:gap-6 text-sm font-semibold">
            <Link href="#features" className="hidden text-text-muted transition hover:text-text md:block">
              Fonctionnalités
            </Link>
            <Link href="#categories" className="hidden text-text-muted transition hover:text-text md:block">
              Catégories
            </Link>
            <Link href="#pricing" className="hidden text-al-gold transition hover:text-text font-semibold sm:block">
              Tarifs
            </Link>
            <Link href="#faq" className="hidden text-text-muted transition hover:text-text md:block">
              FAQ
            </Link>

            <div className="h-4 w-[1px] bg-white/10 hidden md:block" />

            {userId ? (
              <div className="flex items-center gap-3">
                {sessionClaims?.metadata?.role === 'admin' && (
                  <Link
                    href="/admin"
                    className="hidden rounded-xl border border-al-gold/30 bg-al-gold/10 px-3 py-1.5 text-xs font-semibold text-al-gold transition hover:bg-al-gold/20 sm:block"
                  >
                    Administration
                  </Link>
                )}
                <ButtonLink href="/app/live" variant="secondary" size="sm">
                  <span className="sm:hidden">Dashboard</span>
                  <span className="hidden sm:inline">Ouvrir le dashboard</span>
                </ButtonLink>
                <UserButton />
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  href="/sign-in"
                  className="whitespace-nowrap px-2 py-3 text-xs font-medium text-text transition hover:text-al-gold sm:px-3 sm:text-sm"
                >
                  Se connecter
                </Link>
                <span className="hidden sm:block">
                  <ButtonLink href="/sign-up" variant="secondary" size="sm">
                    Commencer
                  </ButtonLink>
                </span>
              </div>
            )}
          </nav>
        </header>

        {/* Hero Section */}
        <section className="relative grid gap-12 pt-12 pb-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-24">
          <div>
            {/* Live Pulse Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-al-gold/30 bg-al-gold/10 px-3.5 py-1 text-xs font-semibold text-al-gold">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-al-green opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-al-green" />
              </span>
              <span>Dalal ak jàmm · Actualités, carte et direct</span>
            </div>

            {/* Headline */}
            <h1 className="font-display mt-6 text-4xl font-bold tracking-tight text-text sm:text-6xl lg:text-[64px] lg:leading-[1.1]">
              L’Afrique{' '}
              <span className="relative inline-block text-al-yellow">
                à portée de regard.
                <span aria-hidden="true" className="bg-tricolor-bar absolute -bottom-1.5 left-0 h-1 w-full rounded-pill" />
              </span>
            </h1>

            {/* Subhead */}
            <p className="mt-6 max-w-xl text-base sm:text-lg leading-relaxed text-text">
              Explorez l’Afrique depuis un dashboard de veille : carte interactive, dépêches,
              météo et marchés. Retrouvez les chaînes TV du pays quand vous souhaitez passer au direct.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap items-center gap-3 sm:gap-4">
              <Link
                href={userId ? '/app/live' : '/sign-up'}
                className="inline-flex items-center gap-2.5 rounded-xl border border-transparent bg-al-yellow hover:brightness-110 px-6 py-3.5 text-sm sm:text-base font-bold text-black transition shadow-lg shadow-black/40 hover:scale-[1.01] active:scale-[0.98]"
              >
                <span>{userId ? 'Accéder au dashboard' : 'Profiter de 5 jours d’essai gratuit'}</span>
                <ArrowRight size={17} />
              </Link>
              {!userId && (
                <Link
                  href="/sign-in"
                  className="inline-flex items-center gap-2 rounded-xl border border-line bg-white/[0.04] px-5 py-3.5 text-sm sm:text-base font-semibold text-text transition hover:border-white/20 hover:bg-white/[0.08] hover:text-text"
                >
                  <Sparkles size={16} className="text-al-gold" />
                  <span>J’ai déjà un compte</span>
                </Link>
              )}
            </div>

            {/* Reassurance pills */}
            <div className="mt-8 flex flex-wrap items-center gap-y-2.5 gap-x-6 text-xs text-text">
              <span className="flex items-center gap-1.5 font-bold text-al-gold">
                <Gift size={15} className="text-al-gold shrink-0" /> Profitez de 5 jours d’essai sans engagement
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-al-gold" /> Dès 990 FCFA/mois sans prélèvement auto
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-al-green" /> Wave, Orange Money & CB
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-al-green" /> Web HLS & Lecteur VLC 1-clic
              </span>
            </div>
          </div>

          <LandingDashboardPreview href={userId ? '/app/live' : '/sign-up'} />
        </section>

        <KenteBand className="my-2 w-full" />

        {/* Live Metrics Grid */}
        <section aria-label="Statistiques" className="border-y border-line py-10 my-4">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {metrics.map(({ label, value, icon: Icon, detail }) => (
              <div
                key={label}
                className="group relative rounded-2xl border border-line bg-surface-1/80 p-5 transition-all hover:border-al-gold/30 hover:bg-white/[0.02]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-lg font-bold leading-tight tracking-tight text-al-yellow sm:text-3xl">
                    {value}
                  </span>
                  <div className="rounded-xl border border-al-gold/20 bg-al-gold/10 p-2 text-al-gold group-hover:scale-110 transition-transform">
                    <Icon size={20} />
                  </div>
                </div>
                <h3 className="mt-2 text-sm font-bold text-text">{label}</h3>
                <p className="mt-0.5 text-xs text-text-muted">{detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Dashboard features */}
        <section id="features" className="py-20 border-t border-line">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-xs font-bold uppercase tracking-widest text-al-gold">
              Votre dashboard au quotidien
            </h2>
            <p className="font-display mt-2 text-3xl font-bold tracking-tight text-text sm:text-4xl">
              Explorez, informez-vous, puis regardez
            </p>
            <p className="mt-3 text-sm text-text-muted">
              La veille au centre de votre expérience, avec la télévision accessible depuis le même espace.
            </p>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-2">
            {features.map(({ icon: Icon, title, description, badge }) => (
              <div
                key={title}
                className="relative rounded-2xl border border-line bg-surface-1/80 p-7 transition hover:border-white/20 hover:bg-white/[0.02]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-al-gold/20 bg-al-gold/10 text-al-gold">
                    <Icon size={22} />
                  </div>
                  <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs font-semibold text-text border border-line">
                    {badge}
                  </span>
                </div>
                <h3 className="font-display mt-6 text-xl font-bold text-text">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-text-muted">{description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Secondary TV categories */}
        <section id="categories" className="py-20">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-xs font-bold uppercase tracking-widest text-al-gold">
              La TV, en complément
            </h2>
            <p className="font-display mt-2 text-3xl font-bold tracking-tight text-text sm:text-4xl">
              Retrouvez aussi vos chaînes favorites
            </p>
            <p className="mt-3 text-sm text-text-muted">
              De Dakar à Nairobi, de Kinshasa à Johannesburg, trouvez vos émissions favorites classées par genre.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map(({ name, icon: Icon, count, desc }) => (
              <div
                key={name}
                className="group relative overflow-hidden rounded-2xl border border-line bg-surface-1/80 p-6 transition-all duration-300 hover:border-al-gold/40 hover:bg-white/[0.02] hover:-translate-y-1 shadow-lg shadow-black/40"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-al-gold/20 bg-al-gold/10 text-al-gold transition-colors group-hover:bg-al-gold/20 group-hover:text-text">
                  <Icon size={22} />
                </div>
                <h3 className="font-display mt-5 text-lg font-bold text-text">{name}</h3>
                <p className="text-xs font-semibold text-al-gold/90 mt-1">{count}</p>
                <p className="mt-3 text-xs leading-5 text-text-muted">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* TV playback options */}

        <section className="py-16">
          <div className="relative overflow-hidden rounded-3xl border border-line bg-surface-1/80 p-8 sm:p-12 shadow-2xl">
            {/* Ambient accent halo */}
            <div className="absolute -inset-10 bg-gradient-to-r from-al-green/10 via-al-yellow/10 to-al-red/10 opacity-50 blur-3xl pointer-events-none" />

            <div className="relative z-10 grid gap-8 lg:grid-cols-2 lg:items-center">
              <div>
                <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-al-gold">
                  <MonitorPlay size={16} /> Flexibilité Absolue
                </span>
                <h2 className="font-display mt-3 text-3xl font-bold text-text sm:text-4xl">
                  Regardez sur le Web ou lancez dans VLC
                </h2>
                <p className="mt-4 text-base leading-relaxed text-text">
                  Certains flux utilisent des protocoles ou codecs avancés. Africa Live vous donne le choix :
                  lisez instantanément dans votre navigateur via notre lecteur HLS haute performance, ou d’un clic,
                  ouvrez le flux natif dans VLC Player pour profiter de votre configuration home-cinéma.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 rounded-xl bg-surface-1/80 px-3.5 py-2 text-xs font-medium text-text border border-line">
                    <CheckCircle2 size={15} className="text-al-green" />
                    Lecteur Web HLS intégré
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-surface-1/80 px-3.5 py-2 text-xs font-medium text-text border border-line">
                    <CheckCircle2 size={15} className="text-al-green" />
                    Lancement VLC 1-clic direct
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-surface-1/80 px-3.5 py-2 text-xs font-medium text-text border border-line">
                    <CheckCircle2 size={15} className="text-al-green" />
                    Zéro publicité injectée
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface-1/80 p-6">
                <div className="flex items-center justify-between border-b border-line pb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Options de visionnage</span>
                  <span className="text-xs rounded bg-al-green/20 text-al-green border border-al-green/30 px-2 py-0.5 font-bold">100% direct</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-al-gold/30 bg-al-gold/10 p-4 text-center">
                    <Tv size={26} className="mx-auto text-al-gold" />
                    <p className="mt-2 text-sm font-bold text-text">Lecteur Navigateur</p>
                    <p className="mt-1 text-xs text-text-muted">Instantané, aucun réglage</p>
                  </div>
                  <div className="rounded-xl border border-line bg-white/[0.03] p-4 text-center hover:border-white/20 transition">
                    <ExternalLink size={26} className="mx-auto text-text" />
                    <p className="mt-2 text-sm font-bold text-text">VLC Media Player</p>
                    <p className="mt-1 text-xs text-text-muted">1-clic vers l’app desktop</p>
                  </div>
                </div>
                <p className="text-xs text-center text-text-muted">
                  Lecture web selon le format du flux, avec VLC conseillé sur ordinateur lorsque nécessaire.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing & Subscription Section */}
        <section id="pricing" className="py-20 border-t border-line">
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-al-gold/30 bg-al-gold/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-al-gold">
              <Sparkles size={14} /> Tarifs Clairs & Sans Surprise
            </div>
            <h2 className="font-display mt-3 text-3xl font-bold text-text sm:text-4xl">
              Choisissez votre formule d&apos;abonnement
            </h2>
            <p className="mt-3 text-sm text-text-muted">
              Profitez d&apos;un accès illimité à l&apos;intégralité du bouquet panafricain.
              Paiement instantané et sécurisé par Mobile Money local ou carte bancaire.
            </p>

            {/* Payment Methods Badges Bar */}
            <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-line bg-surface-1/80 px-5 py-2.5 text-xs text-text">
              <span className="font-semibold text-text-muted">Moyens de paiement acceptés :</span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#1da1f2]/10 border border-[#1da1f2]/30 px-2.5 py-1 text-xs font-bold text-[#38bdf8]">
                <Smartphone size={13} /> Wave
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#ff7900]/10 border border-[#ff7900]/30 px-2.5 py-1 text-xs font-bold text-[#fb923c]">
                <Smartphone size={13} /> Orange Money
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-al-green/10 border border-al-green/30 px-2.5 py-1 text-xs font-bold text-al-green">
                <CreditCard size={13} /> Visa / Mastercard
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-xs text-text-muted">
                • Sécurisé par NabooPay
              </span>
            </div>

            {/* Trial Offer Callout */}
            <div className="mt-8 mx-auto max-w-2xl rounded-2xl border border-line-gold bg-surface-1 p-5 text-center shadow-lg shadow-black/40">
              <div className="flex items-center justify-center gap-2 text-sm font-black text-al-gold">
                <Gift size={18} className="text-al-gold shrink-0" />
                <span>Profitez de 5 jours d’essai sans engagement !</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-text">
                Créez votre compte en 30 secondes sans renseigner de carte bancaire. Vous bénéficiez d&apos;un accès complet et immédiat pendant 5 jours. Vous ne réglez votre forfait qu&apos;une fois totalement convaincu.
              </p>
            </div>
          </div>

          <div className="mt-14 grid gap-8 max-w-4xl mx-auto md:grid-cols-2 items-stretch">
            {/* Forfait Mensuel */}
            <div className="relative flex flex-col justify-between rounded-3xl border border-line bg-surface-1/80 p-8 transition duration-200 hover:border-white/20 shadow-xl">
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-white/[0.04] border border-line px-3 py-1 text-xs font-semibold text-text">
                    Formule Découverte
                  </span>
                  <span className="text-xs text-text-muted font-mono">Sans engagement</span>
                </div>
                <h3 className="font-display mt-5 text-2xl font-bold text-text">Forfait Mensuel</h3>
                <p className="mt-2 text-xs text-text-muted">
                  Accès complet pendant 30 jours. Renouvellement libre selon vos envies.
                </p>

                <div className="mt-6 flex items-baseline gap-2">
                  <span className="font-display text-4xl sm:text-5xl font-bold text-text">990</span>
                  <span className="text-lg font-bold text-al-gold">FCFA</span>
                  <span className="text-xs text-text-muted font-medium">/ mois (30 jours)</span>
                </div>

                <div className="mt-8 border-t border-line pt-6 space-y-3.5 text-xs text-text">
                  <div className="flex items-center gap-2.5">
                    <Check size={16} className="text-al-green shrink-0" />
                    <span><strong>11 700+ chaînes</strong> en accès illimité</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check size={16} className="text-al-green shrink-0" />
                    <span>Lecteur Web HLS + bascule 1-clic vers VLC</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check size={16} className="text-al-green shrink-0" />
                    <span>Recherche rapide, filtres et favoris synchronisés</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check size={16} className="text-al-green shrink-0" />
                    <span>Zéro publicité injectée</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check size={16} className="text-al-green shrink-0" />
                    <span>Activation immédiate après paiement</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4">
                <Link
                  href="/pricing"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/25 py-3 text-sm font-semibold text-text transition active:scale-[0.99]"
                >
                  <span>Souscrire au Mensuel (990 FCFA)</span>
                  <ArrowRight size={15} />
                </Link>
                <p className="mt-2 text-center text-xs text-text-muted">
                  Paiement instantané Wave, Orange Money ou CB
                </p>
              </div>
            </div>

            {/* Forfait Annuel */}
            <div className="relative flex flex-col justify-between rounded-3xl border border-al-gold/40 bg-black/50 p-8 shadow-2xl shadow-black/50 transition duration-200 hover:border-al-gold/60">
              {/* Highlight ribbon */}
              <div className="absolute -top-3.5 right-6 rounded-full bg-al-gold px-4 py-1 text-xs font-bold uppercase tracking-wider text-black shadow-lg">
                ★ 2 Mois Offerts • Plus Économique
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-al-gold/10 border border-al-gold/30 px-3 py-1 text-xs font-bold text-al-gold">
                    Forfait Annuel Africa Live
                  </span>
                </div>
                <h3 className="font-display mt-5 text-2xl font-bold text-text">Forfait Annuel</h3>
                <p className="mt-2 text-xs text-text">
                  12 mois de télévision en continu au prix de 10 mois. La tranquillité totale pour toute l&apos;année.
                </p>

                <div className="mt-6 flex items-baseline gap-2">
                  <span className="font-display text-4xl sm:text-5xl font-bold text-text">9 900</span>
                  <span className="text-lg font-bold text-al-gold">FCFA</span>
                  <span className="text-xs text-text-muted font-medium">/ an (12 mois)</span>
                </div>

                <div className="mt-8 border-t border-al-gold/20 pt-6 space-y-3.5 text-xs text-text">
                  <div className="flex items-center gap-2.5">
                    <Check size={16} className="text-al-gold shrink-0" />
                    <span><strong>Tout le catalogue 11 700+ chaînes</strong> sans restriction</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check size={16} className="text-al-gold shrink-0" />
                    <span><strong>Économisez 1 980 FCFA</strong> par rapport au forfait mensuel</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check size={16} className="text-al-gold shrink-0" />
                    <span>Compatibilité PC, Mac, Smartphone et Tablettes</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check size={16} className="text-al-gold shrink-0" />
                    <span>Priorité réseau et support client dédié</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check size={16} className="text-al-gold shrink-0" />
                    <span>Paiement sécurisé unique sans prélèvement imprévu</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4">
                <Link
                  href="/pricing"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-transparent bg-al-yellow hover:brightness-110 py-3 text-sm font-bold text-black shadow-lg shadow-black/40 transition active:scale-[0.99]"
                >
                  <span>Souscrire à l&apos;Annuel (9 900 FCFA)</span>
                  <ArrowRight size={15} />
                </Link>
                <p className="mt-2 text-center text-xs text-al-gold/80 font-medium">
                  Réglez facilement en quelques secondes via NabooPay
                </p>
              </div>
            </div>
          </div>

          {/* How payment works banner */}
          <div className="mt-12 max-w-4xl mx-auto rounded-2xl border border-line bg-surface-1/80 p-6 sm:p-8">
            <h4 className="text-sm font-bold uppercase tracking-wider text-al-gold text-center sm:text-left flex items-center gap-2 justify-center sm:justify-start">
              <ShieldCheck size={18} /> Comment fonctionne le règlement ?
            </h4>
            <div className="mt-5 grid gap-6 sm:grid-cols-3 text-xs text-text-muted">
              <div className="flex flex-col gap-1.5">
                <span className="font-bold text-text text-sm">1. Choisissez votre forfait</span>
                <p>Sélectionnez l&apos;abonnement mensuel (990 FCFA) ou annuel (9 900 FCFA) selon votre convenance.</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="font-bold text-text text-sm">2. Validez sur votre téléphone</span>
                <p>Renseignez votre numéro Wave ou Orange Money sur la passerelle sécurisée NabooPay et confirmez l&apos;opération.</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="font-bold text-text text-sm">3. Regardez instantanément</span>
                <p>Votre compte est immédiatement activé. Profitez de vos programmes en direct dès la confirmation.</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Accordion Section */}
        <section id="faq" className="py-20 border-t border-line">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-xs font-bold uppercase tracking-widest text-al-gold">
              Questions Fréquentes
            </h2>
            <p className="font-display mt-2 text-3xl font-bold tracking-tight text-text sm:text-4xl">
              Tout ce que vous devez savoir
            </p>
          </div>

          <div className="mt-12 max-w-3xl mx-auto space-y-4">
            {faqs.map(({ q, a }, idx) => (
              <details
                key={idx}
                className="group rounded-2xl border border-line bg-surface-1/80 p-6 [&_summary::-webkit-details-marker]:none transition hover:border-al-gold/30"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-4 font-bold text-text select-none">
                  <span className="text-base sm:text-lg">{q}</span>
                  <span className="rounded-full bg-white/[0.04] p-1.5 text-text-muted group-open:rotate-180 group-open:text-al-gold transition-transform duration-200">
                    <ChevronDown size={18} />
                  </span>
                </summary>
                <p className="mt-4 text-sm leading-relaxed text-text-muted">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Bottom CTA Banner */}
        <section className="py-16">
          <div className="relative overflow-hidden rounded-3xl border border-al-gold/30 bg-black/50 p-10 text-center sm:py-16 shadow-2xl">
            {/* Tricolor ambient glow */}
            <div className="absolute -inset-10 bg-gradient-to-r from-al-green/10 via-al-yellow/10 to-al-red/10 opacity-60 blur-3xl pointer-events-none" />

            <div className="relative z-10">
              <BrandLogo className="mx-auto h-20 w-20 drop-shadow-[0_4px_15px_rgba(252,209,22,0.25)]" />
              <h2 className="font-display mt-6 text-3xl font-bold text-text sm:text-5xl">
                Prêt à explorer l’Afrique autrement ?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base text-text">
                Rejoignez votre dashboard de veille panafricaine et retrouvez le direct TV depuis un seul espace.
              </p>
              <div className="mt-8 flex justify-center">
                <Link
                  href={userId ? '/app/live' : '/sign-up'}
                  className="inline-flex items-center gap-3 rounded-xl border border-transparent bg-al-yellow hover:brightness-110 px-7 py-3 text-base font-bold text-black shadow-lg shadow-black/40 transition hover:scale-[1.01] active:scale-[0.98]"
                >
                  <span>{userId ? 'Ouvrir mon dashboard' : 'Commencer maintenant'}</span>
                  <ArrowRight size={17} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-line py-10 text-xs text-text-muted">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <BrandLogo className="h-8 w-8" />
              <Wordmark className="text-sm" />
              <span>— Le live qui vient à vous.</span>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-text-muted">
              <Link href="#features" className="hover:text-text transition">Fonctionnalités</Link>
              <Link href="#categories" className="hover:text-text transition">Catégories</Link>
              <Link href="/pricing" className="hover:text-al-gold transition font-medium">Tarifs</Link>
              <Link href="#faq" className="hover:text-text transition">FAQ</Link>
              <Link href="/contact" className="hover:text-text transition">Contact</Link>
              <Link href="/cgu" className="hover:text-text transition">CGU & Vente</Link>
              <Link href="/privacy" className="hover:text-text transition">Confidentialité</Link>
              <Link href={userId ? '/account' : '/sign-in'} className="hover:text-al-gold transition">
                {userId ? 'Mon compte' : 'Se connecter'}
              </Link>
            </div>
          </div>
          <div className="mt-8 flex flex-col sm:flex-row justify-between gap-2 border-t border-white/5 pt-6 text-xs text-text-muted">
            <p>© {new Date().getFullYear()} Africa Live. Tous droits réservés.</p>
            <p>Lecture depuis la source lorsque le flux est disponible et compatible.</p>
          </div>
        </footer>
      </div>
    </main>
  );
}
