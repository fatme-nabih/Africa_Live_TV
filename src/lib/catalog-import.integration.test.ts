import assert from 'node:assert/strict';
import test from 'node:test';

import { count, eq } from 'drizzle-orm';

import { db, pool } from '@/db';
import { catalogImports, channels, playbackEvents, streams, userFavorites } from '@/db/schema';

import { runCatalogImport } from './catalog-import';

const integrationEnabled = process.env.CATALOG_INTEGRATION_TEST === '1';
const expectedDatabaseMarker = '_l2_catalog_test';

const firstPlaylist = `#EXTM3U
#EXTINF:-1 tvg-id="Lot2One.fr" group-title="Test",Lot 2 One
https://lot2.test/one.m3u8
#EXTINF:-1 tvg-id="Lot2Two.sn" group-title="Test",Lot 2 Two
https://lot2.test/two.m3u8
`;

const changedPlaylist = `${firstPlaylist}#EXTINF:-1 tvg-id="Lot2Three.us" group-title="Test",Lot 2 Three
https://lot2.test/three.m3u8
`;

async function tableCount(table: typeof channels | typeof streams | typeof userFavorites | typeof playbackEvents) {
  const result = await db.select({ value: count() }).from(table);
  return result[0]?.value ?? 0;
}

test(
  'catalog publication is atomic, idempotent and preserves user data',
  { skip: !integrationEnabled },
  async () => {
    const databaseUrl = new URL(process.env.DATABASE_URL || '');
    assert.match(databaseUrl.pathname, new RegExp(`${expectedDatabaseMarker}$`));

    try {
      const favoritesBefore = await tableCount(userFavorites);
      const eventsBefore = await tableCount(playbackEvents);

      const totalsBeforeDryRun = {
        channels: await tableCount(channels),
        streams: await tableCount(streams),
        imports: (
          await db.select({ value: count() }).from(catalogImports)
        )[0]?.value,
      };
      const dryRunReport = await runCatalogImport({
        source: 'integration-fixture-dry-run',
        content: firstPlaylist,
        dryRun: true,
      });
      assert.equal(dryRunReport.importId, null);
      assert.deepEqual(
        {
          channels: await tableCount(channels),
          streams: await tableCount(streams),
          imports: (
            await db.select({ value: count() }).from(catalogImports)
          )[0]?.value,
        },
        totalsBeforeDryRun,
      );

      const firstReport = await runCatalogImport({
        source: 'integration-fixture',
        content: firstPlaylist,
      });
      assert.equal(firstReport.channels.added, 2);
      assert.equal(firstReport.streams.added, 2);

      const totalsAfterFirst = {
        channels: await tableCount(channels),
        streams: await tableCount(streams),
      };
      const activeAfterFirst = {
        channels: (
          await db.select({ value: count() }).from(channels).where(eq(channels.active, true))
        )[0]?.value,
        streams: (
          await db.select({ value: count() }).from(streams).where(eq(streams.active, true))
        )[0]?.value,
      };
      assert.deepEqual(activeAfterFirst, { channels: 2, streams: 2 });

      const firstActiveStream = (
        await db.select({ id: streams.id }).from(streams).where(eq(streams.active, true)).limit(1)
      )[0];
      assert.ok(firstActiveStream);
      await db
        .update(streams)
        .set({
          status: 'BROWSER_OK',
          verificationState: 'HEALTHY',
          lastCheckedAt: new Date().toISOString(),
        })
        .where(eq(streams.id, firstActiveStream.id));

      const secondReport = await runCatalogImport({
        source: 'integration-fixture',
        content: firstPlaylist,
      });
      assert.equal(secondReport.channels.added, 0);
      assert.equal(secondReport.channels.updated, 0);
      assert.equal(secondReport.streams.added, 0);
      assert.equal(secondReport.streams.updated, 0);
      const preservedStream = (
        await db
          .select({ status: streams.status, verificationState: streams.verificationState })
          .from(streams)
          .where(eq(streams.id, firstActiveStream.id))
      )[0];
      assert.deepEqual(preservedStream, {
        status: 'BROWSER_OK',
        verificationState: 'HEALTHY',
      });
      assert.deepEqual(
        {
          channels: await tableCount(channels),
          streams: await tableCount(streams),
        },
        totalsAfterFirst,
      );
      assert.deepEqual(
        {
          channels: (
            await db.select({ value: count() }).from(channels).where(eq(channels.active, true))
          )[0]?.value,
          streams: (
            await db.select({ value: count() }).from(streams).where(eq(streams.active, true))
          )[0]?.value,
        },
        { channels: 2, streams: 2 },
      );

      await assert.rejects(
        runCatalogImport({
          source: 'integration-fixture-failure',
          content: changedPlaylist,
          beforePublish: () => {
            throw new Error('SIMULATED_MID_PUBLICATION_FAILURE');
          },
        }),
        /SIMULATED_MID_PUBLICATION_FAILURE/,
      );

      assert.deepEqual(
        {
          channels: await tableCount(channels),
          streams: await tableCount(streams),
        },
        totalsAfterFirst,
      );
      assert.deepEqual(
        {
          channels: (
            await db.select({ value: count() }).from(channels).where(eq(channels.active, true))
          )[0]?.value,
          streams: (
            await db.select({ value: count() }).from(streams).where(eq(streams.active, true))
          )[0]?.value,
        },
        { channels: 2, streams: 2 },
      );
      assert.equal(await tableCount(userFavorites), favoritesBefore);
      assert.equal(await tableCount(playbackEvents), eventsBefore);

      const failedImport = await db
        .select({ status: catalogImports.status })
        .from(catalogImports)
        .where(eq(catalogImports.source, 'integration-fixture-failure'));
      assert.equal(failedImport.at(-1)?.status, 'FAILED');
    } finally {
      await pool.end();
    }
  },
);
