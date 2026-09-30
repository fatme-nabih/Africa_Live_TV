import assert from 'node:assert/strict';
import test from 'node:test';

import {
  convertToDisastersGeoJson,
  deduplicateEvents,
  isWithinAfrica,
  parseGdacsRss,
  parseUsgsEarthquakes,
} from '@/lib/live-disasters';
import type { DisasterEvent } from '@/lib/live-disasters-types';

test('isWithinAfrica validates coordinates against African continental bounds', () => {
  // Dakar, Senegal (14.69, -17.44) -> true
  assert.equal(isWithinAfrica(14.69, -17.44), true);
  // Nairobi, Kenya (-1.29, 36.82) -> true
  assert.equal(isWithinAfrica(-1.29, 36.82), true);
  // Cape Town, South Africa (-33.92, 18.42) -> true
  assert.equal(isWithinAfrica(-33.92, 18.42), true);
  // Paris, France (48.85, 2.35) -> false (too north)
  assert.equal(isWithinAfrica(48.85, 2.35), false);
  // Tokyo, Japan (35.67, 139.65) -> false (too east)
  assert.equal(isWithinAfrica(35.67, 139.65), false);
  // New York, USA (40.71, -74.00) -> false (too west)
  assert.equal(isWithinAfrica(40.71, -74.0), false);
});

test('parseUsgsEarthquakes parses and filters earthquakes in Africa', () => {
  const sampleGeojson = {
    features: [
      {
        id: 'usgs-africa-1',
        properties: {
          mag: 5.6,
          place: '25 km SSW of Homa Bay, Kenya',
          time: 1727700000000,
          url: 'https://earthquake.usgs.gov/earthquakes/eventpage/usgs1',
          title: 'M 5.6 - 25 km SSW of Homa Bay, Kenya',
        },
        geometry: {
          coordinates: [34.5, -0.6, 10.0], // [lon, lat, depth]
        },
      },
      {
        id: 'usgs-indonesia-1',
        properties: {
          mag: 6.2,
          place: 'Sulawesi, Indonesia',
          time: 1727700000000,
          url: 'https://earthquake.usgs.gov/earthquakes/eventpage/usgs2',
          title: 'M 6.2 - Sulawesi, Indonesia',
        },
        geometry: {
          coordinates: [120.0, -1.0, 20.0],
        },
      },
    ],
  };

  const events = parseUsgsEarthquakes(sampleGeojson);

  assert.equal(events.length, 1);
  assert.equal(events[0].id, 'usgs-africa-1');
  assert.equal(events[0].magnitude, 5.6);
  assert.equal(events[0].depthKm, 10);
  assert.equal(events[0].severity, 'red'); // Mag >= 5.5 is red alert
  assert.equal(events[0].eventType, 'earthquake');
  assert.equal(events[0].source, 'USGS');
});

test('parseGdacsRss parses natural disaster alerts from GeoRSS XML', () => {
  const sampleXml = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:gdacs="http://www.gdacs.org" xmlns:georss="http://www.georss.org/georss">
  <channel>
    <item>
      <title>Orange flood alert in Mozambique</title>
      <description>Heavy flooding along the Zambezi river valley</description>
      <link>https://www.gdacs.org/report.aspx?eventtype=FL&amp;eventid=2001</link>
      <pubDate>Wed, 30 Sep 2026 10:00:00 GMT</pubDate>
      <guid>FL2001</guid>
      <georss:point>-18.5 35.8</georss:point>
      <gdacs:eventtype>FL</gdacs:eventtype>
      <gdacs:alertlevel>Orange</gdacs:alertlevel>
      <gdacs:country>Mozambique</gdacs:country>
      <gdacs:iso3>MOZ</gdacs:iso3>
    </item>
    <item>
      <title>Green flood in Australia</title>
      <georss:point>-25.0 135.0</georss:point>
      <gdacs:eventtype>FL</gdacs:eventtype>
      <gdacs:alertlevel>Green</gdacs:alertlevel>
    </item>
  </channel>
</rss>`;

  const events = parseGdacsRss(sampleXml);

  assert.equal(events.length, 1); // Australia item is excluded
  assert.equal(events[0].id, 'gdacs-FL2001');
  assert.equal(events[0].eventType, 'flood');
  assert.equal(events[0].severity, 'orange');
  assert.equal(events[0].countryName, 'Mozambique');
  assert.equal(events[0].latitude, -18.5);
  assert.equal(events[0].longitude, 35.8);
});

test('deduplicateEvents merges matching earthquakes within close distance', () => {
  const usgsEvent: DisasterEvent = {
    id: 'usgs-1',
    source: 'USGS',
    eventType: 'earthquake',
    title: 'M 5.2 - East African Rift, Kenya',
    latitude: -0.5,
    longitude: 36.0,
    magnitude: 5.2,
    severity: 'orange',
    eventDate: '2026-09-30T12:00:00.000Z',
    sourceUrl: 'https://earthquake.usgs.gov',
  };

  const gdacsEvent: DisasterEvent = {
    id: 'gdacs-1',
    source: 'GDACS',
    eventType: 'earthquake',
    title: 'Earthquake in Kenya',
    latitude: -0.52,
    longitude: 36.05,
    magnitude: 5.1,
    severity: 'orange',
    eventDate: '2026-09-30T12:05:00.000Z',
    sourceUrl: 'https://gdacs.org',
  };

  const merged = deduplicateEvents([usgsEvent, gdacsEvent]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].source, 'USGS');
});

test('convertToDisastersGeoJson builds valid FeatureCollection with disclaimer', () => {
  const events: DisasterEvent[] = [
    {
      id: 'usgs-1',
      source: 'USGS',
      eventType: 'earthquake',
      title: 'M 5.8 - Red Sea',
      latitude: 22.0,
      longitude: 38.0,
      magnitude: 5.8,
      severity: 'red',
      eventDate: '2026-09-30T12:00:00.000Z',
      sourceUrl: 'https://earthquake.usgs.gov',
    },
  ];

  const geoJson = convertToDisastersGeoJson(events, 1, 0, false);

  assert.equal(geoJson.type, 'FeatureCollection');
  assert.equal(geoJson.metadata.totalEvents, 1);
  assert.equal(geoJson.metadata.earthquakesCount, 1);
  assert.equal(geoJson.features.length, 1);
  assert.ok(geoJson.metadata.disclaimer.length > 20);

  const f = geoJson.features[0];
  assert.deepEqual(f.geometry.coordinates, [38.0, 22.0]);
  assert.equal(f.properties.color, '#ef4444');
  assert.equal(f.properties.radius, 14);
});
