import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

import { getCurrentAccessDecision } from '@/lib/access-control';
import { canBrowseCatalog } from '@/lib/access-policy';
import { getAdministratorAccess } from '@/lib/admin-access';
import AppShell from '@/components/shell/AppShell';
import { PlayerDockProvider } from '@/components/player/PlayerDock';
import UniversalSearch from '@/components/search/UniversalSearch';
import { I18nProvider } from '@/i18n/client';
import { getEdition } from '@/i18n/edition';
import { clientMessages } from '@/i18n/server';
import { enabledEditions, isEdition } from '@/lib/editions';

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
  const edition = await getEdition();
  // Le lecteur unique vit dans le layout : il continue quand on passe du Radar à la TV (UX-501) ; Ctrl K ouvre la recherche universelle (UX-502).
  return (
    <I18nProvider edition={edition} enabled={enabledEditions()} messages={clientMessages(edition, ['radar', 'time', 'briefing', 'markets', 'weather', 'world'])}>
      <AppShell admin={admin.allowed} preferenceIdentity={{ userId: user.id, clerkUserId: user.clerkUserId, local: decision.reason === 'local_development', edition: isEdition(user.preferredEdition) ? user.preferredEdition : null }}>
        <PlayerDockProvider><UniversalSearch />{children}</PlayerDockProvider>
      </AppShell>
    </I18nProvider>
  );
}
