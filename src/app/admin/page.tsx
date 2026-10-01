import Link from 'next/link';
import { redirect } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { getAdministratorAccess } from '@/lib/admin-access';
import AppNavigation, { AppBrand, NavigationProvider } from '@/components/AppNavigation';
import BrandWatermark from '@/components/BrandWatermark';
import AdminSupportQueue from '@/components/AdminSupportQueue';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const access = await getAdministratorAccess();
  if (!access.allowed) {
    if (access.reason === 'unauthenticated') {
      redirect('/sign-in?redirect_url=/admin');
    }
    redirect('/');
  }

  return (
    <main className="relative min-h-screen bg-black px-5 py-10 text-zinc-100 overflow-hidden">
      <BrandWatermark />

      <div className="relative z-10 mx-auto max-w-4xl">
        <nav className="mb-10 flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-5">
          <AppBrand />
          <NavigationProvider admin={true}><AppNavigation /></NavigationProvider>
          <UserButton />
        </nav>
        <section className="rounded-2xl border border-white/[0.08] bg-black/40 backdrop-blur-xl p-6 sm:p-10 shadow-xl shadow-black/40">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">Administration</p>
          <h1 className="mt-4 text-3xl font-black text-white">Bienvenue dans votre espace administrateur</h1>
          <p className="mt-5 text-sm leading-relaxed text-zinc-300">
            Votre rôle administrateur est confirmé par Clerk. Cet espace est réservé aux comptes administrateurs actifs.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Les demandes du formulaire Contact sont conservées ici. Les décisions de traitement et les désactivations de sources sont journalisées.
          </p>
          <Link
            href="/account"
            className="mt-8 inline-block rounded-xl border border-amber-400/40 bg-gradient-to-r from-emerald-500/20 via-amber-400/25 to-rose-500/20 hover:from-emerald-500/30 hover:via-amber-400/35 hover:to-rose-500/30 px-5 py-2.5 text-xs sm:text-sm font-bold text-amber-100 shadow-md backdrop-blur-md transition active:scale-[0.99]"
          >
            Mon compte
          </Link>
        </section>
        <AdminSupportQueue />
      </div>
    </main>
  );
}
