import { test, expect } from '@playwright/test';
test.beforeEach(async ({ page }) => { await page.route('**/api/favorites', route => route.fulfill({ json: { favorites: [], owner: route.request().headers()['x-preference-owner'] ?? 'account:A' } })); });
test('B08: unavailable Storage never raises a global error or prevents the API read', async ({ page }) => {
  const errors: string[] = []; let reads = 0;
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException('quota', 'QuotaExceededError'); }; });
  await page.route('**/api/favorites', route => { reads++; return route.fulfill({ json: { favorites: [], owner: 'account:A' } }); });
  await page.goto('/?kind=favorites');
  await expect.poll(() => reads).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

for (const count of [0,100,101,250]) test(`B07: ${count} additions use bounded serialized batches without dropping intentions`, async ({ page }) => {
  const favorites = new Set<string>(), batches: number[] = [];
  await page.route('**/api/favorites', route => {
    if (route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON(); batches.push(body.add.length);
      body.add.forEach((id:string) => favorites.add(id)); body.remove.forEach((id:string) => favorites.delete(id));
    }
    return route.fulfill({ json: { favorites: [...favorites], owner: 'account:A' } });
  });
  await page.goto('/?kind=favorites&count=' + count);
  await page.getByRole('button',{ name: 'Add favorites' }).click();
  if (count) await expect.poll(() => favorites.size).toBe(count);
  await expect.poll(() => page.getByTestId('favorites-state').textContent().then(text => JSON.parse(text!).length)).toBe(count);
  expect(batches).toEqual(count === 0 ? [] : count === 100 ? [100] : count === 101 ? [100,1] : [100,100,50]);
});

test('B07: reversing a click during the first batch preserves the new revision', async ({ page }) => {
  const favorites = new Set<string>(); let patches = 0, release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/favorites', async route => {
    if (route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON();
      body.add.forEach((id:string) => favorites.add(id)); body.remove.forEach((id:string) => favorites.delete(id));
      if (++patches === 1) await held;
    }
    await route.fulfill({ json: { favorites: [...favorites], owner: 'account:A' } });
  });
  await page.goto('/?kind=favorites'); await page.getByRole('button',{ name: 'Add favorites' }).click();
  await expect.poll(() => patches).toBe(1); await page.getByRole('button',{ name: 'Toggle first' }).click(); release();
  await expect.poll(() => favorites.size).toBe(249); expect(favorites.has('fixture-0')).toBe(false);
});

test('B10: uncertain A batch cannot be applied to B; returning to A keeps its own queue', async ({ page }) => {
  const accounts: Record<string,Set<string>> = { 'account:A': new Set(), 'account:B': new Set(['B-only']) };
  const writes: string[] = []; let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/favorites', async route => {
    const owner = route.request().headers()['x-preference-owner'];
    if (route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON(); expect(body.owner).toBe(owner); writes.push(owner);
      body.add.forEach((id:string) => accounts[owner].add(id)); body.remove.forEach((id:string) => accounts[owner].delete(id));
      if (writes.length === 1) await held;
    }
    await route.fulfill({ json: { favorites: [...accounts[owner]], owner } }).catch(() => {});
  });
  await page.goto('/?kind=favorites'); await page.getByRole('button',{ name: 'Add favorites' }).click();
  await expect.poll(() => writes.length).toBe(1); await page.getByRole('button',{ name: 'Account B' }).click();
  await expect(page.getByTestId('favorites-state')).toHaveText('["B-only"]'); release();
  await expect(page.getByTestId('favorites-state')).toHaveText('["B-only"]');
  await page.getByRole('button',{ name: 'Account A' }).click();
  await expect.poll(() => accounts['account:A'].size).toBe(250);
  expect(accounts['account:B']).toEqual(new Set(['B-only'])); expect(writes.every(owner => owner === 'account:A')).toBe(true);
});

test('B10: unknown identity sends no API request', async ({ page }) => {
  let reads = 0; await page.route('**/api/favorites', route => { reads++; return route.fulfill({ json: { favorites: [], owner: 'account:A' } }); });
  await page.goto('/?kind=favorites&owner=unknown'); await page.getByRole('button',{ name: 'Add favorites' }).click();
  await page.clock.install(); await page.clock.runFor(1000); expect(reads).toBe(0);
});

