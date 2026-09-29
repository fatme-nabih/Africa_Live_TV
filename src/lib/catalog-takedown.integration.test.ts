import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';

import { db, pool } from '@/db';
import { streams, supportRequests } from '@/db/schema';
import { runCatalogImport } from './catalog-import';
import { assertIntegrationTarget } from './integration-test-safety';

const integrationEnabled = process.env.CATALOG_INTEGRATION_TEST === '1';

test(
  'future catalog imports keep sources covered by an active removal request disabled',
  { skip: !integrationEnabled },
  async () => {
    await assertIntegrationTarget(pool);
    try {
      const name = `Takedown fixture ${randomUUID()}`;
      const sourceUrl = 'https://takedown-fixture.example/live.m3u8';
      const content = `#EXTM3U\n#EXTINF:-1 tvg-id="${randomUUID()}.sn",${name}\n${sourceUrl}\n`;
      await db.insert(supportRequests).values({
        id: randomUUID(),
        name: 'Fixture',
        email: 'fixture@example.test',
        subject: 'removal',
        message: 'Integration fixture request',
        channelName: name,
        sourceUrl,
        status: 'sources_disabled',
      });

      const report = await runCatalogImport({ source: 'integration-fixture-takedown', content });
      assert.equal(report.streams.added, 1);
      const imported = await db.select({ active: streams.active, eligibilityReason: streams.eligibilityReason })
        .from(streams).where(eq(streams.url, sourceUrl));
      assert.deepEqual(imported, [{ active: false, eligibilityReason: 'TAKEDOWN_REQUEST' }]);
    } finally {
      await pool.end();
    }
  },
);
