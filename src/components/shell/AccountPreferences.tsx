'use client';
import { useI18n } from '@/i18n/client';
import EditionSwitcher from './EditionSwitcher';
import { useAuth } from '@clerk/nextjs';
import { useEffect, type ReactNode } from 'react';
import { PreferenceOwnerProvider } from './PreferenceOwnerContext';
import { preferenceOwnerKey } from '@/lib/preference-contracts';
import { accountEditionToApply, editionCookie, editionNavigationTarget } from '@/lib/edition-client';
import type { Edition } from '@/lib/editions';
/** `edition` : édition mémorisée dans le compte (EDI-603), lue côté serveur ; null si aucun choix enregistré. */
export type PreferenceIdentity = { userId: string; clerkUserId: string; local: boolean; edition?: Edition | null };
const EDITION_SYNC_KEY = 'al_edition_account_applied';
/**
 * Nouvel appareil (aucun cookie d'édition) : l'édition du compte s'applique une fois, par cookie et navigation complète.
 * Une seule tentative par session et par édition : un cookie refusé ne recharge jamais la page en boucle.
 */
function EditionPreferenceSync({ account }: { account: Edition | null }) {
  const { edition, enabled } = useI18n();
  useEffect(() => {
    const target = accountEditionToApply(account, edition, enabled, document.cookie);
    if (!target) return;
    try {
      if (sessionStorage.getItem(EDITION_SYNC_KEY) === target) return;
      sessionStorage.setItem(EDITION_SYNC_KEY, target);
    } catch { return; }
    document.cookie = editionCookie(target, window.location.protocol === 'https:');
    window.location.replace(editionNavigationTarget(window.location.href, target));
  }, [account, edition, enabled]);
  return null;
}
function AuthenticatedPreferences({ identity, children }: { identity: PreferenceIdentity; children: ReactNode }) {
  const auth = useAuth();
  const owner = auth.isLoaded && auth.userId === identity.clerkUserId ? preferenceOwnerKey(identity.userId) : null;
  return <PreferenceOwnerProvider owner={owner}>{owner && <EditionPreferenceSync account={identity.edition ?? null} />}{children}</PreferenceOwnerProvider>;
}
export default function AccountPreferences({ identity, children }: { identity: PreferenceIdentity; children: ReactNode }) {
  return identity.local ? <PreferenceOwnerProvider owner={preferenceOwnerKey(identity.userId, true)}><EditionPreferenceSync account={identity.edition ?? null} />{children}</PreferenceOwnerProvider> : <AuthenticatedPreferences identity={identity}>{children}</AuthenticatedPreferences>;
}

export function EditionPreferences() {
  const { t, enabled } = useI18n();
  if (enabled.length < 2) return null;
  return <section className="mt-6 rounded-control border border-line bg-surface-2 p-4"><h2 className="font-semibold">{t.shell.edition.title}</h2><p className="my-2 text-xs text-text-muted">{t.shell.edition.description}</p><EditionSwitcher inline /><p className="mt-2 text-xs text-text-muted">{t.shell.edition.savedInAccount}</p></section>;
}
