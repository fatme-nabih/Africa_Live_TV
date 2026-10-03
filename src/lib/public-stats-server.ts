import { and, count, eq } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';

import { db } from '@/db';
import { channels } from '@/db/schema';
import { catalogHasVisibleStream } from './catalog-visibility';
import { publicCatalogChannelCondition } from './public-catalog-visibility';
import { summarizePublicStats, type PublicStats } from './public-stats';

const loadPublicStats = unstable_cache(
  async (): Promise<PublicStats> => {
    const rows = await db
      .select({ countryCode: channels.countryCode, groupTitle: channels.groupTitle, count: count() })
      .from(channels)
      .where(and(eq(channels.active, true), publicCatalogChannelCondition(), catalogHasVisibleStream()))
      .groupBy(channels.countryCode, channels.groupTitle);
    return summarizePublicStats(rows);
  },
  ['public-stats-v1'],
  { revalidate: 3600, tags: ['public-stats'] },
);

/** Chiffres de la landing (cache d'une heure). En cas d'échec : null, la page n'affiche alors aucun chiffre. */
export async function getPublicStats(): Promise<PublicStats | null> {
  try {
    const stats = await loadPublicStats();
    return stats.totalChannels > 0 ? stats : null;
  } catch {
    return null;
  }
}