test('B07: 101 removals and a failed second batch preserve the unacknowledged tail', async ({ page }) => {
  const favorites = new Set(Array.from({ length:101 },(_,index) => 'fixture-' + index));
  const batches: number[] = []; let fail = true;
  await page.route('**/api/favorites', route => {
    if (route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON(); batches.push(body.remove.length);
      if (batches.length === 2 && fail) return route.fulfill({ status:503,json:{ error:'fixture outage' } });
      body.remove.forEach((id:string) => favorites.delete(id));
    }
    return route.fulfill({ json:{ owner:'account:A',favorites:[...favorites] } });
  });
  await page.goto('/?kind=favorites');
  await expect.poll(() => page.getByTestId('favorites-state').textContent().then(text => JSON.parse(text!).length)).toBe(101);
  await page.getByRole('button',{ name:'Remove all' }).click();
  await expect(page.getByRole('alert')).toContainText('sur cet appareil');
  expect(batches).toEqual([100,1]); expect(favorites.size).toBe(1);
  const pending = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('al_preferences_v2_account%3AA')!).data.favoriteIntents));
  expect(pending).toHaveLength(1); fail = false;
  await page.getByRole('button',{ name:'Retry favorites' }).click();
  await expect.poll(() => favorites.size).toBe(0); expect(batches).toEqual([100,1,1]);
});

test('B09: stale owned cache alone causes no PUT; an actual new intention rebases a version conflict', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('al_preferences_v2_account%3AA',JSON.stringify({ owner:'account:A',data:{ countries:['SN','CI'],countryVersion:'old',countryIntents:{},favoriteIntents:{} } })));
  let countries = ['CI'], version = 'v1'; const writes: { countries:string[];baseVersion:string }[] = [];
  await page.route('**/api/followed-countries', route => {
    if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON(); writes.push(body);
      if (writes.length === 1) { countries = ['CI','ML']; version = 'v2'; return route.fulfill({ status:409,json:{ code:'PREFERENCE_VERSION_CONFLICT',owner:'account:A',countries,version } }); }
      expect(body.baseVersion).toBe('v2'); countries = body.countries; version = 'v3';
    }
    return route.fulfill({ json:{ owner:'account:A',countries,version } });
  });
  await page.goto('/?kind=countries'); await expect(page.getByTestId('countries-state')).toHaveText('["CI"]');
  expect(writes).toEqual([]); await page.getByRole('button',{ name:'Add SN' }).click();
  await expect.poll(() => countries).toEqual(['CI','ML','SN']); expect(writes).toHaveLength(2);
});

test('B11: real 403 remains blocked after intent and online', async ({ page }) => {
  let reads = 0;
  await page.clock.install();
  await page.route('**/api/followed-countries', route => { reads++; return route.fulfill({ status:403,json:{ error:'access' } }); });
  await page.goto('/?kind=countries'); await expect.poll(() => reads).toBe(1);
  await page.getByRole('button',{ name:'Add SN' }).click(); await page.clock.runFor(90_000);
  await page.evaluate(() => window.dispatchEvent(new Event('online'))); await page.clock.runFor(1000);
  expect(reads).toBe(1);
});

test('B11: PUT cooldown survives owner remount and resumes after the exact deadline', async ({ page }) => {
  let reads = 0, puts = 0; const countries: string[] = [];
  await page.clock.install();
  await page.route('**/api/followed-countries',route => {
    if (route.request().method() === 'PUT') {
      if (++puts === 1) return route.fulfill({ status:429,headers:{ 'Retry-After':'1' },json:{ error:'quota' } });
      countries.splice(0,countries.length,...route.request().postDataJSON().countries);
    } else reads++;
    return route.fulfill({ json:{ owner:'account:A',countries,version:'v1' } });
  });
  await page.goto('/?kind=countries'); await expect.poll(() => reads).toBe(1);
  await page.getByRole('button',{ name:'Add SN' }).click(); await page.clock.runFor(250);
  await expect(page.getByRole('status')).toContainText('quota');
  const beforeReads = reads;
  await page.getByRole('button',{ name:'Sign out' }).click(); await page.getByRole('button',{ name:'Account A' }).click();
  await page.clock.runFor(900); expect(puts).toBe(1); expect(reads).toBe(beforeReads);
  await page.clock.runFor(200); await expect.poll(() => puts).toBe(2);
  await expect(page.getByTestId('countries-state')).toHaveText('["SN"]');
});

