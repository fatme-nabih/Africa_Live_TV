type Identity = { userId: string | null; sessionRole: unknown };
type ProviderUser = {
  id: string;
  publicMetadata: { role?: unknown };
  banned: boolean;
  locked: boolean;
};

export type AdminAuthorizationDependencies = {
  localMode: boolean;
  getIdentity: () => Promise<Identity>;
  getProviderUser: () => Promise<ProviderUser | null>;
  getInternalUser: (userId: string) => Promise<{ status: string }>;
};

// No subscription bypass: this decision applies only to administration.
export async function authorizeAdministrator(deps: AdminAuthorizationDependencies) {
  if (deps.localMode) return { allowed: false as const, reason: 'local_mode' };
  const identity = await deps.getIdentity();
  if (!identity.userId) return { allowed: false as const, reason: 'unauthenticated' };
  if (identity.sessionRole !== 'admin') {
    return { allowed: false as const, reason: 'forbidden' };
  }

  // Recheck the provider so a stale session cannot preserve a revoked role.
  // Provider/database failures propagate; they never grant access.
  const user = await deps.getProviderUser();
  if (!user || user.id !== identity.userId || user.banned || user.locked ||
      user.publicMetadata.role !== 'admin') {
    return { allowed: false as const, reason: 'forbidden' };
  }
  const internal = await deps.getInternalUser(identity.userId);
  if (internal.status !== 'active') {
    return { allowed: false as const, reason: 'forbidden' };
  }
  return { allowed: true as const, userId: identity.userId };
}
