import 'server-only';

import { getAdministratorAccess } from '@/lib/admin-access';
import { ForbiddenError, UnauthorizedError } from '@/lib/api-errors';

export async function requireAdminApiAccess() {
  const access = await getAdministratorAccess();
  if (!access.allowed) {
    if (access.reason === 'unauthenticated') throw new UnauthorizedError();
    throw new ForbiddenError('Réservé aux administrateurs actifs.', 'ADMIN_REQUIRED');
  }
  return access;
}
