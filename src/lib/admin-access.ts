import 'server-only';

import { auth, currentUser } from '@clerk/nextjs/server';
import { authorizeAdministrator } from './admin-authorization';
import { ensureInternalUser } from './identity';
import { isLocalDevMode } from './local-dev';

import type { AppRole } from '@/types/globals';

export function getAdministratorAccess() {
  return authorizeAdministrator({
    localMode: isLocalDevMode(),
    getIdentity: async () => {
      const { userId, sessionClaims } = await auth();
      let sessionRole = sessionClaims?.metadata?.role;
      if (!sessionRole && userId) {
        const providerUser = await currentUser();
        if (providerUser && typeof providerUser.publicMetadata?.role === 'string') {
          sessionRole = providerUser.publicMetadata.role as AppRole;
        }
      }
      return { userId, sessionRole };
    },
    getProviderUser: currentUser,
    getInternalUser: ensureInternalUser,
  });
}
