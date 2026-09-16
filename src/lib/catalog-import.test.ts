import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCatalogDraft } from './catalog-import';

const playlist = `#EXTM3U
#EXTINF:-1 tvg-id="NewsOne.fr" tvg-logo="https://img.test/news.png" group-title="News" lang="fra",News One (1080p)
https://media.test/news/index.m3u8
#EXTINF:-1 tvg-id="NewsOne.fr" group-title="News",News One duplicate
https://media.test/news/index.m3u8
#EXTINF:-1 group-title="Sports",Sport Plus
http://media.test/sport/index.m3u8
`;

test('buildCatalogDraft creates stable ids and deduplicates stream URLs', () => {
  const first = buildCatalogDraft(playlist);
  const second = buildCatalogDraft(playlist);

  assert.equal(first.channels.length, 2);
  assert.equal(first.streams.length, 2);
  assert.equal(first.duplicateUrls, 1);
  assert.deepEqual(
    first.channels.map((channel) => channel.channelId),
    second.channels.map((channel) => channel.channelId),
  );
  assert.deepEqual(
    first.streams.map((stream) => stream.streamId),
    second.streams.map((stream) => stream.streamId),
  );
  assert.equal(first.channels[0]?.name, 'News One');
  assert.equal(first.channels[0]?.countryCode, 'FR');
  assert.equal(first.channels[0]?.language, 'fra');
  assert.equal(first.streams[1]?.mixedContent, true);
});

test('buildCatalogDraft rejects unsupported stream protocols without aborting the import', () => {
  const draft = buildCatalogDraft(`#EXTM3U
#EXTINF:-1,Unsupported
rtsp://media.test/live
#EXTINF:-1,Supported
https://media.test/live.m3u8
`);

  assert.equal(draft.channels.length, 1);
  assert.equal(draft.streams.length, 1);
  assert.equal(draft.errors.length, 1);
  assert.match(draft.errors[0] ?? '', /protocole non pris en charge/);
});

test('buildCatalogDraft rejects embedded stream credentials without exposing them', () => {
  const draft = buildCatalogDraft(`#EXTM3U
#EXTINF:-1,Private
https://user:password@media.test/live.m3u8
#EXTINF:-1,Public
https://media.test/live.m3u8
`);

  assert.equal(draft.channels.length, 1);
  assert.equal(draft.streams.length, 1);
  assert.equal(draft.errors.length, 1);
  assert.match(draft.errors[0] ?? '', /identifiants intégrés interdits/);
  assert.doesNotMatch(draft.errors[0] ?? '', /user|password|media\.test/);
});
