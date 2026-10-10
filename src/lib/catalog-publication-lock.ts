import { sql } from 'drizzle-orm';
import type { db } from '@/db';
export async function lockCatalogPublication(tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) {
  // Acquire before row locks on both publication and takedown paths. No upstream download here.
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended('africa-live:catalog-publication', 0))`);
}
