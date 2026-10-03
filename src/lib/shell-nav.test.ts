import assert from 'node:assert/strict';
import test from 'node:test';

import { buildNavItems, countryFromSearch } from './shell-nav';

const hrefs = (items: ReturnType<typeof buildNavItems>) => Object.fromEntries(items.map(item => [item.id, item.href]));

test('la navigation conserve le pays, identifie la page courante et cache l’administration aux comptes standard', () => {
  const items = buildNavItems({ pathname: '/app', country: 'SN', admin: false });
  assert.deepEqual(hrefs(items), { radar: '/app/live?country=SN', tv: '/app?country=SN', account: '/account' });
  assert.deepEqual(items.filter(item => item.active).map(item => item.id), ['tv']);
  assert.ok(!items.some(item => item.id === 'admin'));
});

test('l’administration n’apparaît qu’avec la capacité vérifiée par le serveur', () => {
  const items = buildNavItems({ pathname: '/admin', country: null, admin: true });
  const admin = items.find(item => item.id === 'admin');
  assert.equal(admin?.href, '/admin');
  assert.equal(admin?.ariaLabel, 'Administration');
  assert.equal(admin?.active, true);
});

test('une seule entrée est active : Radar sur /app/live, aucune sur /app/ui', () => {
  assert.deepEqual(buildNavItems({ pathname: '/app/live', country: null, admin: false }).filter(item => item.active).map(item => item.id), ['radar']);
  assert.equal(buildNavItems({ pathname: '/app/ui', country: null, admin: false }).some(item => item.active), false);
});

test('un pays hors Afrique reste sur la TV mais ne casse pas le lien Radar', () => {
  const items = buildNavItems({ pathname: '/app', country: 'FR', admin: false });
  assert.deepEqual(hrefs(items), { radar: '/app/live', tv: '/app?country=FR', account: '/account' });
});

test('le pays de l’URL est validé avant d’alimenter les liens', () => {
  assert.equal(countryFromSearch('sn'), 'SN');
  assert.equal(countryFromSearch(' ci '), 'CI');
  assert.equal(countryFromSearch('SEN'), null);
  assert.equal(countryFromSearch('<x>'), null);
  assert.equal(countryFromSearch(null), null);
});

test('la recherche conduit à la TV en conservant le pays et en demandant le focus', async () => {
  const { searchHref, FOCUS_SEARCH_EVENT } = await import('./shell-nav');
  assert.equal(searchHref(null), '/app?focus=search');
  assert.equal(searchHref('sn'), '/app?country=SN&focus=search');
  assert.equal(searchHref('<x>'), '/app?focus=search');
  assert.equal(FOCUS_SEARCH_EVENT, 'al_focus_search');
});
