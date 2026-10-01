import Link from 'next/link';
import { Tv, Home, HelpCircle } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import BrandWatermark from '@/components/BrandWatermark';

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-black px-4 py-16 text-zinc-100 selection:bg-amber-400 selection:text-black">
      <BrandWatermark />

      <div className="relative z-10 mx-auto flex max-w-lg flex-col items-center text-center">
        {/* Logo and signal badge */}
        <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-400/10 p-3 border border-amber-400/30 shadow-2xl shadow-black/60 backdrop-blur-md">
          <BrandLogo className="h-full w-full drop-shadow-[0_2px_12px_rgba(250,204,21,0.3)]" />
        </div>

        {/* 404 live tag */}
        <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-rose-400 backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
          </span>
          <span>Erreur 404 • Signal introuvable</span>
        </div>

        {/* Heading */}
        <h1 className="mt-6 text-3xl font-black tracking-tight text-white sm:text-5xl">
          Page hors antenne
        </h1>

        <p className="mt-3 text-xs sm:text-sm leading-relaxed text-zinc-400">
          Le programme, la chaîne ou l&apos;adresse demandée n&apos;existe pas ou a été déplacé.
          Vérifiez l&apos;URL ou reprenez votre navigation dans le direct.
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/app/live"
            className="inline-flex items-center gap-2 rounded-xl border border-amber-400/40 bg-gradient-to-r from-emerald-500/20 via-amber-400/25 to-rose-500/20 hover:from-emerald-500/30 hover:via-amber-400/35 hover:to-rose-500/30 px-5 py-2.5 text-xs sm:text-sm font-bold text-amber-100 shadow-md backdrop-blur-md transition active:scale-[0.99]"
          >
            <Tv size={15} />
            <span>Ouvrir le dashboard</span>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs sm:text-sm font-medium text-zinc-200 backdrop-blur-md transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
          >
            <Home size={15} />
            <span>Accueil</span>
          </Link>

          <Link
            href="/contact"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-transparent px-3.5 py-2.5 text-xs font-medium text-zinc-400 transition hover:text-zinc-200 hover:border-white/15"
          >
            <HelpCircle size={14} />
            <span>Besoin d&apos;aide ?</span>
          </Link>
        </div>

        {/* Decorative mini status bar */}
        <div className="mt-12 flex items-center gap-2 rounded-lg border border-white/[0.08] bg-black/40 backdrop-blur-md px-3.5 py-1.5 text-[11px] font-mono text-zinc-500">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span>AFRICA LIVE • STAGING & PROD COMPATIBLE</span>
        </div>
      </div>
    </main>
  );
}
