import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildChannelLanguageIndex,
  parseLanguageCodes,
  resolveChannelLanguage,
  serializeLanguageCodes,
} from './channel-language';

test('language codes are normalized, deduplicated and serialized', () => {
  assert.equal(serializeLanguageCodes([' FRA ', 'eng', 'fra', 'invalid value']), 'eng;fra');
  assert.deepEqual(parseLanguageCodes('spa;eng;spa'), ['eng', 'spa']);
  assert.equal(serializeLanguageCodes(''), null);
});

test('IPTV-org feed metadata resolves exact and channel-level languages', () => {
  const index = buildChannelLanguageIndex([
    { channel: 'NewsOne.fr', id: 'SD', languages: ['fra'] },
    { channel: 'NewsOne.fr', id: 'INT', languages: ['eng', 'fra'] },
    { channel: 'MusicOne.es', id: 'SD', languages: ['spa'] },
    { channel: null, id: 'invalid', languages: ['eng'] },
  ]);

  assert.equal(resolveChannelLanguage('NewsOne.fr@SD', index), 'fra');
  assert.equal(resolveChannelLanguage('NewsOne.fr@INT', index), 'eng;fra');
  assert.equal(resolveChannelLanguage('NewsOne.fr@UNKNOWN', index), 'eng;fra');
  assert.equal(resolveChannelLanguage('MusicOne.es', index), 'spa');
  assert.equal(resolveChannelLanguage(null, index), null);
});

test('invalid or unbounded language metadata is rejected', () => {
  assert.throws(
    () => buildChannelLanguageIndex({}),
    /INVALID_CHANNEL_LANGUAGE_METADATA/,
  );
  assert.throws(
    () => buildChannelLanguageIndex(new Array(100_001).fill(null)),
    /INVALID_CHANNEL_LANGUAGE_METADATA/,
  );
});
