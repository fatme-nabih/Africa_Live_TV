import assert from 'node:assert/strict';
import test from 'node:test';

import { articleShare, channelShare, isShareableUrl, whatsappHref } from './share-links';

const decode = (href: string) => decodeURIComponent(href.split('?text=')[1]);

test('le partage d’une chaîne contient le titre et le lien du lecteur Africa Live, rien d’autre', () => {
  const share = channelShare({ name: ' RTS 1 ', id: 'rts-1', origin: 'https://staging.africatv.sn/' })!;
  assert.equal(share.url, 'https://staging.africatv.sn/player/rts-1');
  assert.equal(decode(share.href), 'Regarde RTS 1 en direct sur Africa Live : https://staging.africatv.sn/player/rts-1');
  assert.ok(share.href.startsWith('https://wa.me/?text='));
});

test('l’identifiant de chaîne est encodé dans l’adresse', () => {
  const share = channelShare({ name: 'Test', id: 'a b/c?d', origin: 'https://africatv.sn' })!;
  assert.equal(share.url, 'https://africatv.sn/player/a%20b%2Fc%3Fd');
});

test('le partage d’une dépêche garde accents et retours à la ligne, avec la rédaction et l’origine', () => {
  const share = articleShare({ title: 'Sénégal : la Teranga récompensée', sourceName: 'APS', articleUrl: 'https://aps.sn/article?id=7', origin: 'https://africatv.sn' })!;
  assert.equal(decode(share.href), 'Sénégal : la Teranga récompensée (APS)\nhttps://aps.sn/article?id=7\nVia Africa Live : https://africatv.sn');
  assert.ok(share.href.includes('%0A'));
});

test('jamais d’URL de flux média : un lien vers une liste ou un fichier média est refusé', () => {
  for (const url of ['https://flux.example/live/index.m3u8', 'https://flux.example/a.mpd?token=1', 'https://cdn.example/seg.ts', 'https://cdn.example/clip.mp4#t=1']) {
    assert.equal(isShareableUrl(url), false, url);
    assert.equal(articleShare({ title: 'x', articleUrl: url, origin: 'https://africatv.sn' }), null);
  }
  assert.equal(isShareableUrl('https://aps.sn/actualites/une-page.html'), true);
});

test('les protocoles non web et les identifiants dans l’adresse sont refusés', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,x', 'ftp://example.org/a', 'https://user:pass@example.org/a', 'pas une url']) {
    assert.equal(isShareableUrl(url), false, url);
  }
});

test('le message est borné pour tenir dans un lien WhatsApp', () => {
  const text = decode(whatsappHref('x'.repeat(5_000)));
  assert.equal(text.length, 1_000);
  assert.ok(text.endsWith('…'));
});
