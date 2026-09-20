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
} from 'lucide-react';
import { redirect } from 'next/navigation';
import BrandLogo from '@/components/BrandLogo';
import { isLocalDevMode } from '@/lib/local-dev';

export default async function HomePage() {
  if (isLocalDevMode()) redirect('/app');
  const { userId, sessionClaims } = await auth();

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
      title: 'Statuts de Compatibilité Clairs',
      description: 'Chaque chaîne affiche son dernier statut connu : lecture web, VLC conseillé, à tester ou indisponible.',
      badge: 'Lecture transparente',
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
      a: 'Africa Live est une plateforme moderne qui centralise et organise des milliers de chaînes de télévision africaines et internationales issues de flux directs publics et légitimes, accessibles directement depuis votre navigateur ou votre lecteur multimédia favori.',
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
      q: 'Puis-je enregistrer mes chaînes préférées ?',
      a: 'Oui. Cliquez sur l’icône cœur sur n’importe quelle chaîne pour l’ajouter à vos favoris. Vous retrouverez votre sélection personnelle en tête de liste à chacune de vos connexions.',
    },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020408] text-zinc-100 selection:bg-yellow-400 selection:text-black">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[650px] w-[950px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-yellow-500/15 via-emerald-500/10 to-transparent blur-[140px]" />
      <div className="pointer-events-none absolute top-[40%] right-[-10%] -z-10 h-[500px] w-[500px] rounded-full bg-amber-500/10 blur-[130px]" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Sticky Header */}
        <header className="sticky top-0 z-50 flex min-h-20 items-center justify-between gap-4 border-b border-white/10 bg-[#020408]/85 backdrop-blur-xl">
          <Link href="/" aria-label="Africa Live, accueil" className="group flex items-center gap-3">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-400/20 to-yellow-600/10 p-1.5 ring-1 ring-yellow-400/30 transition-transform group-hover:scale-105">
              <BrandLogo className="h-full w-full drop-shadow-[0_2px_10px_rgba(250,204,21,0.3)]" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white">
                Africa Live<span className="text-yellow-400">.</span>
              </span>
              <span className="hidden text-[10px] font-semibold tracking-wider text-yellow-400/80 uppercase sm:block">
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
            <Link href="#faq" className="hidden text-zinc-400 transition hover:text-white md:block">
              FAQ
            </Link>

            <div className="h-4 w-[1px] bg-white/10 hidden md:block" />

            {userId ? (
              <div className="flex items-center gap-3">
                {sessionClaims?.metadata?.role === 'admin' && (
                  <Link
                    href="/admin"
                    className="hidden rounded-lg border border-yellow-400/30 bg-yellow-400/10 px-3 py-1.5 text-xs font-bold text-yellow-300 transition hover:bg-yellow-400/20 sm:block"
                  >
                    Administration
                  </Link>
                )}
                <Link
                  href="/app"
                  className="rounded-xl bg-yellow-400 px-4 py-2 text-xs font-bold text-black shadow-lg shadow-yellow-400/20 transition hover:bg-yellow-300 sm:text-sm sm:px-5"
                >
                  Ouvrir le direct
                </Link>
                <UserButton />
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/sign-in"
                  className="px-3 py-2 text-sm font-medium text-zinc-300 transition hover:text-white"
                >
                  Se connecter
                </Link>
                <Link
                  href="/sign-up"
                  className="rounded-xl bg-yellow-400 px-4 py-2 text-xs font-bold text-black shadow-lg shadow-yellow-400/20 transition hover:bg-yellow-300 sm:text-sm sm:px-5"
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
            <div className="inline-flex items-center gap-2.5 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-4 py-1.5 text-xs font-semibold text-yellow-300 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span>DIRECT • 11 700+ chaînes référencées</span>
            </div>

            {/* Headline */}
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-[64px] lg:leading-[1.1]">
              L’Afrique et le monde{' '}
              <span className="text-gradient-gold">en direct</span>, sur tous vos écrans.
            </h1>

            {/* Subhead */}
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-300">
              Accédez à un vaste catalogue télévisuel panafricain. Information en direct,
              sports, divertissement, musiques et cultures régionales réunis dans une interface moderne et fluide.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href={userId ? '/app' : '/sign-up'}
                className="btn-gold inline-flex items-center gap-3 rounded-xl px-7 py-4 text-base font-black transition"
              >
                <span>{userId ? 'Accéder au direct' : 'Découvrir le catalogue'}</span>
                <ArrowRight size={18} />
              </Link>
              {!userId && (
                <Link
                  href="/sign-in"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-4 text-base font-semibold text-zinc-200 backdrop-blur-md transition hover:border-white/30 hover:bg-white/10 hover:text-white"
                >
                  <Sparkles size={18} className="text-yellow-400" />
                  <span>J’ai déjà un compte</span>
                </Link>
              )}
            </div>

            {/* Reassurance pills */}
            <div className="mt-8 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-zinc-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-emerald-400" /> Sans engagement
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-emerald-400" /> Compatible PC, Mobile & Tablettes
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-emerald-400" /> Intégration VLC en 1-clic
              </span>
            </div>
          </div>

          {/* Player Mockup Visual */}
          <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
            {/* Ambient halo behind mockup */}
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-yellow-500/20 via-emerald-500/10 to-amber-500/20 opacity-70 blur-2xl" />

            <div className="glass-panel-gold relative overflow-hidden rounded-2xl border border-yellow-400/30 p-1 shadow-2xl">
              {/* Window Bar */}
              <div className="flex items-center justify-between border-b border-white/10 bg-[#0c0d14] px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500/80" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                  <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                </div>
                <div className="flex items-center gap-2 rounded-md bg-white/5 px-3 py-1 text-[11px] font-mono text-zinc-400">
                  <Radio size={12} className="text-emerald-400 animate-pulse" />
                  <span>CRTV News • 1080p HLS Direct</span>
                </div>
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
              </div>

              {/* Mock Screen Content */}
              <div className="relative flex aspect-video w-full flex-col justify-between overflow-hidden rounded-b-xl bg-gradient-to-b from-zinc-900 to-black p-5">
                {/* Background Art with African Pattern Vibe */}
                <div className="absolute inset-0 opacity-20 [background:radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-yellow-500/40 via-transparent to-black" />

                {/* Top Player Badges */}
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded bg-red-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                      ● LIVE
                    </span>
                    <span className="rounded bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-zinc-300 backdrop-blur-md">
                      SOURCE DIRECTE
                    </span>
                  </div>
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-medium text-yellow-300 backdrop-blur-md">
                    🇨🇲 Cameroun
                  </span>
                </div>

                {/* Center Play Button Graphic */}
                <div className="relative z-10 flex flex-col items-center justify-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-400 text-black shadow-xl shadow-yellow-400/30 transition hover:scale-105">
                    <Play size={26} className="fill-current translate-x-0.5" />
                  </div>
                  <p className="text-xs font-medium tracking-wide text-zinc-300 drop-shadow">
                    Cliquez pour lancer le zapping
                  </p>
                </div>

                {/* Bottom Mock Channel Strip */}
                <div className="relative z-10 flex items-center justify-between rounded-lg bg-black/60 px-3 py-2 text-xs backdrop-blur-md border border-white/5">
                  <div className="flex items-center gap-2.5">
                    <div className="h-6 w-6 rounded bg-yellow-400/20 p-1 flex items-center justify-center">
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
        <section aria-label="Statistiques" className="border-y border-white/10 py-10 my-4">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {metrics.map(({ label, value, icon: Icon, detail }) => (
              <div
                key={label}
                className="group relative rounded-2xl border border-white/5 bg-white/[0.02] p-5 transition-all hover:border-yellow-400/30 hover:bg-white/[0.04]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-black tracking-tight text-yellow-400 sm:text-4xl">
                    {value}
                  </span>
                  <div className="rounded-lg bg-yellow-400/10 p-2 text-yellow-400 group-hover:scale-110 transition-transform">
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
            <h2 className="text-xs font-bold uppercase tracking-widest text-yellow-400">
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
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#090b10] p-6 transition-all duration-300 hover:border-yellow-400/50 hover:shadow-xl hover:shadow-yellow-500/5 hover:-translate-y-1"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-400/10 text-yellow-400 ring-1 ring-yellow-400/20 group-hover:bg-yellow-400 group-hover:text-black transition-colors">
                  <Icon size={24} />
                </div>
                <h3 className="mt-5 text-lg font-bold text-white">{name}</h3>
                <p className="text-xs font-semibold text-yellow-400/90 mt-1">{count}</p>
                <p className="mt-3 text-xs leading-5 text-zinc-400">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Feature Highlights Grid */}
        <section id="features" className="py-20 border-t border-white/10">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-xs font-bold uppercase tracking-widest text-yellow-400">
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
                className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-7 transition hover:border-white/20"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-400/15 text-yellow-400">
                    <Icon size={24} />
                  </div>
                  <span className="rounded-full bg-white/5 px-3 py-1 text-[11px] font-semibold text-zinc-400 border border-white/10">
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
          <div className="relative overflow-hidden rounded-3xl border border-yellow-400/30 bg-gradient-to-r from-yellow-500/10 via-[#0d1017] to-amber-500/10 p-8 sm:p-12">
            <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
              <div>
                <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-yellow-400">
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
                <div className="mt-6 flex flex-wrap gap-4">
                  <div className="flex items-center gap-2 rounded-xl bg-black/40 px-4 py-2.5 text-xs font-medium text-zinc-300 border border-white/10">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    Lecteur Web HLS intégré
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-black/40 px-4 py-2.5 text-xs font-medium text-zinc-300 border border-white/10">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    Export M3U & lien VLC 1-clic
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-black/40 px-4 py-2.5 text-xs font-medium text-zinc-300 border border-white/10">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    Zéro publicité injectée
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/60 p-6 backdrop-blur-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Options de visionnage</span>
                  <span className="text-[10px] rounded bg-emerald-500/20 text-emerald-400 px-2 py-0.5 font-bold">100% direct</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-yellow-400/40 bg-yellow-400/10 p-4 text-center">
                    <Tv size={28} className="mx-auto text-yellow-400" />
                    <p className="mt-2 text-sm font-bold text-white">Lecteur Navigateur</p>
                    <p className="mt-1 text-[11px] text-zinc-400">Instantané, aucun réglage</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
                    <ExternalLink size={28} className="mx-auto text-zinc-300" />
                    <p className="mt-2 text-sm font-bold text-white">VLC Media Player</p>
                    <p className="mt-1 text-[11px] text-zinc-400">1-clic vers l’app desktop</p>
                  </div>
                </div>
                <p className="text-[11px] text-center text-zinc-500">
                  Lecture web selon le format du flux, avec VLC conseillé sur ordinateur lorsque nécessaire.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Accordion Section */}
        <section id="faq" className="py-20 border-t border-white/10">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-xs font-bold uppercase tracking-widest text-yellow-400">
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
                className="group rounded-2xl border border-white/10 bg-white/[0.02] p-6 [&_summary::-webkit-details-marker]:none transition hover:border-yellow-400/30"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-4 font-bold text-white select-none">
                  <span className="text-base sm:text-lg">{q}</span>
                  <span className="rounded-full bg-white/5 p-1.5 text-zinc-400 group-open:rotate-180 group-open:text-yellow-400 transition-transform duration-200">
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
          <div className="relative overflow-hidden rounded-3xl border border-yellow-400/40 bg-gradient-to-b from-yellow-400/15 via-[#0b0d14] to-black p-10 text-center sm:py-16">
            <BrandLogo className="mx-auto h-20 w-20 drop-shadow-[0_4px_15px_rgba(250,204,21,0.4)]" />
            <h2 className="mt-6 text-3xl font-black text-white sm:text-5xl">
              Prêt à vivre la télévision autrement ?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-zinc-300">
              Rejoignez Africa Live et explorez plus de 11 700 chaînes réunies dans un catalogue simple à parcourir.
            </p>
            <div className="mt-8 flex justify-center">
              <Link
                href={userId ? '/app' : '/sign-up'}
                className="btn-gold inline-flex items-center gap-3 rounded-xl px-8 py-4 text-base font-black transition"
              >
                <span>{userId ? 'Ouvrir mon catalogue' : 'Commencer maintenant'}</span>
                <ArrowRight size={18} />
              </Link>
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
            <div className="flex flex-wrap gap-6 text-zinc-400">
              <Link href="#features" className="hover:text-white transition">Fonctionnalités</Link>
              <Link href="#categories" className="hover:text-white transition">Catégories</Link>
              <Link href="#faq" className="hover:text-white transition">FAQ</Link>
              <Link href={userId ? '/account' : '/sign-in'} className="hover:text-yellow-400 transition">
                {userId ? 'Mon compte' : 'Se connecter'}
              </Link>
            </div>
          </div>
          <div className="mt-8 flex flex-col sm:flex-row justify-between gap-2 border-t border-white/5 pt-6 text-[11px] text-zinc-600">
            <p>© {new Date().getFullYear()} Africa Live. Tous droits réservés.</p>
            <p>Diffusion directe depuis les sources publiques légitimes sans relais serveur.</p>
          </div>
        </footer>
      </div>
    </main>
  );
}
