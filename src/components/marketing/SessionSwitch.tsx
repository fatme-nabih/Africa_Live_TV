'use client';

import { useSyncExternalStore, type ReactNode } from 'react';
import { hasClerkSessionHint } from '@/lib/session-hint';

const noSubscription = () => () => {};

/**
 * Contenu selon la session, sur une page statique qui ne charge pas Clerk (landing, UX-601 / UX-603) : la version visiteur est
 * rendue d'abord (HTML statique), la version membre la remplace après hydratation si le cookie `__client_uat` indique une
 * connexion. Simple indice d'affichage : l'accès reste contrôlé par le middleware Clerk sur chaque route protégée.
 */
export default function SessionSwitch({ signedOut, signedIn }: { signedOut: ReactNode; signedIn: ReactNode }) {
  const signedInHint = useSyncExternalStore(noSubscription, () => hasClerkSessionHint(document.cookie), () => false);
  return <>{signedInHint ? signedIn : signedOut}</>;
}