test('B08: denied Storage getter preserves choices in memory through owner remount and still reaches the API', async ({ page }) => {
  const errors: string[] = []; let reads = 0;
  page.on('pageerror',error => errors.push(error.message));
  await page.addInitScript(() => Object.defineProperty(window,'localStorage',{ get() { throw new DOMException('denied','SecurityError'); } }));
  await page.route('**/api/favorites',route => {
    if (route.request().method() === 'PATCH') return route.fulfill({ status:503,json:{ error:'fixture outage' } });
    reads++; return route.fulfill({ json:{ owner:route.request().headers()['x-preference-owner'],favorites:[] } });
  });
  await page.goto('/?kind=favorites'); await page.getByRole('button',{ name:'Add favorites' }).click();
  await expect(page.getByRole('alert')).toContainText('pour cette page');
  await page.getByRole('button',{ name:'Sign out' }).click(); await page.getByRole('button',{ name:'Account A' }).click();
  await expect.poll(() => page.getByTestId('favorites-state').textContent().then(text => JSON.parse(text!).length)).toBe(250);
  expect(reads).toBeGreaterThan(0); expect(errors).toEqual([]);
});

test('B09: two tabs retain a removal and never upload an obsolete cache', async ({ page,context }) => {
  let countries = ['SN','CI']; const writes: string[][] = [];
  await context.route('**/api/favorites',route => route.fulfill({ json:{ owner:'account:A',favorites:[] } }));
  await context.route('**/api/followed-countries',route => {
    if (route.request().method() === 'PUT') { countries = route.request().postDataJSON().countries; writes.push(countries); }
    return route.fulfill({ json:{ owner:'account:A',countries,version:JSON.stringify(countries) } });
  });
  await page.goto('/?kind=countries'); await expect(page.getByTestId('countries-state')).toHaveText('["SN","CI"]');
  const second = await context.newPage(); await second.goto('/?kind=countries');
  await expect(second.getByTestId('countries-state')).toHaveText('["SN","CI"]');
  await page.getByRole('button',{ name:'Remove SN' }).click(); await expect.poll(() => countries).toEqual(['CI']);
  await second.reload(); await expect(second.getByTestId('countries-state')).toHaveText('["CI"]');
  expect(writes.every(list => !list.includes('SN'))).toBe(true);
});
test('B09/B10: shared cache with unknown owner is retained and never sent automatically', async ({ page }) => {
  const writes: unknown[] = []; let reads = 0;
  await page.addInitScript(() => localStorage.setItem('al_followed_countries','["SN","CI"]'));
  await page.route('**/api/followed-countries', route => {
    if (route.request().method() === 'PUT') writes.push(route.request().postDataJSON()); else reads++;
    return route.fulfill({ json: { countries: ['CI'], version: 'v1', owner: 'account:A' } });
  });
  await page.goto('/?kind=countries'); await expect.poll(() => reads).toBe(1);
  await page.clock.install(); await page.clock.runFor(2000);
  expect(writes).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem('al_followed_countries'))).toBe('["SN","CI"]');
});
test('B11: Retry-After expiry resumes GET without transferring a permanent access denial', async ({ page }) => {
  let reads = 0;
  await page.clock.install();
  await page.route('**/api/followed-countries', route => ++reads === 1 ? route.fulfill({ status: 429, headers: { 'Retry-After': '1' }, json: { error: 'quota' } }) : route.fulfill({ json: { countries: [], version: 'v1', owner: 'account:A' } }));
  await page.goto('/?kind=countries'); await expect.poll(() => reads).toBe(1);
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('al_preferences_v2_account%3AA') ?? '{}').data?.cooldown.countries > Date.now());
  await page.clock.runFor(900); expect(reads).toBe(1);
  await page.clock.runFor(200); await expect.poll(() => reads).toBe(2);
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('al_preferences_v2_account%3AA') ?? '{}').data?.countryVersion === 'v1');
  await page.clock.runFor(90_000); expect(reads).toBe(2);
});
