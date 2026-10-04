import test from 'node:test';
import assert from 'node:assert/strict';
import { clearBriefingCache, getLiveBriefing as getBriefing, type BriefingProviders } from './live-briefing';

let now=Date.parse('2026-10-04T12:00:00Z');
const providers:BriefingProviders={now:()=>now,rss:async()=>({articles:[],sources:[],updatedAt:new Date(now).toISOString(),stale:false}),
 disasters:async()=>({type:'FeatureCollection',features:[],metadata:{source:'fixture',attribution:'fixture',totalEvents:0,earthquakesCount:0,gdacsAlertsCount:0,updatedAt:new Date(now).toISOString(),stale:false,disclaimer:''}}),
 markets:async()=>({commodities:[],forex:[],alerts:[],updatedAt:new Date(now).toISOString(),disclaimer:''}),
 channels:async()=>({updatedAt:new Date(now).toISOString(),totalChannels:121,totalDirectWeb:1,countries:{}})};
const getLiveBriefing=(options:Parameters<typeof getBriefing>[0]={})=>getBriefing(options,providers);

test('getLiveBriefing generates a continental briefing with 4 thematic sections', async () => {
  clearBriefingCache();
  const briefing = await getLiveBriefing();

  assert.equal(briefing.scope, 'continent');
  assert.equal(briefing.targetName, 'Continent Africain');
  assert.ok(typeof briefing.headline === 'string');
  assert.ok(typeof briefing.executiveSummary === 'string');
  assert.equal(briefing.periodCovered, 'Dernières 12 heures');

  // Doit contenir les 4 sections thématiques requises
  assert.equal(briefing.sections.length, 4);
  const sectionIds = briefing.sections.map((s) => s.id);
  assert.deepEqual(sectionIds, ['geopolitics', 'economy', 'hazards', 'media']);

  for (const section of briefing.sections) {
    assert.ok(typeof section.title === 'string' && section.title.length > 0);
    assert.ok(typeof section.summary === 'string' && section.summary.length > 0);
    assert.ok(Array.isArray(section.highlights));
    assert.ok(['normal', 'vigilance', 'critical'].includes(section.status));
  }

  // Vérification des métriques
  assert.ok(typeof briefing.metrics.articlesAnalyzed === 'number');
  assert.ok(typeof briefing.metrics.alertsActive === 'number');
  assert.ok(typeof briefing.metrics.countriesCovered === 'number');
  assert.ok(typeof briefing.metrics.channelsOnAir === 'number');
  assert.equal(briefing.engineUsed, 'heuristic-nlp');
});

test('getLiveBriefing generates a country-specific briefing for Senegal', async () => {
  clearBriefingCache();
  const briefing = await getLiveBriefing({ countryCode: 'SN' });

  assert.equal(briefing.scope, 'country');
  assert.equal(briefing.targetCountryCode, 'SN');
  assert.equal(briefing.targetName, 'Sénégal');
  assert.match(briefing.headline, /Sénégal/);
  assert.match(briefing.executiveSummary, /Sénégal/);
  assert.equal(briefing.metrics.countriesCovered, 1);
});

test('getLiveBriefing uses in-memory caching and supports forceRefresh', async () => {
  clearBriefingCache();
  const first = await getLiveBriefing({ countryCode: 'CI' });
  const cached = await getLiveBriefing({ countryCode: 'CI' });

  assert.equal(first.id, cached.id);
  assert.equal(first.generatedAt, cached.generatedAt);

  now += 60_000;
  const refreshed = await getLiveBriefing({ countryCode: 'CI', forceRefresh: true });
  assert.equal(Date.parse(refreshed.generatedAt),now);
  assert.notEqual(refreshed.generatedAt,first.generatedAt);
});
