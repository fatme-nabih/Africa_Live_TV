import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canonicalizeStreamUrl,
  supportRequestAdminActionSchema,
  supportRequestSubmissionSchema,
} from './support-request-contracts';

test('removal requests require a channel name and normalize contact details', () => {
  assert.equal(supportRequestSubmissionSchema.safeParse({
    name: 'Awa Diop',
    email: 'Awa@example.com',
    subject: 'removal',
    message: 'Merci de retirer cette source.',
    channelName: '',
  }).success, false);

  const parsed = supportRequestSubmissionSchema.parse({
    name: ' Awa Diop ',
    email: ' Awa@Example.com ',
    subject: 'removal',
    message: 'Merci de retirer cette source.',
    channelName: ' TV Exemple ',
    sourceUrl: 'https://media.example/live.m3u8?token=secret#fragment',
  });
  assert.equal(parsed.name, 'Awa Diop');
  assert.equal(parsed.email, 'awa@example.com');
  assert.equal(parsed.channelName, 'TV Exemple');
  assert.equal(parsed.sourceUrl, 'https://media.example/live.m3u8');
});

test('reported source URLs reject credentials and unsupported protocols', () => {
  for (const sourceUrl of [
    'ftp://media.example/live.m3u8',
    'https://user:password@media.example/live.m3u8',
    'javascript:alert(1)',
  ]) {
    assert.equal(supportRequestSubmissionSchema.safeParse({
      name: 'Awa',
      email: 'awa@example.com',
      subject: 'removal',
      message: 'Signalement',
      channelName: 'TV Exemple',
      sourceUrl,
    }).success, false);
  }
});

test('administrator decisions require an audit note and only remove the reported source', () => {
  assert.equal(supportRequestAdminActionSchema.safeParse({ action: 'close_no_action' }).success, false);
  assert.equal(supportRequestAdminActionSchema.safeParse({ action: 'disable_reported_sources', note: 'URL non correspondante' }).success, true);
  assert.equal(canonicalizeStreamUrl('https://media.example/live.m3u8?token=changed'), 'https://media.example/live.m3u8');
  assert.equal(canonicalizeStreamUrl('not a url'), null);
});
