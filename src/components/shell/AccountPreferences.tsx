'use client';
import { useAuth } from '@clerk/nextjs';
import type { ReactNode } from 'react';
import { PreferenceOwnerProvider } from './PreferenceOwnerContext';
import { preferenceOwnerKey } from '@/lib/preference-contracts';
export type PreferenceIdentity = { userId: string; clerkUserId: string; local: boolean };
function AuthenticatedPreferences({ identity, children }: { identity: PreferenceIdentity; children: ReactNode }) {
  const auth = useAuth();
  const owner = auth.isLoaded && auth.userId === identity.clerkUserId ? preferenceOwnerKey(identity.userId) : null;
  return <PreferenceOwnerProvider owner={owner}>{children}</PreferenceOwnerProvider>;
}
export default function AccountPreferences({ identity, children }: { identity: PreferenceIdentity; children: ReactNode }) {
  return identity.local ? <PreferenceOwnerProvider owner={preferenceOwnerKey(identity.userId, true)}>{children}</PreferenceOwnerProvider> : <AuthenticatedPreferences identity={identity}>{children}</AuthenticatedPreferences>;
}
