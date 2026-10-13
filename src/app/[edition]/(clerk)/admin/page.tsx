import { redirect } from 'next/navigation';
import { getAdministratorAccess } from '@/lib/admin-access';
import AppShell from '@/components/shell/AppShell';
import BrandBackdrop from '@/components/brand/BrandBackdrop';
import AdminSupportQueue from '@/components/AdminSupportQueue';
import { ButtonLink } from '@/components/ui';

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
    <AppShell admin>
    <main className="relative flex-1 bg-black px-5 py-10 text-text overflow-hidden">
      <BrandBackdrop variant="quiet" />

      <div className="relative z-10 mx-auto max-w-4xl">
        <section className="rounded-2xl border border-line bg-surface-1/80 p-6 sm:p-10 shadow-xl shadow-black/40">
          <p className="text-xs font-semibold uppercase tracking-widest text-al-gold">Administration</p>
          <h1 className="font-display mt-4 text-2xl font-bold text-balance text-text sm:text-3xl">Bienvenue dans votre espace administrateur</h1>
          <p className="mt-5 text-sm leading-relaxed text-text">
            Votre rôle administrateur est confirmé par Clerk. Cet espace est réservé aux comptes administrateurs actifs.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-text-muted">
            Les demandes du formulaire Contact sont conservées ici. Les décisions de traitement et les désactivations de sources sont journalisées.
          </p>
          <ButtonLink href="/account" variant="primary" className="mt-8">
            Mon compte
          </ButtonLink>
        </section>
        <AdminSupportQueue />
      </div>
    </main>
    </AppShell>
  );
}
