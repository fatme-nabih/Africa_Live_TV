import { sql } from 'drizzle-orm';

import { channels } from '@/db/schema';

const CANAL_PLUS_NAME_PATTERN =
  '(^|[^[:alnum:]])canal[[:space:]]*([+]|plus)([^[:alnum:]]|$)';

/** Canal+ stays in the source catalog but is excluded from public catalog responses. */
export function publicCatalogChannelCondition() {
  return sql`${channels.normalizedName} !~* ${CANAL_PLUS_NAME_PATTERN}`;
}
