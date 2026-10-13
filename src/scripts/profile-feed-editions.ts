/** Réception EDI-209 : collectes amont réelles, hors CI. Aucun média ni donnée privée écrit. */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { getRadarRss, clearRssCacheForTesting } from '../lib/rss-collector';
import { getWorldDesk, clearWorldCacheForTesting } from '../lib/world-desk';
import { EDITION_IDS } from '../lib/editions';

async function main() {
  const rows = [];
  for (const edition of EDITION_IDS) {
    clearRssCacheForTesting(); clearWorldCacheForTesting();
    const before = process.memoryUsage(), started = performance.now();
    const rss = await getRadarRss({ edition }), rssMs = performance.now() - started;
    const world = await getWorldDesk({ edition }), totalMs = performance.now() - started;
    const after = process.memoryUsage();
    const row = { edition, rssMs: Math.round(rssMs), worldMs: Math.round(totalMs - rssMs), totalMs: Math.round(totalMs),
      articles: { rss: rss.articles.length, undated: rss.undatedArticles?.length ?? 0, world: world.articles.length },
      availability: [...rss.availability ?? [], ...world.availability].reduce<Record<string, number>>((counts, source) => { counts[source.status] = (counts[source.status] ?? 0) + 1; return counts; }, {}),
      memory: { before, after, heapDeltaBytes: after.heapUsed - before.heapUsed, rssDeltaBytes: after.rss - before.rss } };
    rows.push(row); console.log(JSON.stringify(row));
  }
  const folder = path.join('.local-logs', 'editions-e2'); mkdirSync(folder, { recursive: true });
  writeFileSync(path.join(folder, 'profile-feeds.json'), JSON.stringify({ at: new Date().toISOString(), node: process.version, note: 'Mémoire avant/après, sans forcer le GC ; delta observé, pas pic absolu.', rows }, null, 2));
}
main().catch(() => { console.error('PROFILE_FEEDS_FAILED'); process.exitCode = 1; });
