import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import RichText from '@/components/marketing/RichText';
import { en } from '@/i18n/en';
import { ar } from '@/i18n/ar';
import { fr } from '@/i18n/fr';
import { editionRootMetadata, publicPageMetadata } from '@/i18n/metadata';
import { editionHref, editionLinkPrefetch } from './edition-routing';
import { preferredEdition } from './edition-client';
import { articleShare, channelShare } from './share-links';

function withEditions<T>(value: string | undefined, run: () => T): T {
  const previous = process.env.EDITIONS;
  if (value === undefined) delete process.env.EDITIONS; else process.env.EDITIONS = value;
  try { return run(); } finally { if (previous === undefined) delete process.env.EDITIONS; else process.env.EDITIONS = previous; }
}

test('EDI-501: liens par édition — français inchangé, pages publiques préfixées, espace connecté par préfixe mémorisé', () => {
  for (const href of ['/', '/cgu', '/sign-in', '#faq', '/api/live/rss', 'https://example.org/x']) assert.equal(editionHref(href, 'fr'), href);
  assert.equal(editionHref('/', 'en'), '/en');
  assert.equal(editionHref('/cgu', 'ar'), '/ar/cgu');
  assert.equal(editionHref('/pricing?plan=annual#top', 'en'), '/en/pricing?plan=annual#top');
  assert.equal(editionHref('/sign-in', 'ar'), '/ar/sign-in');
  assert.equal(editionHref('/player/rts-1', 'en'), '/en/player/rts-1');
  for (const href of ['#faq', '/api/live/rss', '/favicon.ico', '//cdn.example.org/x', 'https://example.org/x']) assert.equal(editionHref(href, 'ar'), href);
  // Un lien préfixé vers l'espace connecté pose le cookie d'édition : jamais préchargé, sinon la simple visite de /en changerait l'édition.
  for (const href of ['/en/sign-in', '/ar/account?x=1', '/en/app/live#top', '/ar/player/rts-1']) assert.equal(editionLinkPrefetch(href), false, href);
  for (const href of ['/sign-in', '/en', '/en/cgu', '/ar/pricing', '/fr/sign-in', '#faq', 'https://example.org']) assert.equal(editionLinkPrefetch(href), undefined, href);
});

test('EDI-501: métadonnées — FR identique et sans hreflang en FR seul ; canonique et versions des éditions actives', () => {
  const root = { title: 'Africa Live — Le live qui vient à vous', description: 'FR' };
  assert.equal(editionRootMetadata('fr', root), root, 'le français garde exactement ses métadonnées');
  assert.deepEqual(withEditions(undefined, () => publicPageMetadata('fr', '/')), {});
  assert.deepEqual(withEditions('fr', () => publicPageMetadata('fr', '/cgu', { title: fr.legal.cgu.metaTitle, description: fr.legal.cgu.metaDescription })),
    { title: fr.legal.cgu.metaTitle, description: fr.legal.cgu.metaDescription });
  const english = withEditions('fr,en,ar', () => publicPageMetadata('en', '/cgu', { title: en.legal.cgu.metaTitle, description: en.legal.cgu.metaDescription }));
  assert.deepEqual(english.alternates, { canonical: '/en/cgu', languages: { fr: '/cgu', en: '/en/cgu', ar: '/ar/cgu', 'x-default': '/cgu' } });
  assert.deepEqual((english.openGraph as { images: { url: string }[] }).images.map(image => image.url), ['/og-image-en.png']);
  const french = withEditions('fr,en', () => publicPageMetadata('fr', '/'));
  assert.deepEqual(french.alternates, { canonical: '/', languages: { fr: '/', en: '/en', 'x-default': '/' } }, 'une édition inactive n’est jamais annoncée');
  const arabic = editionRootMetadata('ar', root);
  assert.equal(arabic.title, 'Africa Live — البث المباشر يأتي إليك');
  assert.deepEqual((arabic.openGraph as { images: { url: string }[] }).images.map(image => image.url), ['/og-image-ar.png']);
});

test('EDI-502: partage — texte et lien de l’édition, français identique', () => {
  const origin = 'https://staging.africatv.sn';
  assert.equal(channelShare({ name: 'RTS 1', id: 'rts-1', origin })!.text, 'Regarde RTS 1 en direct sur Africa Live : https://staging.africatv.sn/player/rts-1');
  const english = channelShare({ name: 'RTS 1', id: 'rts-1', origin }, 'en', en.share.messages)!;
  assert.equal(english.text, 'Watch RTS 1 live on Africa Live: https://staging.africatv.sn/en/player/rts-1');
  assert.equal(english.title, 'RTS 1 live on Africa Live');
  const arabic = channelShare({ name: 'RTS 1', id: 'rts-1', origin }, 'ar', ar.share.messages)!;
  assert.equal(arabic.url, 'https://staging.africatv.sn/ar/player/rts-1');
  assert.match(arabic.text, /^شاهد RTS 1 مباشرة على Africa Live: /);
  const article = { title: 'Titre', sourceName: 'APS', articleUrl: 'https://aps.sn/a', origin: 'https://africatv.sn/' };
  assert.equal(articleShare(article)!.text, 'Titre (APS)\nhttps://aps.sn/a\nVia Africa Live : https://africatv.sn');
  assert.equal(articleShare(article, 'en', en.share.messages)!.text, 'Titre (APS)\nhttps://aps.sn/a\nVia Africa Live: https://africatv.sn/en');
  assert.equal(articleShare(article, 'ar', ar.share.messages)!.url, 'https://aps.sn/a', 'l’article reste chez l’éditeur');
});

test('EDI-503: suggestion — première langue du navigateur parmi les éditions actives, sans édition inactive', () => {
  assert.equal(preferredEdition(['en-GB', 'fr'], ['fr', 'en', 'ar']), 'en');
  assert.equal(preferredEdition(['ar-DZ'], ['fr', 'en', 'ar']), 'ar');
  assert.equal(preferredEdition(['ar-DZ', 'fr-FR'], ['fr', 'en']), 'fr', 'arabe inactif : on passe à la langue suivante');
  assert.equal(preferredEdition(['es-ES', 'pt'], ['fr', 'en', 'ar']), null);
  assert.equal(preferredEdition(['fr-SN'], ['fr', 'en']), 'fr');
});

test('EDI-501/504: texte enrichi — même balisage que l’ancien JSX, valeurs jamais interprétées, liens de l’édition', () => {
  const render = (text: string, edition: 'fr' | 'ar', values?: Record<string, string>) =>
    renderToStaticMarkup(createElement(RichText, { text, edition, values, linkClassName: 'l' }));
  assert.equal(render('**Africa Live** est une application', 'fr'), '<strong>Africa Live</strong> est une application');
  assert.equal(render('le formulaire de [contact](/contact).', 'fr'), 'le formulaire de <a class="l" href="/contact">contact</a>.');
  assert.equal(render('نموذج [الاتصال](/contact).', 'ar'), 'نموذج <a class="l" href="/ar/contact">الاتصال</a>.');
  assert.equal(render('stockage (`localStorage`) local', 'fr'), 'stockage (<code>localStorage</code>) local');
  assert.equal(render('Merci **{name}**.', 'fr', { name: '**x** [a](/b)' }), 'Merci <strong>**x** [a](/b)</strong>.');
  assert.match(ar.legal.frenchPrevails, /الفرنسي/);
  assert.match(en.legal.frenchPrevails, /French version/);
});
