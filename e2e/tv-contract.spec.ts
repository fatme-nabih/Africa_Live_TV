import { expect, test } from '@playwright/test';
import { Pool } from 'pg';
import { assertLocalE2ETarget } from '../src/lib/integration-test-safety';
import { catalogLanguageCodes } from '../src/lib/catalog-metadata';

test('Contrat TV réel : composites, langues, facettes, Afrique/Tout et curseur contextualisé sans mutation des imports', async ({ page, baseURL }) => {
  assertLocalE2ETarget(process.env, baseURL);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const query = `select c.id, c.name, c.group_title, c.language from channels c where c.active
      and c.normalized_name not ilike '%canal%'
      and exists(select 1 from streams s where s.channel_id=c.id and s.active and s.status in ('BROWSER_OK','VLC_ONLY','UNTESTED') and s.direct_eligibility != 'OFFLINE')`;
    const composite = (await pool.query(query + " and c.group_title = 'Business;News' order by c.id limit 1")).rows[0];
    expect(composite).toBeDefined();
    await page.goto('/app');
    const facets = await page.request.get('/api/filters'); expect(facets.status()).toBe(200);
    const options = await facets.json();
    expect(options.groups).toContain('News'); expect(options.groups).toContain('Business');
    expect(options.groups).toContain('unknown'); expect(options.groups).not.toContain('Business;News');
    expect(options.languages).toContain('fr'); expect(options.languages).not.toContain('fra');
    expect(options.languages).toContain('unknown');
    const post = (body: Record<string, unknown>) => page.request.post('/api/channels', { data: body, headers: { Origin: baseURL! } });
    const iso3 = await post({ language: 'fra' }), iso2 = await post({ language: 'fr' });
    expect(iso3.status()).toBe(200); expect(iso2.status()).toBe(200);
    const iso3Body = await iso3.json(), iso2Body = await iso2.json();
    expect(iso3Body.channels.length).toBeGreaterThan(0);
    expect(iso3Body.channels).toEqual(iso2Body.channels);
    const selected = await post({ search: composite.name, group: 'News' }); expect(selected.status()).toBe(200);
    const selectedBody = await selected.json();
    expect(selectedBody.channels.some((channel: { id: string; groupTitle: string }) => channel.id === composite.id && channel.groupTitle === 'Business;News')).toBe(true);
    if (catalogLanguageCodes(composite.language).includes('fr')) {
      const french = await post({ search: composite.name, group: 'News', language: 'fra' });
      expect(french.status()).toBe(200); expect((await french.json()).channels.some((channel: { id: string }) => channel.id === composite.id)).toBe(true);
    }
    const all = await post({}); expect(all.status()).toBe(200); const first = await all.json();
    expect(first.channels).toHaveLength(30); expect(first.nextCursor).toBeTruthy();
    const wrongScope = await post({ cursor: first.nextCursor, region: 'africa' }); expect(wrongScope.status()).toBe(400);
    const more = await post({ cursor: first.nextCursor }); expect(more.status()).toBe(200);
    expect((await more.json()).channels.every((channel: { id: string }) => !first.channels.some((old: { id: string }) => old.id === channel.id))).toBe(true);
    const africa = await post({ region: 'africa' }); expect(africa.status()).toBe(200);
    expect((await africa.json()).channels.every((channel: { countryCode: string }) => options.countries.includes(channel.countryCode) && channel.countryCode !== 'FR')).toBe(true);
    const after = (await pool.query('select group_title, language from channels where id=$1', [composite.id])).rows[0];
    expect(after).toEqual({ group_title: composite.group_title, language: composite.language });
  } finally { await pool.end(); }
});
