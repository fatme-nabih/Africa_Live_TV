import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';
import type { Edition } from './editions';

/**
 * Édition mémorisée dans le compte (EDI-603, option A : colonne additive `users.preferred_edition`).
 * Seule cette colonne change : ni `updated_at`, ni l'identité Clerk, ni les droits.
 */
export async function savePreferredEdition(userId: string, edition: Edition): Promise<Edition> {
  const [row] = await db.update(users).set({ preferredEdition: edition }).where(eq(users.id, userId)).returning({ preferredEdition: users.preferredEdition });
  if (!row) throw new Error('USER_NOT_FOUND');
  return edition;
}
