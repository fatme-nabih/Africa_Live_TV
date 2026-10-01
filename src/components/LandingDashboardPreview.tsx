import Link from 'next/link';
import { ArrowRight, Globe2, Newspaper, Radar, Tv } from 'lucide-react';

export default function LandingDashboardPreview({ href }: { href: string }) {
  return (
    <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
      <div className="pointer-events-none absolute -inset-4 rounded-3xl bg-gradient-to-r from-emerald-500/15 via-amber-500/10 to-rose-500/10 blur-2xl" />
      <div className="relative overflow-hidden rounded-2xl border border-emerald-300/20 bg-[#080e0b] shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <span className="flex items-center gap-2 text-sm font-bold text-white"><Radar className="h-4 w-4 text-emerald-300" />Dashboard Africa Live</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Aperçu</span>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-[1fr_0.9fr]">
          <div className="relative flex min-h-52 flex-col items-center justify-center overflow-hidden rounded-xl border border-emerald-300/15 bg-emerald-300/[0.04] p-4">
            <div aria-hidden="true" className="absolute h-44 w-44 rounded-full border border-emerald-300/10" />
            <div aria-hidden="true" className="absolute h-32 w-32 rounded-full border border-emerald-300/15" />
            <Globe2 aria-hidden="true" className="relative h-20 w-20 text-emerald-300/75" strokeWidth={0.75} />
            <p className="relative mt-5 text-sm font-bold text-emerald-100">Explorer l’Afrique</p>
            <p className="relative mt-1 text-center text-xs text-zinc-400">Pays, médias et chaînes sur la carte</p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <Newspaper aria-hidden="true" className="mb-3 h-5 w-5 text-emerald-300" />
              <p className="text-sm font-bold text-white">Suivre l’actualité</p>
              <p className="mt-1 text-xs leading-5 text-zinc-400">Dépêches, sources et contexte par pays.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <Tv aria-hidden="true" className="mb-3 h-5 w-5 text-amber-300" />
              <p className="text-sm font-bold text-white">Voir le direct</p>
              <p className="mt-1 text-xs leading-5 text-zinc-400">L’app TV à portée de main depuis le dashboard.</p>
            </div>
          </div>
        </div>
        <Link href={href} className="flex items-center justify-between gap-3 border-t border-white/10 px-5 py-4 text-sm font-bold text-emerald-200 transition hover:bg-emerald-300/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-300">
          Découvrir le dashboard<ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
