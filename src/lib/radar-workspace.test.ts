import test from 'node:test';
import assert from 'node:assert/strict';
import { radarCountry, radarCountryUrl, effectiveSourceStatus, sourcePlaceholder, coverage, coverageSummary } from './radar-workspace';
import { escapeMapText, firmsObservationDate, normalizeDisasterLayer, normalizeFirmsLayer, validRadarPoint } from './radar-layers';

test('country URLs validate codes, preserve unrelated parameters and hash, and reset only country', () => {
  assert.equal(radarCountry(' sn '), 'SN'); assert.equal(radarCountry('ZZ'), null); assert.equal(radarCountry(''), null);
  assert.equal(radarCountryUrl('http://localhost:3001/app/live?mode=demo&country=SN#feed', 'CI'), '/app/live?mode=demo&country=CI#feed');
  assert.equal(radarCountryUrl('http://localhost:3001/app/live?country=SN&country=CI&mode=demo#feed', null), '/app/live?mode=demo#feed');
  assert.equal(radarCountryUrl('http://localhost:3001/app/live?mode=demo', 'unknown'), '/app/live?mode=demo');
});

test('source freshness uses each cache deadline, preserves empty success, and excludes dormant layers', () => {
  const now = Date.parse('2026-09-30T12:00:00Z');
  const base = { ...sourcePlaceholder('GDELT', 'Afrique', 'available'), lastSuccessAt: '2026-09-30T11:50:00Z', dataAt: '2026-09-29T12:00:00Z', cacheExpiresAt: '2026-09-30T12:05:00Z', count: 1 };
  assert.equal(effectiveSourceStatus(base, now), 'available');
  assert.equal(effectiveSourceStatus({ ...base, cacheExpiresAt: '2026-09-30T11:55:00Z' }, now), 'stale');
  assert.equal(coverageSummary([base, sourcePlaceholder('FIRMS', 'Afrique', 'not_requested')], now), 'Toutes les sources répondent');
  assert.match(coverageSummary([base, sourcePlaceholder('RSS', 'Afrique', 'not_configured')], now), /1 source momentanément muette/);
  assert.equal(coverageSummary([sourcePlaceholder('RSS', 'Afrique', 'unavailable')], now), 'Aucune source ne répond pour le moment');
});

test('invalid geometries are rejected without invented points; safe popup text and URLs', () => {
  assert.equal(firmsObservationDate('2026-09-30', '12:00 UTC'), '2026-09-30T12:00:00.000Z');
  assert.equal(firmsObservationDate('2026-09-30', '25:00 UTC'), null);
  assert.equal(firmsObservationDate(undefined, '12:00'), null);
  for (const coordinates of [null, [0], [0, 91], [181, 0], [NaN, 0], ['14', '-17']]) assert.equal(validRadarPoint({ type: 'Point', coordinates }), false);
  assert.equal(validRadarPoint({ type: 'Point', coordinates: [-17, 14] }), true);
  assert.equal(escapeMapText('<img src=x onerror="evil">'), '&lt;img src=x onerror=&quot;evil&quot;&gt;');
  const properties = { source: 'GDACS', severity: 'orange', sourceUrl: 'javascript:evil()', eventDate: 'invalid', eventType: 'flood', title: '<b>title</b>' };
  const result = normalizeDisasterLayer({ type: 'FeatureCollection', metadata: { updatedAt: '2026-09-30T12:00:00Z' }, features: [
    { type: 'Feature', geometry: { type: 'Point', coordinates: [-17, 14] }, properties },
    { type: 'Feature', geometry: null, properties },
  ] });
  assert.equal(result.data.features.length, 1); assert.equal(result.rejected, 1);
  assert.equal(result.data.features[0].properties.sourceUrl, ''); assert.equal(result.data.features[0].properties.eventDate, '');
  assert.throws(() => normalizeFirmsLayer({ type: 'FeatureCollection', features: [] }));
  const firms = normalizeFirmsLayer({ type: 'FeatureCollection', metadata: { updatedAt: '2026-09-30T12:00:00Z' }, features: [
    { geometry: { type: 'Point', coordinates: [20, 0] }, properties: { frp: 5, brightness: 320, confidence: 80 } },
    { geometry: { type: 'Point', coordinates: [20, 0] }, properties: { frp: -1, brightness: 320, confidence: 150 } },
  ] });
  assert.equal(firms.data.features.length, 1); assert.equal(firms.rejected, 1);
});

test('l’état d’ensemble des sources parle sans chiffres techniques ni jargon', () => {
  const now = Date.parse('2026-09-30T12:00:00Z');
  const ok = { ...sourcePlaceholder('Dépêches', 'Afrique', 'available'), cacheExpiresAt: '2026-09-30T12:05:00Z', count: 3 };
  const stale = { ...ok, cacheExpiresAt: '2026-09-30T11:55:00Z' };
  const down = sourcePlaceholder('Météo', 'SN', 'unavailable');
  assert.deepEqual(coverage([ok, ok], now), { level: 'ok', text: 'Toutes les sources répondent', short: 'Toutes les sources répondent' });
  assert.deepEqual(coverage([sourcePlaceholder('A', 'x', 'loading'), sourcePlaceholder('B', 'x', 'loading')], now), { level: 'loading', text: 'Chargement des sources…', short: 'Chargement des sources…' });
  assert.deepEqual(coverage([down, down, down, ok], now), { level: 'degraded', text: '3 sources momentanément muettes', short: '3 sources momentanément muettes' });
  assert.deepEqual(coverage([stale, ok], now), { level: 'degraded', text: '1 source aux données anciennes ou partielles', short: 'Certaines données sont un peu anciennes' });
  assert.deepEqual(coverage([down, stale, ok], now), { level: 'degraded', text: '1 source momentanément muette · 1 aux données anciennes ou partielles', short: '1 source momentanément muette' });
  assert.deepEqual(coverage([ok, sourcePlaceholder('B', 'x', 'loading')], now), { level: 'loading', text: 'chargement en cours', short: 'Chargement des sources…' });
  assert.equal(coverage([ok, sourcePlaceholder('FIRMS', 'x', 'not_requested')], now).text, 'Toutes les sources répondent');
  for (const text of [coverage([down, ok], now).text, coverage([stale, ok], now).text]) assert.doesNotMatch(text, /RSS|GDELT|cache|\d+\/\d+/i);
});
