import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

import { getCurrentAccessDecision } from '@/lib/access-control';
import { canBrowseCatalog } from '@/lib/access-policy';
import { getAdministratorAccess } from '@/lib/admin-access';
import AppShell from '@/components/shell/AppShell';
import { PlayerDockProvider } from '@/components/player/PlayerDock';
import UniversalSearch from '@/components/search/UniversalSearch';

export const metadata: Metadata = {
  title: 'Africa Live — Catalogue unifié',
};

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, decision } = await getCurrentAccessDecision();

  if (!user) {
    redirect('/sign-in?redirect_url=/app/live');
  }

  if (!canBrowseCatalog(decision)) {
    redirect('/account?access=required');
  }

  const admin = await getAdministratorAccess();
  // Le lecteur unique vit dans le layout : il continue quand on passe du Radar à la TV (UX-501) ; Ctrl K ouvre la recherche universelle (UX-502).
  return <AppShell admin={admin.allowed} preferenceIdentity={{ userId: user.id, clerkUserId: user.clerkUserId, local: decision.reason === 'local_development' }}><PlayerDockProvider><UniversalSearch />{children}</PlayerDockProvider></AppShell>;
}
