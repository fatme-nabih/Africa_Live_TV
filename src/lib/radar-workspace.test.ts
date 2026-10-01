import test from 'node:test';
import assert from 'node:assert/strict';
import { radarCountry, radarCountryUrl, effectiveSourceStatus, sourcePlaceholder, coverageSummary } from './radar-workspace';
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
  assert.equal(coverageSummary([base, sourcePlaceholder('FIRMS', 'Afrique', 'not_requested')], now), 'Sources disponibles · 1 sources');
  assert.match(coverageSummary([base, sourcePlaceholder('RSS', 'Afrique', 'not_configured')], now), /partielle/);
  assert.equal(coverageSummary([sourcePlaceholder('RSS', 'Afrique', 'unavailable')], now), 'Sources indisponibles');
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
