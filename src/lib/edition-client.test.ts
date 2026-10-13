import assert from 'node:assert/strict';
import test from 'node:test';
import { editionApiUrl, editionCookie, editionNavigationTarget, editionStorageKey } from './edition-client';
import { countryName, editionCountries } from './country-names';
import { EDITION_AFFINITY, editionLanguageRank } from './edition-affinity';
import { AFRICAN_COUNTRIES } from './radar-countries';
import { orderCountryGrid } from './country-grid';
import { weatherText } from './weather-text';
import { getDictionary } from '@/i18n/dictionary';
import { fr } from '@/i18n/fr';
import { en } from '@/i18n/en';
import { editionForex } from './edition-markets';
import { catalogCursorContext, decodeCatalogCursor, encodeCatalogCursor } from './catalog-query';
import { searchCacheForEdition } from './search-articles-cache';

test('EDI-301/302: adresses et clés FR compatibles, EN isolé ; retour à la même page et conservation des paramètres', () => {
  assert.equal(editionApiUrl('/api/live/rss', 'fr'), '/api/live/rss');
  assert.equal(editionApiUrl('/api/live/world?refresh=true', 'en'), '/api/live/world?refresh=true&edition=en');
  assert.equal(editionStorageKey('al_radar_visit', 'fr'), 'al_radar_visit');
  assert.equal(editionStorageKey('al_radar_visit', 'en'), 'al_radar_visit:en');
  assert.equal(editionNavigationTarget('http://localhost:3001/app/live?country=CI#wire', 'en'), '/app/live?country=CI#wire');
  assert.equal(editionNavigationTarget('http://localhost:3001/en/pricing?x=1', 'fr'), '/pricing?x=1');
  assert.equal(editionNavigationTarget('http://localhost:3001/?x=1', 'en'), '/en?x=1');
  assert.equal(editionCookie('en', true), 'al_edition=en; Path=/; Max-Age=31536000; SameSite=Lax; Secure');
  assert.notEqual(searchCacheForEdition('fr'), searchCacheForEdition('en'));
  assert.equal(searchCacheForEdition('en'), searchCacheForEdition('en'));
});
test('EDI-303: dictionnaire anglais complet, gabarits conservés et offres en FCFA identiques', () => {
  assert.equal(getDictionary('en'), en);
  let messages = 0;
  const compare = (a: unknown, b: unknown) => {
    if (typeof a === 'string') {
      assert.equal(typeof b, 'string');
      const variables = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
      assert.deepEqual(variables(a), variables(b as string)); messages++; return;
    }
    assert.ok(b && typeof b === 'object');
    assert.deepEqual(Object.keys(a as object), Object.keys(b as object));
    for (const key of Object.keys(a as object)) compare((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]);
  };
  compare(fr, en); assert.ok(messages > 900);
  assert.equal(en.shell.nav.account, 'Account'); assert.equal(en.radar.header.title, 'Africa Radar');
  assert.equal(en.pricing.plans.monthly.price, fr.pricing.plans.monthly.price);
  assert.equal(en.pricing.plans.annual.price.replace(/[, ]/g, ''), fr.pricing.plans.annual.price.replace(/[, ]/g, ''));
  assert.match(en.pricing.paymentCaption, /international bank card.*Senegal.*WAEMU/);
});
test('EDI-304: noms neutres, affinités complètes, pays suivis puis défaut EN ; aucun pays ou langue écarté', () => {
  assert.equal(countryName('CD', 'en'), 'DR Congo'); assert.equal(countryName('CG', 'en'), 'Republic of the Congo');
  assert.equal(countryName('EH', 'en'), 'Western Sahara');
  assert.deepEqual(Object.keys(EDITION_AFFINITY).sort(), AFRICAN_COUNTRIES.map(c => c.code).sort());
  assert.equal(editionCountries('en').length, AFRICAN_COUNTRIES.length);
  const countries = [{ code: 'NG', name: 'Nigeria' }, { code: 'ZA', name: 'South Africa' }, { code: 'CI', name: 'Ivory Coast' }];
  const grid = orderCountryGrid(countries, { NG: { channelCount: 1 }, ZA: { channelCount: 20 }, CI: { channelCount: 2 } }, ['CI'], 'en');
  assert.deepEqual([...grid.pinned, ...grid.others].map(c => c.code), ['CI', 'NG', 'ZA']);
  assert.equal(editionLanguageRank('eng', 'en'), 0); assert.equal(editionLanguageRank('fra', 'en'), 1);
});
test('EDI-304: le curseur est lié à la préférence linguistique, sans changer les anciens contextes FR', () => {
  const input = { userId: 'owner', clerkSessionId: 'session', search: '', country: 'NG', group: '', language: '', status: '', favoritesOnly: false };
  const legacy = catalogCursorContext(input), english = catalogCursorContext({ ...input, preferredLanguage: 'en' });
  assert.equal(catalogCursorContext({ ...input, preferredLanguage: undefined }), legacy); assert.notEqual(english, legacy);
  const cursor = encodeCatalogCursor({ id: 'one', name: 'One', rank: 0 }, english);
  assert.deepEqual(decodeCatalogCursor(cursor, english), { id: 'one', name: 'One', rank: 0 });
  assert.throws(() => decodeCatalogCursor(cursor, legacy), /INVALID_CATALOG_CURSOR/);
});
test('EDI-305: mêmes taux, paniers propres aux éditions, météo traduite par code avec repli inconnu', () => {
  const forex = ['EUR / XOF', 'USD / XOF', 'USD / NGN', 'USD / GHS', 'USD / KES', 'USD / ZAR', 'USD / DZD', 'USD / MAD', 'USD / TND', 'USD / EGP'].map(pair => ({ pair, base: pair.split(' / ')[0], quote: pair.split(' / ')[1], rate: 10, label: '', source: '', isPegged: false, updatedAt: '' }));
  assert.deepEqual(editionForex(forex, 'en').map(f => f.quote), ['NGN', 'GHS', 'KES', 'ZAR']);
  assert.deepEqual(editionForex(forex, 'ar').map(f => f.quote), ['DZD', 'MAD', 'TND', 'EGP']);
  assert.equal(editionForex(forex, 'fr').length, 2); assert.equal(forex.length, 10);
  const condition = { source: 'Open-Meteo' as const, weatherCode: 95, weatherDescription: 'Texte historique' };
  assert.equal(weatherText(condition, 'fr'), 'Texte historique');
  assert.equal(weatherText(condition, 'en', en.weather.conditions), 'Thunderstorm');
  assert.equal(weatherText({ ...condition, weatherCode: 999 }, 'en', en.weather.conditions), 'Unknown conditions');
  assert.equal(weatherText({ ...condition, source: 'wttr.in', weatherCode: 113 }, 'en', en.weather.conditions), 'Clear sky');
});
