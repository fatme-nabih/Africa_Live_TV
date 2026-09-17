import 'server-only';

import { auth, currentUser } from '@clerk/nextjs/server';
import { authorizeAdministrator } from './admin-authorization';
import { ensureInternalUser } from './identity';
import { isLocalDevMode } from './local-dev';

export function getAdministratorAccess() {
  return authorizeAdministrator({
    localMode: isLocalDevMode(),
    getIdentity: async () => {
      const { userId, sessionClaims } = await auth();
      return { userId, sessionRole: sessionClaims?.metadata?.role };
    },
    getProviderUser: currentUser,
    getInternalUser: ensureInternalUser,
  });
}
