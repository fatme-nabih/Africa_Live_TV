import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { UserButton } from '@clerk/nextjs';
import {
  ArrowRight,
  Heart,
  Search,
  Tv,
  Radio,
  Play,
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
import BrandWatermark from '@/components/BrandWatermark';
import { isAnonymousE2EMode, isLocalDevMode } from '@/lib/local-dev';

export default async function HomePage() {
  if (isLocalDevMode()) redirect('/app');
  const { userId, sessionClaims } = isAnonymousE2EMode()
    ? { userId: null, sessionClaims: null }
    : await auth();

  const metrics = [
    { label: 'Chaînes référencées', value: '11 700+', icon: Tv, detail: 'Catalogue international' },
    { label: 'Pays représentés', value: '176', icon: Globe2, detail: 'Afrique & International' },
    { label: 'Modes de lecture', value: 'Web & VLC', icon: MonitorPlay, detail: 'Navigateur ou application native' },
    { label: 'Flux directs', value: '100%', icon: Zap, detail: 'Sans relais ni transcodage' },
  ];

  const features = [
    {
      icon: Search,
      title: 'Recherche Instantanée & Filtres Intelligents',
      description: 'Trouvez n’importe quel programme en une seconde. Filtrez par pays, langue, genre ou résolution avec indexation ultra-rapide.',
      badge: 'Filtre multi-critères',
    },
    {
      icon: MonitorPlay,
      title: 'Double Expérience de Lecture',
      description: 'Profitez d’un lecteur vidéo intégré moderne avec HLS dans votre navigateur, ou lancez vos flux en 1 clic directement dans VLC Player.',
      badge: 'HLS & VLC natif',
    },
    {
      icon: Heart,
      title: 'Favoris Personnalisés',
      description: 'Constituez votre sélection sur mesure et retrouvez rapidement les chaînes qui comptent pour vous.',
      badge: 'Bouquet sur mesure',
    },
    {
      icon: Zap,
      title: 'Sélection de flux certifiés et qualifiés en direct',
      description: 'Chaque flux est testé et validé pour garantir une disponibilité optimale, avec bascule fluide vers VLC si nécessaire.',
      badge: 'Flux qualifiés',
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
      a: 'Africa Live organise un catalogue de chaînes et de sources. Lorsqu’une source est compatible et disponible, la lecture s’effectue depuis votre navigateur ou votre lecteur multimédia.',
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
    <main className="relative min-h-screen overflow-hidden bg-black text-zinc-100 selection:bg-yellow-400 selection:text-black">
      {/* Brand transparent background watermark */}
      <BrandWatermark />

      {/* Ambient background glows with tricolor accents */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[650px] w-[950px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-emerald-500/10 via-yellow-400/8 to-red-500/10 blur-[140px]" />
      <div className="pointer-events-none absolute top-[40%] right-[-10%] -z-10 h-[500px] w-[500px] rounded-full bg-amber-500/5 blur-[130px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Sticky Header */}
        <header className="sticky top-0 z-50 flex min-h-16 sm:min-h-20 items-center justify-between gap-4 border-b border-white/[0.08] bg-black/60 backdrop-blur-2xl">
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-tricolor-bar opacity-80" />
          <Link href="/" aria-label="Africa Live, accueil" className="group flex items-center gap-3">
            <div className="relative flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-white/[0.03] p-1.5 ring-1 ring-white/10 transition-all group-hover:ring-amber-400/40">
              <BrandLogo className="h-full w-full drop-shadow-[0_2px_10px_rgba(250,204,21,0.25)]" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white">
                Africa Live<span className="text-amber-400">.</span>
              </span>
              <span className="hidden text-[10px] font-semibold tracking-wider text-amber-400/80 uppercase sm:block">
                Télévision Panafricaine
              </span>
            </div>
          </Link>

          {/* Navigation links & CTA */}
          <nav aria-label="Navigation principale" className="flex items-center gap-3 sm:gap-6 text-sm font-semibold">
            <Link href="#features" className="hidden text-zinc-400 transition hover:text-white md:block">
              Fonctionnalités
            </Link>
            <Link href="#categories" className="hidden text-zinc-400 transition hover:text-white md:block">
              Catégories
            </Link>
            <Link href="#pricing" className="text-amber-300 transition hover:text-yellow-200 font-semibold">
              Tarifs
            </Link>
            <Link href="#faq" className="hidden text-zinc-400 transition hover:text-white md:block">
              FAQ
            </Link>

            <div className="h-4 w-[1px] bg-white/10 hidden md:block" />

            {userId ? (
              <div className="flex items-center gap-3">
                {sessionClaims?.metadata?.role === 'admin' && (
                  <Link
                    href="/admin"
                    className="hidden rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-300 transition hover:bg-amber-400/20 sm:block"
                  >
                    Administration
                  </Link>
                )}
                <Link
                  href="/app"
                  className="rounded-xl border border-amber-400/40 bg-gradient-to-r from-emerald-500/20 via-amber-400/25 to-rose-500/20 hover:from-emerald-500/30 hover:via-amber-400/35 hover:to-rose-500/30 px-4 py-2 text-xs sm:text-sm font-bold text-amber-200 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 shadow-sm backdrop-blur-sm"
                >
                  Ouvrir le direct
                </Link>
                <UserButton />
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  href="/sign-in"
                  className="px-3 py-1.5 text-xs sm:text-sm font-medium text-zinc-300 transition hover:text-white"
                >
                  Se connecter
                </Link>
                <Link
                  href="/sign-up"
                  className="rounded-xl border border-amber-400/40 bg-gradient-to-r from-emerald-500/20 via-amber-400/25 to-rose-500/20 hover:from-emerald-500/30 hover:via-amber-400/35 hover:to-rose-500/30 px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold text-amber-200 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 shadow-sm backdrop-blur-sm"
                >
                  Commencer
                </Link>
              </div>
            )}
          </nav>
        </header>

        {/* Hero Section */}
        <section className="relative grid gap-12 pt-12 pb-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-24">
          <div>
            {/* Live Pulse Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3.5 py-1 text-xs font-semibold text-amber-300 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span>DIRECT • 11 700+ chaînes • 5 jours d’essai sans engagement</span>
            </div>

            {/* Headline */}
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-[64px] lg:leading-[1.1]">
              L’Afrique et le monde{' '}
              <span className="text-gradient-gold">en direct</span>, sur tous vos écrans.
            </h1>

            {/* Subhead */}
            <p className="mt-6 max-w-xl text-base sm:text-lg leading-relaxed text-zinc-300">
              Accédez à un vaste catalogue télévisuel panafricain. Information en direct,
              sports, divertissement, musiques et cultures régionales réunis dans une interface moderne et fluide.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap items-center gap-3 sm:gap-4">
              <Link
                href={userId ? '/app' : '/sign-up'}
                className="inline-flex items-center gap-2.5 rounded-xl border border-amber-400/40 bg-gradient-to-r from-emerald-500/25 via-amber-400/30 to-rose-500/25 hover:from-emerald-500/35 hover:via-amber-400/40 hover:to-rose-500/35 px-6 py-3.5 text-sm sm:text-base font-bold text-white transition backdrop-blur-md shadow-lg shadow-black/40 hover:scale-[1.01] active:scale-[0.98]"
              >
                <span>{userId ? 'Accéder au direct' : 'Profiter de 5 jours d’essai gratuit'}</span>
                <ArrowRight size={17} />
              </Link>
              {!userId && (
                <Link
                  href="/sign-in"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3.5 text-sm sm:text-base font-semibold text-zinc-200 backdrop-blur-md transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                >
                  <Sparkles size={16} className="text-amber-400" />
                  <span>J’ai déjà un compte</span>
                </Link>
              )}
            </div>

            {/* Reassurance pills */}
            <div className="mt-8 flex flex-wrap items-center gap-y-2.5 gap-x-6 text-xs text-zinc-300">
              <span className="flex items-center gap-1.5 font-bold text-yellow-300">
                <Gift size={15} className="text-yellow-400 shrink-0" /> Profitez de 5 jours d’essai sans engagement
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-yellow-400" /> Dès 990 FCFA/mois sans prélèvement auto
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-emerald-400" /> Wave, Orange Money & CB
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-emerald-400" /> Web HLS & Lecteur VLC 1-clic
              </span>
            </div>
          </div>

          {/* Player Mockup Visual */}
          <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
            {/* Ambient halo behind mockup */}
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-emerald-500/15 via-amber-500/15 to-rose-500/15 opacity-70 blur-2xl pointer-events-none" />

            <div className="glass-panel-subtle relative overflow-hidden rounded-2xl border border-amber-400/30 p-1 shadow-2xl">
              {/* Window Bar */}
              <div className="flex items-center justify-between border-b border-white/[0.08] bg-black/50 backdrop-blur-md px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <div className="flex items-center gap-2 rounded-md bg-white/[0.04] border border-white/[0.06] px-3 py-1 text-[11px] font-mono text-zinc-400">
                  <Radio size={12} className="text-emerald-400 animate-pulse" />
                  <span>CRTV News • 1080p HLS Direct</span>
                </div>
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
              </div>

              {/* Mock Screen Content */}
              <div className="relative flex aspect-video w-full flex-col justify-between overflow-hidden rounded-b-xl bg-gradient-to-b from-black/60 to-black/90 p-5">
                {/* Background Art with Subtle Tricolor Glow */}
                <div className="absolute inset-0 opacity-20 [background:radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-amber-500/30 via-emerald-500/20 to-black pointer-events-none" />

                {/* Top Player Badges */}
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded bg-rose-600/90 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                      ● LIVE
                    </span>
                    <span className="rounded bg-black/60 border border-white/[0.08] px-2 py-0.5 text-[10px] font-semibold text-zinc-300 backdrop-blur-md">
                      SOURCE DIRECTE
                    </span>
                  </div>
                  <span className="rounded-full bg-white/[0.06] border border-white/[0.08] px-2.5 py-1 text-[10px] font-medium text-amber-300 backdrop-blur-md">
                    🇨🇲 Cameroun
                  </span>
                </div>

                {/* Center Play Button Graphic */}
                <div className="relative z-10 flex flex-col items-center justify-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-amber-400/50 bg-gradient-to-r from-emerald-500/30 via-amber-400/40 to-rose-500/30 text-amber-200 shadow-lg shadow-black/50 backdrop-blur-md transition hover:scale-105">
                    <Play size={22} className="fill-current translate-x-0.5" />
                  </div>
                  <p className="text-xs font-medium tracking-wide text-zinc-300 drop-shadow">
                    Cliquez pour lancer le zapping
                  </p>
                </div>

                {/* Bottom Mock Channel Strip */}
                <div className="relative z-10 flex items-center justify-between rounded-lg bg-black/60 px-3 py-2 text-xs backdrop-blur-md border border-white/[0.08]">
                  <div className="flex items-center gap-2.5">
                    <div className="h-6 w-6 rounded bg-amber-400/10 border border-amber-400/20 p-1 flex items-center justify-center">
                      <BrandLogo className="h-full w-full" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-white leading-none">Journal Télévisé Panafricain</p>
                      <p className="text-[9px] text-zinc-400">Édition spéciale en continu</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Sans relais
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Live Metrics Grid */}
        <section aria-label="Statistiques" className="border-y border-white/[0.08] py-10 my-4">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {metrics.map(({ label, value, icon: Icon, detail }) => (
              <div
                key={label}
                className="group relative rounded-2xl border border-white/[0.08] bg-black/40 backdrop-blur-xl p-5 transition-all hover:border-amber-400/30 hover:bg-white/[0.02]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-black tracking-tight text-gradient-gold sm:text-4xl">
                    {value}
                  </span>
                  <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-2 text-amber-300 group-hover:scale-110 transition-transform">
                    <Icon size={20} />
                  </div>
                </div>
                <h3 className="mt-2 text-sm font-bold text-white">{label}</h3>
                <p className="mt-0.5 text-xs text-zinc-400">{detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Thematic Categories Explorer */}
        <section id="categories" className="py-20">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-xs font-bold uppercase tracking-widest text-amber-400">
              Un catalogue infini
            </h2>
            <p className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Explorez toutes les thématiques
            </p>
            <p className="mt-3 text-sm text-zinc-400">
              De Dakar à Nairobi, de Kinshasa à Johannesburg, trouvez vos émissions favorites classées par genre.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map(({ name, icon: Icon, count, desc }) => (
              <div
                key={name}
                className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-black/40 backdrop-blur-xl p-6 transition-all duration-300 hover:border-amber-400/40 hover:bg-white/[0.02] hover:-translate-y-1 shadow-lg shadow-black/40"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10 text-amber-300 transition-colors group-hover:bg-amber-400/20 group-hover:text-amber-200">
                  <Icon size={22} />
                </div>
                <h3 className="mt-5 text-lg font-bold text-white">{name}</h3>
                <p className="text-xs font-semibold text-amber-300/90 mt-1">{count}</p>
                <p className="mt-3 text-xs leading-5 text-zinc-400">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Feature Highlights Grid */}
        <section id="features" className="py-20 border-t border-white/[0.08]">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-xs font-bold uppercase tracking-widest text-amber-400">
              Technologies & Ergonomie
            </h2>
            <p className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Conçu pour une expérience de streaming optimale
            </p>
            <p className="mt-3 text-sm text-zinc-400">
              Toute la puissance d’une interface de streaming moderne sans la complexité des listes M3U manuelles.
            </p>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-2">
            {features.map(({ icon: Icon, title, description, badge }) => (
              <div
                key={title}
                className="relative rounded-2xl border border-white/[0.08] bg-black/40 backdrop-blur-xl p-7 transition hover:border-white/20 hover:bg-white/[0.02]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10 text-amber-300">
                    <Icon size={22} />
                  </div>
                  <span className="rounded-full bg-white/[0.04] px-3 py-1 text-[11px] font-semibold text-zinc-300 border border-white/[0.08]">
                    {badge}
                  </span>
                </div>
                <h3 className="mt-6 text-xl font-bold text-white">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">{description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Dual Player Spotlight (Web + VLC) */}
        <section className="py-16">
          <div className="relative overflow-hidden rounded-3xl border border-white/[0.1] bg-black/40 backdrop-blur-2xl p-8 sm:p-12 shadow-2xl">
            {/* Ambient accent halo */}
            <div className="absolute -inset-10 bg-gradient-to-r from-emerald-500/10 via-amber-500/10 to-rose-500/10 opacity-50 blur-3xl pointer-events-none" />

            <div className="relative z-10 grid gap-8 lg:grid-cols-2 lg:items-center">
              <div>
                <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300">
                  <MonitorPlay size={16} /> Flexibilité Absolue
                </span>
                <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">
                  Regardez sur le Web ou lancez dans VLC
                </h2>
                <p className="mt-4 text-base leading-relaxed text-zinc-300">
                  Certains flux utilisent des protocoles ou codecs avancés. Africa Live vous donne le choix :
                  lisez instantanément dans votre navigateur via notre lecteur HLS haute performance, ou d’un clic,
                  ouvrez le flux natif dans VLC Player pour profiter de votre configuration home-cinéma.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 rounded-xl bg-black/50 px-3.5 py-2 text-xs font-medium text-zinc-300 border border-white/[0.08] backdrop-blur-md">
                    <CheckCircle2 size={15} className="text-emerald-400" />
                    Lecteur Web HLS intégré
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-black/50 px-3.5 py-2 text-xs font-medium text-zinc-300 border border-white/[0.08] backdrop-blur-md">
                    <CheckCircle2 size={15} className="text-emerald-400" />
                    Lancement VLC 1-clic direct
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-black/50 px-3.5 py-2 text-xs font-medium text-zinc-300 border border-white/[0.08] backdrop-blur-md">
                    <CheckCircle2 size={15} className="text-emerald-400" />
                    Zéro publicité injectée
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-black/50 p-6 backdrop-blur-xl">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Options de visionnage</span>
                  <span className="text-[10px] rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 font-bold">100% direct</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-center backdrop-blur-md">
                    <Tv size={26} className="mx-auto text-amber-300" />
                    <p className="mt-2 text-sm font-bold text-white">Lecteur Navigateur</p>
                    <p className="mt-1 text-[11px] text-zinc-400">Instantané, aucun réglage</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 text-center backdrop-blur-md hover:border-white/20 transition">
                    <ExternalLink size={26} className="mx-auto text-zinc-300" />
                    <p className="mt-2 text-sm font-bold text-white">VLC Media Player</p>
                    <p className="mt-1 text-[11px] text-zinc-400">1-clic vers l’app desktop</p>
                  </div>
                </div>
                <p className="text-[11px] text-center text-zinc-400">
                  Lecture web selon le format du flux, avec VLC conseillé sur ordinateur lorsque nécessaire.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing & Subscription Section */}
        <section id="pricing" className="py-20 border-t border-white/[0.08]">
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-amber-300 backdrop-blur-md">
              <Sparkles size={14} /> Tarifs Clairs & Sans Surprise
            </div>
            <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">
              Choisissez votre formule d&apos;abonnement
            </h2>
            <p className="mt-3 text-sm text-zinc-400">
              Profitez d&apos;un accès illimité à l&apos;intégralité du bouquet panafricain.
              Paiement instantané et sécurisé par Mobile Money local ou carte bancaire.
            </p>

            {/* Payment Methods Badges Bar */}
            <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-white/[0.08] bg-black/40 px-5 py-2.5 text-xs text-zinc-300 backdrop-blur-xl">
              <span className="font-semibold text-zinc-400">Moyens de paiement acceptés :</span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#1da1f2]/10 border border-[#1da1f2]/30 px-2.5 py-1 text-[11px] font-bold text-[#38bdf8]">
                <Smartphone size={13} /> Wave
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#ff7900]/10 border border-[#ff7900]/30 px-2.5 py-1 text-[11px] font-bold text-[#fb923c]">
                <Smartphone size={13} /> Orange Money
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 text-[11px] font-bold text-emerald-400">
                <CreditCard size={13} /> Visa / Mastercard
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-zinc-500">
                • Sécurisé par NabooPay
              </span>
            </div>

            {/* Trial Offer Callout */}
            <div className="mt-8 mx-auto max-w-2xl rounded-2xl border border-amber-400/30 bg-gradient-to-r from-emerald-500/10 via-amber-500/10 to-rose-500/10 p-5 text-center shadow-lg shadow-black/40 backdrop-blur-xl">
              <div className="flex items-center justify-center gap-2 text-sm font-black text-amber-300">
                <Gift size={18} className="text-amber-400 shrink-0" />
                <span>Profitez de 5 jours d’essai sans engagement !</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-zinc-300">
                Créez votre compte en 30 secondes sans renseigner de carte bancaire. Vous bénéficiez d&apos;un accès complet et immédiat pendant 5 jours. Vous ne réglez votre forfait qu&apos;une fois totalement convaincu.
              </p>
            </div>
          </div>

          <div className="mt-14 grid gap-8 max-w-4xl mx-auto md:grid-cols-2 items-stretch">
            {/* Forfait Mensuel */}
            <div className="relative flex flex-col justify-between rounded-3xl border border-white/[0.08] bg-black/40 backdrop-blur-xl p-8 transition duration-200 hover:border-white/20 shadow-xl">
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-white/[0.04] border border-white/[0.08] px-3 py-1 text-xs font-semibold text-zinc-300">
                    Formule Découverte
                  </span>
                  <span className="text-xs text-zinc-500 font-mono">Sans engagement</span>
                </div>
                <h3 className="mt-5 text-2xl font-bold text-white">Forfait Mensuel</h3>
                <p className="mt-2 text-xs text-zinc-400">
                  Accès complet pendant 30 jours. Renouvellement libre selon vos envies.
                </p>

                <div className="mt-6 flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-black text-white">990</span>
                  <span className="text-lg font-bold text-amber-400">FCFA</span>
                  <span className="text-xs text-zinc-500 font-medium">/ mois (30 jours)</span>
                </div>

                <div className="mt-8 border-t border-white/[0.08] pt-6 space-y-3.5 text-xs text-zinc-300">
                  <div className="flex items-center gap-2.5">
                    <Check size={16} className="text-emerald-400 shrink-0" />
                    <span><strong>11 700+ chaînes</strong> en accès illimité</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check size={16} className="text-emerald-400 shrink-0" />
                    <span>Lecteur Web HLS + bascule 1-clic vers VLC</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check size={16} className="text-emerald-400 shrink-0" />
                    <span>Recherche rapide, filtres et favoris synchronisés</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check size={16} className="text-emerald-400 shrink-0" />
                    <span>Zéro publicité injectée</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check size={16} className="text-emerald-400 shrink-0" />
                    <span>Activation immédiate après paiement</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4">
                <Link
                  href="/pricing"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/25 py-3 text-sm font-semibold text-white transition backdrop-blur-md active:scale-[0.99]"
                >
                  <span>Souscrire au Mensuel (990 FCFA)</span>
                  <ArrowRight size={15} />
                </Link>
                <p className="mt-2 text-center text-[10px] text-zinc-500">
                  Paiement instantané Wave, Orange Money ou CB
                </p>
              </div>
            </div>

            {/* Forfait Annuel */}
            <div className="relative flex flex-col justify-between rounded-3xl border border-amber-400/40 bg-black/50 backdrop-blur-2xl p-8 shadow-2xl shadow-black/50 transition duration-200 hover:border-amber-400/60">
              {/* Highlight ribbon */}
              <div className="absolute -top-3.5 right-6 rounded-full border border-amber-400/40 bg-gradient-to-r from-emerald-500/40 via-amber-400/50 to-rose-500/40 px-4 py-1 text-[11px] font-black uppercase tracking-wider text-amber-100 shadow-lg backdrop-blur-md">
                ★ 2 Mois Offerts • Plus Économique
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-amber-400/10 border border-amber-400/30 px-3 py-1 text-xs font-bold text-amber-300">
                    Forfait Annuel Africa Live
                  </span>
                </div>
                <h3 className="mt-5 text-2xl font-black text-white">Forfait Annuel</h3>
                <p className="mt-2 text-xs text-zinc-300">
                  12 mois de télévision en continu au prix de 10 mois. La tranquillité totale pour toute l&apos;année.
                </p>

                <div className="mt-6 flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-black text-white">9 900</span>
                  <span className="text-lg font-bold text-amber-400">FCFA</span>
                  <span className="text-xs text-zinc-400 font-medium">/ an (12 mois)</span>
                </div>

                <div className="mt-8 border-t border-amber-400/20 pt-6 space-y-3.5 text-xs text-zinc-200">
                  <div className="flex items-center gap-2.5">
                    <Check size={16} className="text-amber-400 shrink-0" />
                    <span><strong>Tout le catalogue 11 700+ chaînes</strong> sans restriction</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check size={16} className="text-amber-400 shrink-0" />
                    <span><strong>Économisez 1 980 FCFA</strong> par rapport au forfait mensuel</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check size={16} className="text-amber-400 shrink-0" />
                    <span>Compatibilité PC, Mac, Smartphone et Tablettes</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check size={16} className="text-amber-400 shrink-0" />
                    <span>Priorité réseau et support client dédié</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check size={16} className="text-amber-400 shrink-0" />
                    <span>Paiement sécurisé unique sans prélèvement imprévu</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4">
                <Link
                  href="/pricing"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-amber-400/40 bg-gradient-to-r from-emerald-500/25 via-amber-400/30 to-rose-500/25 hover:from-emerald-500/35 hover:via-amber-400/40 hover:to-rose-500/35 py-3 text-sm font-bold text-amber-100 shadow-lg shadow-black/40 transition active:scale-[0.99] backdrop-blur-md"
                >
                  <span>Souscrire à l&apos;Annuel (9 900 FCFA)</span>
                  <ArrowRight size={15} />
                </Link>
                <p className="mt-2 text-center text-[10px] text-amber-300/80 font-medium">
                  Réglez facilement en quelques secondes via NabooPay
                </p>
              </div>
            </div>
          </div>

          {/* How payment works banner */}
          <div className="mt-12 max-w-4xl mx-auto rounded-2xl border border-white/[0.08] bg-black/40 backdrop-blur-xl p-6 sm:p-8">
            <h4 className="text-sm font-bold uppercase tracking-wider text-amber-400 text-center sm:text-left flex items-center gap-2 justify-center sm:justify-start">
              <ShieldCheck size={18} /> Comment fonctionne le règlement ?
            </h4>
            <div className="mt-5 grid gap-6 sm:grid-cols-3 text-xs text-zinc-400">
              <div className="flex flex-col gap-1.5">
                <span className="font-bold text-white text-sm">1. Choisissez votre forfait</span>
                <p>Sélectionnez l&apos;abonnement mensuel (990 FCFA) ou annuel (9 900 FCFA) selon votre convenance.</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="font-bold text-white text-sm">2. Validez sur votre téléphone</span>
                <p>Renseignez votre numéro Wave ou Orange Money sur la passerelle sécurisée NabooPay et confirmez l&apos;opération.</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="font-bold text-white text-sm">3. Regardez instantanément</span>
                <p>Votre compte est immédiatement activé. Profitez de vos programmes en direct dès la confirmation.</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Accordion Section */}
        <section id="faq" className="py-20 border-t border-white/[0.08]">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-xs font-bold uppercase tracking-widest text-amber-400">
              Questions Fréquentes
            </h2>
            <p className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Tout ce que vous devez savoir
            </p>
          </div>

          <div className="mt-12 max-w-3xl mx-auto space-y-4">
            {faqs.map(({ q, a }, idx) => (
              <details
                key={idx}
                className="group rounded-2xl border border-white/[0.08] bg-black/40 backdrop-blur-xl p-6 [&_summary::-webkit-details-marker]:none transition hover:border-amber-400/30"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-4 font-bold text-white select-none">
                  <span className="text-base sm:text-lg">{q}</span>
                  <span className="rounded-full bg-white/[0.04] p-1.5 text-zinc-400 group-open:rotate-180 group-open:text-amber-400 transition-transform duration-200">
                    <ChevronDown size={18} />
                  </span>
                </summary>
                <p className="mt-4 text-sm leading-relaxed text-zinc-400">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Bottom CTA Banner */}
        <section className="py-16">
          <div className="relative overflow-hidden rounded-3xl border border-amber-400/30 bg-black/50 backdrop-blur-2xl p-10 text-center sm:py-16 shadow-2xl">
            {/* Tricolor ambient glow */}
            <div className="absolute -inset-10 bg-gradient-to-r from-emerald-500/10 via-amber-500/10 to-rose-500/10 opacity-60 blur-3xl pointer-events-none" />

            <div className="relative z-10">
              <BrandLogo className="mx-auto h-20 w-20 drop-shadow-[0_4px_15px_rgba(250,204,21,0.25)]" />
              <h2 className="mt-6 text-3xl font-black text-white sm:text-5xl">
                Prêt à vivre la télévision autrement ?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base text-zinc-300">
                Rejoignez Africa Live et explorez plus de 11 700 chaînes réunies dans un catalogue simple à parcourir.
              </p>
              <div className="mt-8 flex justify-center">
                <Link
                  href={userId ? '/app' : '/sign-up'}
                  className="inline-flex items-center gap-3 rounded-xl border border-amber-400/50 bg-gradient-to-r from-emerald-500/25 via-amber-400/30 to-rose-500/25 hover:from-emerald-500/35 hover:via-amber-400/40 hover:to-rose-500/35 px-7 py-3 text-base font-bold text-white shadow-lg shadow-black/40 backdrop-blur-md transition hover:scale-[1.01] active:scale-[0.98]"
                >
                  <span>{userId ? 'Ouvrir mon catalogue' : 'Commencer maintenant'}</span>
                  <ArrowRight size={17} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 py-10 text-xs text-zinc-500">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <BrandLogo className="h-8 w-8" />
              <span className="text-sm font-bold text-zinc-300">Africa Live</span>
              <span>— La télévision sans frontières.</span>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-zinc-400">
              <Link href="#features" className="hover:text-white transition">Fonctionnalités</Link>
              <Link href="#categories" className="hover:text-white transition">Catégories</Link>
              <Link href="/pricing" className="hover:text-yellow-400 transition font-medium">Tarifs</Link>
              <Link href="#faq" className="hover:text-white transition">FAQ</Link>
              <Link href="/contact" className="hover:text-white transition">Contact</Link>
              <Link href="/cgu" className="hover:text-white transition">CGU & Vente</Link>
              <Link href="/privacy" className="hover:text-white transition">Confidentialité</Link>
              <Link href={userId ? '/account' : '/sign-in'} className="hover:text-yellow-400 transition">
                {userId ? 'Mon compte' : 'Se connecter'}
              </Link>
            </div>
          </div>
          <div className="mt-8 flex flex-col sm:flex-row justify-between gap-2 border-t border-white/5 pt-6 text-[11px] text-zinc-600">
            <p>© {new Date().getFullYear()} Africa Live. Tous droits réservés.</p>
            <p>Lecture depuis la source lorsque le flux est disponible et compatible.</p>
          </div>
        </footer>
      </div>
    </main>
  );
}
