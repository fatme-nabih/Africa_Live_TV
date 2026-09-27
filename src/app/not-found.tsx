import Link from 'next/link';
import { Tv, Home, HelpCircle } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#020408] px-4 py-16 text-zinc-100 selection:bg-yellow-400 selection:text-black">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-yellow-500/15 via-emerald-500/10 to-transparent blur-[140px]" />
      <div className="pointer-events-none absolute bottom-0 right-1/4 -z-10 h-[400px] w-[400px] rounded-full bg-red-500/5 blur-[120px]" />

      <div className="mx-auto flex max-w-lg flex-col items-center text-center">
        {/* Logo and signal badge */}
        <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-yellow-400/10 p-3 ring-1 ring-yellow-400/30 shadow-2xl shadow-yellow-400/10">
          <BrandLogo className="h-full w-full drop-shadow-[0_2px_12px_rgba(250,204,21,0.4)]" />
        </div>

        {/* 404 live tag */}
        <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-red-400">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
          <span>Erreur 404 • Signal introuvable</span>
        </div>

        {/* Heading */}
        <h1 className="mt-6 text-4xl font-black tracking-tight text-white sm:text-5xl">
          Page hors antenne
        </h1>

        <p className="mt-4 text-sm leading-relaxed text-zinc-400 sm:text-base">
          Le programme, la chaîne ou l&apos;adresse demandée n&apos;existe pas ou a été déplacé.
          Vérifiez l&apos;URL ou reprenez votre navigation dans le direct.
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          <Link
            href="/app"
            className="inline-flex items-center gap-2.5 rounded-xl bg-yellow-400 px-6 py-3 text-xs font-black text-black shadow-lg shadow-yellow-400/20 transition hover:bg-yellow-300 sm:text-sm"
          >
            <Tv size={16} />
            <span>Ouvrir le direct</span>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-xs font-semibold text-zinc-200 backdrop-blur-md transition hover:border-white/25 hover:bg-white/10 hover:text-white sm:text-sm"
          >
            <Home size={16} />
            <span>Page d&apos;accueil</span>
          </Link>

          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-xl border border-white/5 bg-transparent px-4 py-3 text-xs font-medium text-zinc-400 transition hover:text-zinc-200"
          >
            <HelpCircle size={15} />
            <span>Besoin d&apos;aide ?</span>
          </Link>
        </div>

        {/* Decorative mini status bar */}
        <div className="mt-12 flex items-center gap-2 rounded-lg border border-white/5 bg-black/40 px-3.5 py-1.5 text-[11px] font-mono text-zinc-500">
          <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse" />
          <span>AFRICA LIVE • STAGING & PROD COMPATIBLE</span>
        </div>
      </div>
    </main>
  );
}
