import assert from 'node:assert/strict';
import test from 'node:test';
import {
  _clearLiveChannelsCache,
  getAfricanChannelsSummary,
  getChannelsForAfricanCountry,
  type LiveChannelsDb,
} from './live-channels';

function createMockDb(options: {
  summaryRows?: Array<{ countryCode: string | null; channelCount: number; directWebCount: number }>;
  channelRows?: Array<{ id: string; name: string; logoUrl: string | null; groupTitle: string | null; countryCode: string | null }>;
  streamRows?: Array<{ channelId: string; url: string; status: string; verificationState: string; directEligibility: string; lastSuccessAt: string | null }>;
} = {}): LiveChannelsDb {
  const mockQueryBuilder = {
    from: () => mockQueryBuilder,
    innerJoin: () => mockQueryBuilder,
    where: () => mockQueryBuilder,
    groupBy: () => Promise.resolve(options.summaryRows ?? []),
    orderBy: () => mockQueryBuilder,
    limit: () => Promise.resolve(options.channelRows ?? []),
    then: (resolve: (val: unknown) => void) => {
      resolve(options.streamRows ?? []);
    },
  };

  return {
    select: () => mockQueryBuilder,
  } as unknown as LiveChannelsDb;
}

test('getAfricanChannelsSummary aggregates counts, calculates totals, and caches results', async () => {
  _clearLiveChannelsCache();

  const mockDb = createMockDb({
    summaryRows: [
      { countryCode: 'SN', channelCount: 3, directWebCount: 2 },
      { countryCode: 'CI', channelCount: 5, directWebCount: 4 },
      { countryCode: 'NG', channelCount: 12, directWebCount: 8 },
    ],
  });

  const summary = await getAfricanChannelsSummary(mockDb);

  assert.ok(summary);
  assert.strictEqual(summary.totalChannels, 20);
  assert.strictEqual(summary.totalDirectWeb, 14);
  assert.deepStrictEqual(summary.countries.SN, {
    countryCode: 'SN',
    channelCount: 3,
    directWebCount: 2,
  });
  assert.deepStrictEqual(summary.countries.CI, {
    countryCode: 'CI',
    channelCount: 5,
    directWebCount: 4,
  });
  assert.strictEqual(summary.countries.NG.channelCount, 12);

  // Cached call: returns exact same instance without querying DB again
  const failingDb = createMockDb({
    summaryRows: undefined,
  });
  const cached = await getAfricanChannelsSummary(failingDb);
  assert.strictEqual(cached, summary);
  assert.strictEqual(cached.totalChannels, 20);
});

test('getAfricanChannelsSummary coalesces concurrent requests', async () => {
  _clearLiveChannelsCache();

  let callCount = 0;
  const mockDb = {
    select: () => {
      callCount++;
      return {
        from: () => ({
          innerJoin: () => ({
            where: () => ({
              groupBy: () =>
                new Promise((resolve) => {
                  setTimeout(
                    () =>
                      resolve([
                        { countryCode: 'SN', channelCount: 4, directWebCount: 3 },
                      ]),
                    10,
                  );
                }),
            }),
          }),
        }),
      };
    },
  } as unknown as LiveChannelsDb;

  const [res1, res2, res3] = await Promise.all([
    getAfricanChannelsSummary(mockDb),
    getAfricanChannelsSummary(mockDb),
    getAfricanChannelsSummary(mockDb),
  ]);

  assert.strictEqual(res1, res2);
  assert.strictEqual(res2, res3);
  assert.strictEqual(callCount, 1);
});

test('getChannelsForAfricanCountry retrieves and enriches channels for a country', async () => {
  _clearLiveChannelsCache();

  const nowIso = new Date().toISOString();
  const mockDb = createMockDb({
    channelRows: [
      { id: 'ch-sn-1', name: 'RTS 1', logoUrl: 'https://logos/rts1.png', groupTitle: 'Généraliste', countryCode: 'SN' },
      { id: 'ch-sn-2', name: '2sTV', logoUrl: 'https://logos/2stv.png', groupTitle: 'Généraliste', countryCode: 'SN' },
    ],
    streamRows: [
      {
        channelId: 'ch-sn-1',
        url: 'https://streams.sn/rts1.m3u8',
        status: 'BROWSER_OK',
        verificationState: 'HEALTHY',
        directEligibility: 'PUBLIC_DIRECT_WEB',
        lastSuccessAt: nowIso,
      },
      {
        channelId: 'ch-sn-2',
        url: 'https://streams.sn/2stv.m3u8',
        status: 'VLC_ONLY',
        verificationState: 'HEALTHY',
        directEligibility: 'PUBLIC_DIRECT_VLC',
        lastSuccessAt: nowIso,
      },
    ],
  });

  const result = await getChannelsForAfricanCountry('sn', true, 20, mockDb);

  assert.strictEqual(result.countryCode, 'SN');
  assert.strictEqual(result.countryName, 'Sénégal');
  assert.strictEqual(result.canPlay, true);
  assert.strictEqual(result.channels.length, 2);

  const rts1 = result.channels.find((c) => c.id === 'ch-sn-1');
  assert.ok(rts1);
  assert.strictEqual(rts1.name, 'RTS 1');
  assert.strictEqual(rts1.playbackMode, 'BROWSER');
  assert.strictEqual(rts1.availabilityStatus, 'READY');

  const twostv = result.channels.find((c) => c.id === 'ch-sn-2');
  assert.ok(twostv);
  assert.strictEqual(twostv.playbackMode, 'EXTERNAL');
  assert.strictEqual(twostv.availabilityStatus, 'READY');

  // Verify caching for country queries
  const cachedResult = await getChannelsForAfricanCountry('SN', true, 20);
  assert.strictEqual(cachedResult.countryCode, 'SN');
  assert.strictEqual(cachedResult.channels.length, 2);
});

test('getChannelsForAfricanCountry handles empty country results gracefully', async () => {
  _clearLiveChannelsCache();

  const emptyMockDb = createMockDb({
    channelRows: [],
    streamRows: [],
  });

  const result = await getChannelsForAfricanCountry('KM', false, 20, emptyMockDb);

  assert.strictEqual(result.countryCode, 'KM');
  assert.strictEqual(result.countryName, 'Comores');
  assert.strictEqual(result.canPlay, false);
  assert.strictEqual(result.channels.length, 0);
  assert.strictEqual(result.total, 0);
});
