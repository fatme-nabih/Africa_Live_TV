import assert from 'node:assert/strict';
import test from 'node:test';

import {
  convertToFirmsGeoJson,
  parseFirmsCsv,
} from '@/lib/live-firms';

test('parseFirmsCsv filters coordinates to the African bounding box', () => {
  const sampleCsv = `latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,confidence,version,bright_t31,frp,daynight
-28.86483,-58.81096,300.38,1.48,1.2,2026-09-29,0033,T,80,6.1NRT,288.29,6.22,N
14.6928,-17.4467,325.5,1.1,1.0,2026-09-29,1345,T,75,6.1NRT,295.1,28.4,D
-4.4419,15.2663,338.2,1.2,1.1,2026-09-29,1410,T,90,6.1NRT,301.2,45.8,D
48.8566,2.3522,305.0,1.0,1.0,2026-09-29,1120,T,60,6.1NRT,290.0,12.0,D`;

  const { hotspots, totalAfricaCount } = parseFirmsCsv(sampleCsv, { minConfidence: 50 });

  // Only Dakar (14.69, -17.44) and Kinshasa (-4.44, 15.26) are in Africa.
  // South America (-28.86, -58.81) and Paris (48.85, 2.35) are excluded.
  assert.equal(totalAfricaCount, 2);
  assert.equal(hotspots.length, 2);

  // Highest FRP should be sorted first (45.8 > 28.4)
  assert.equal(hotspots[0].latitude, -4.4419);
  assert.equal(hotspots[0].frp, 45.8);
  assert.equal(hotspots[0].acqTime, '14:10 UTC');
  assert.equal(hotspots[0].dayNight, 'D');

  assert.equal(hotspots[1].latitude, 14.6928);
  assert.equal(hotspots[1].frp, 28.4);
});

test('parseFirmsCsv respects minConfidence and limit options', () => {
  const sampleCsv = `latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,confidence,version,bright_t31,frp,daynight
12.0,10.0,310.0,1.0,1.0,2026-09-29,1200,T,30,6.1NRT,290.0,10.0,D
13.0,11.0,320.0,1.0,1.0,2026-09-29,1205,T,60,6.1NRT,295.0,20.0,D
14.0,12.0,330.0,1.0,1.0,2026-09-29,1210,T,85,6.1NRT,300.0,35.0,D`;

  // minConfidence: 50 should filter out the 30% confidence fire
  const res = parseFirmsCsv(sampleCsv, { minConfidence: 50, limit: 1 });
  assert.equal(res.totalAfricaCount, 3);
  assert.equal(res.hotspots.length, 1);
  assert.equal(res.hotspots[0].confidence, 85);
});

test('convertToFirmsGeoJson formats valid GeoJSON FeatureCollection', () => {
  const hotspots = [
    {
      id: 1,
      latitude: 14.6928,
      longitude: -17.4467,
      brightness: 325.5,
      frp: 28.4,
      confidence: 75,
      acqDate: '2026-09-29',
      acqTime: '13:45 UTC',
      dayNight: 'D' as const,
    },
  ];

  const geoJson = convertToFirmsGeoJson(hotspots, 1, false);

  assert.equal(geoJson.type, 'FeatureCollection');
  assert.equal(geoJson.metadata.totalDetections, 1);
  assert.equal(geoJson.metadata.stale, false);
  assert.equal(geoJson.features.length, 1);

  const feature = geoJson.features[0];
  assert.equal(feature.type, 'Feature');
  assert.equal(feature.geometry.type, 'Point');
  assert.deepEqual(feature.geometry.coordinates, [-17.4467, 14.6928]);
  assert.equal(feature.properties.frp, 28.4);
  assert.equal(feature.properties.time, '13:45 UTC');
});
