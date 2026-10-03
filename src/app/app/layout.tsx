import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

import { getCurrentAccessDecision } from '@/lib/access-control';
import { canBrowseCatalog } from '@/lib/access-policy';
import { getAdministratorAccess } from '@/lib/admin-access';
import AppShell from '@/components/shell/AppShell';

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
  return <AppShell admin={admin.allowed}>{children}</AppShell>;
}
