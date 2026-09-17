import Link from 'next/link';
import { redirect } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { getAdministratorAccess } from '@/lib/admin-access';

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
    <main className="min-h-screen bg-black px-5 py-10 text-zinc-100">
      <div className="mx-auto max-w-4xl">
        <nav className="mb-10 flex items-center justify-between gap-4">
          <Link href="/app" className="text-sm font-bold text-yellow-300">Africa Live</Link>
          <UserButton />
        </nav>
        <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 sm:p-10">
          <p className="text-xs font-bold uppercase tracking-widest text-yellow-300">Administration</p>
          <h1 className="mt-4 text-3xl font-black">Bienvenue dans votre espace administrateur</h1>
          <p className="mt-5 leading-7 text-zinc-400">
            Votre rôle administrateur est confirmé par Clerk. Cet espace est réservé aux comptes administrateurs actifs.
          </p>
          <p className="mt-4 leading-7 text-zinc-400">
            Les outils de gestion du catalogue et des utilisateurs seront ajoutés ici.
            L’accès aux chaînes conserve les règles d’abonnement de l’application.
          </p>
          <Link href="/account" className="mt-8 inline-block rounded-lg bg-yellow-400 px-4 py-2 font-bold text-black">Mon compte</Link>
        </section>
      </div>
    </main>
  );
}
