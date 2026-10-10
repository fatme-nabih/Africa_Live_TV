import { test, expect, type Page } from '@playwright/test';
const ids = Array.from({length:24},(_,i) => 'legacy-' + i);
const add = (page:Page) => page.getByRole('button',{name:'Ajouter à mon compte',exact:true});
const summary = (page:Page) => page.getByRole('complementary',{name:'Choix de cet appareil'});
const snapshot = async(page:Page) => JSON.parse((await page.getByTestId('legacy-state').textContent())!);
async function seed(page:Page,favorites = ids,countries:string[] = []) {
  await page.addInitScript(({favorites,countries}) => {
    if (localStorage.getItem('legacy-fixture-seeded')) return;
    localStorage.setItem('iptv_favorites',JSON.stringify(favorites));
    localStorage.setItem('al_followed_countries',JSON.stringify(countries));
    localStorage.setItem('legacy-fixture-seeded','true');
  },{favorites,countries});
}
async function account(page:Page,initial:string[] = [],countries:string[] = []) {
  const accounts:Record<string,string[]> = {'account:A':[...initial],'account:B':['B-only']};
  const writes:{owner:string;add:string[];remove:string[]}[] = [], puts:string[][] = [];
  const control = {failure:0,countries:[...countries],missing:new Set<string>(),hold:null as Promise<void>|null};
  await page.route('**/api/followed-countries',async route => {
    if (route.request().method() === 'PUT') { control.countries = route.request().postDataJSON().countries; puts.push(control.countries); }
    await route.fulfill({json:{owner:route.request().headers()['x-preference-owner'],countries:control.countries,version:JSON.stringify(control.countries)}});
  });
  await page.route('**/api/favorites',async route => {
    const owner = route.request().headers()['x-preference-owner'];
    if (route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON(); writes.push(body);
      if (control.hold) await control.hold;
      if (control.failure) { await route.fulfill({status:control.failure,json:{error:'fixture outage'}}); return; }
      accounts[owner] = [...new Set([...accounts[owner],...body.add.filter((id:string) => !control.missing.has(id))])].filter(id => !body.remove.includes(id));
    }
    await route.fulfill({json:{owner,favorites:accounts[owner]}}).catch(() => {});
  });
  return {accounts,writes,puts,control};
}

test('already saved favorites: no misleading offer, recovery button or automatic mutation',async({page}) => {
  await seed(page); const api = await account(page,ids);
  await page.goto('/?kind=legacy');
  await expect.poll(async() => (await snapshot(page)).loaded.favorites).toBe(true);
  await expect(summary(page)).toHaveCount(0); await expect(add(page)).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Reprendre les choix de cet appareil'})).toHaveCount(0);
  expect(api.writes).toEqual([]);
});
test('account read must finish before filtering or offering an import',async({page}) => {
  await seed(page); let release!:()=>void; const hold = new Promise<void>(resolve => {release=resolve;});
  const api = await account(page,ids);
  await page.route('**/api/favorites',async route => { await hold; await route.fulfill({json:{owner:'account:A',favorites:ids}}); });
  await page.goto('/?kind=legacy');
  await expect(summary(page)).toContainText('Vérification'); await expect(add(page)).toHaveCount(0);
  release(); await expect(summary(page)).toHaveCount(0); expect(api.writes).toEqual([]);
});
test('24 favorites: count excludes existing choices and confirmation waits for the PATCH reply',async({page}) => {
  await seed(page); const api = await account(page,['existing','legacy-0']);
  let release!:()=>void; api.control.hold = new Promise<void>(resolve => {release=resolve;});
  await page.goto('/?kind=legacy'); await expect(summary(page)).toContainText('23 chaînes favorites');
  expect(api.writes).toEqual([]); await add(page).click();
  await expect.poll(() => api.writes.length).toBe(1);
  await expect(summary(page)).toContainText('Attente de la confirmation');
  expect((await snapshot(page)).legacyHandled).toBe(false);
  await expect(summary(page)).not.toContainText('Ajout confirmé');
  release(); await expect(summary(page)).toContainText('Ajout confirmé : 23 chaînes favorites dans votre compte.');
  expect(api.accounts['account:A']).toHaveLength(25); expect(api.writes[0].remove).toEqual([]);
  await page.getByRole('button',{name:'Fermer',exact:true}).click(); await page.reload();
  await expect.poll(async() => (await snapshot(page)).loaded.favorites).toBe(true);
  await expect(summary(page)).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('iptv_favorites')!))).toEqual(ids);
});
test('postpone keeps the source choices across reload and recovery restores the correct offer',async({page}) => {
  await seed(page); const api = await account(page,['legacy-0']);
  await page.goto('/?kind=legacy'); await add(page).waitFor();
  await page.getByRole('button',{name:'Plus tard',exact:true}).click(); await page.reload();
  await expect.poll(async() => (await snapshot(page)).loaded.favorites).toBe(true);
  await expect(summary(page)).toHaveCount(0); expect(api.writes).toEqual([]);
  await page.getByRole('button',{name:'Reprendre les choix de cet appareil'}).click();
  await expect(summary(page)).toContainText('23 chaînes favorites');
});
test('503 on Radar: visible error, durable pending import, retry and server confirmation',async({page}) => {
  await seed(page); const api = await account(page); api.control.failure = 503;
  await page.goto('/?kind=legacy'); await add(page).click();
  await expect(page.getByRole('alert')).toContainText('échoué');
  await expect(summary(page)).toContainText('en attente');
  await page.reload(); await expect(page.getByRole('alert')).toContainText('échoué');
  expect((await snapshot(page)).legacyImport.status).toBe('pending');
  expect(Object.keys((await snapshot(page)).favoriteIntents)).toHaveLength(24);
  api.control.failure = 0; await page.getByRole('button',{name:'Réessayer les favoris'}).click();
  await expect(summary(page)).toContainText('Ajout confirmé');
  await expect(page.getByRole('alert')).toHaveCount(0); expect(api.accounts['account:A']).toHaveLength(24);
});
test('rejected favorites: partial result persists, keeps the old choices and supports an explicit retry',async({page}) => {
  await seed(page,['valid','missing']); const api = await account(page); api.control.missing.add('missing');
  await page.goto('/?kind=legacy'); await add(page).click();
  await expect(summary(page)).toContainText('Ajout confirmé : 1 chaîne favorite.');
  await expect(summary(page)).toContainText('1 chaîne n’a pas pu être ajoutée');
  expect(api.writes).toHaveLength(1); expect((await snapshot(page)).rejectedFavorites).toEqual(['missing']);
  await page.reload(); await expect(summary(page)).toContainText('1 chaîne n’a pas pu être ajoutée');
  await expect.poll(async() => (await snapshot(page)).loaded.favorites).toBe(true);
  api.control.missing.clear(); await page.getByRole('button',{name:'Réessayer l’ajout'}).click();
  await expect(summary(page)).toContainText('Ajout confirmé : 1 chaîne favorite dans votre compte.');
  expect(api.accounts['account:A']).toEqual(['valid','missing']);
  expect(api.writes.map(write => write.add)).toEqual([['valid','missing'],['missing']]);
});
test('five-country limit: imported favorites succeed and omitted countries stay visible and recoverable',async({page}) => {
  await seed(page,['valid'],['KE','TZ']); const api = await account(page,[],['SN','CI','ML','GN','NG']);
  await page.goto('/?kind=legacy'); await add(page).click();
  await expect(summary(page)).toContainText('Ajout confirmé : 1 chaîne favorite.');
  await expect(summary(page)).toContainText('Pays encore à ajouter : Kenya, Tanzanie.');
  expect(api.puts).toEqual([]); expect(api.control.countries).toHaveLength(5);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('al_followed_countries')!))).toEqual(['KE','TZ']);
  await page.getByRole('button',{name:'Plus tard',exact:true}).click();
  await page.getByRole('button',{name:'Reprendre les choix de cet appareil'}).click();
  await expect(summary(page)).toContainText('2 pays suivis');
});
test('A and B: a late import response cannot confirm or change the other account',async({page}) => {
  await seed(page,['valid']); const api = await account(page);
  let release!:()=>void; api.control.hold = new Promise<void>(resolve => {release=resolve;});
  await page.goto('/?kind=legacy'); await add(page).click();
  await expect.poll(() => api.writes.length).toBe(1);
  await page.getByRole('button',{name:'Account B',exact:true}).click();
  release(); api.control.hold = null;
  await expect.poll(async() => (await snapshot(page)).favorites).toEqual(['B-only']);
  await expect(add(page)).toBeVisible(); await expect(summary(page)).not.toContainText('Ajout confirmé');
  expect(api.accounts['account:B']).toEqual(['B-only']);
  expect(api.writes.every(write => write.owner === 'account:A')).toBe(true);
  await page.getByRole('button',{name:'Account A',exact:true}).click();
  await expect(summary(page)).toContainText('Ajout confirmé');
});
test('denied local writes: page memory remains functional with a visible persistence warning',async({page}) => {
  await seed(page,['valid']); const api = await account(page); api.control.failure = 503;
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException('quota','QuotaExceededError'); }; });
  await page.goto('/?kind=legacy'); await add(page).click();
  await expect(page.getByRole('alert')).toContainText('pour cette page');
  await expect(summary(page)).toContainText('Le navigateur empêche l’enregistrement local');
  api.control.failure = 0; await page.getByRole('button',{name:'Réessayer les favoris'}).click();
  await expect(summary(page)).toContainText('Ajout confirmé'); expect(api.accounts['account:A']).toEqual(['valid']);
});
test('unknown identity: no offer, API request or import crosses the identity boundary',async({page}) => {
  await seed(page,['valid']); const api = await account(page);
  await page.goto('/?kind=legacy&owner=unknown');
  await expect(add(page)).toHaveCount(0); await expect(summary(page)).toHaveCount(0);
  expect(api.writes).toEqual([]);
  await page.getByRole('button',{name:'Account A',exact:true}).click(); await expect(add(page)).toBeVisible();
});
test('250 legacy favorites: partial acceptance across several batches never loses the rejected tail',async({page}) => {
  const many = Array.from({length:250},(_,i) => 'legacy-' + i);
  await seed(page,many); const api = await account(page); api.control.missing.add('legacy-249');
  await page.goto('/?kind=legacy'); await add(page).click();
  await expect(summary(page)).toContainText('Ajout confirmé : 249 chaînes favorites.');
  await expect(summary(page)).toContainText('1 chaîne n’a pas pu être ajoutée');
  expect(api.writes.map(write => write.add.length)).toEqual([100,100,50]);
  expect((await snapshot(page)).rejectedFavorites).toEqual(['legacy-249']);
});
test('403 during import: retry preserves the error and the choices until an authenticated reload',async({page}) => {
  await seed(page,['valid']); const api = await account(page); api.control.failure = 403;
  await page.goto('/?kind=legacy'); await add(page).click();
  await expect(page.getByRole('alert')).toContainText('Reconnectez-vous ou rechargez');
  await page.getByRole('button',{name:'Réessayer les favoris'}).click();
  await expect(page.getByRole('alert')).toContainText('Reconnectez-vous ou rechargez');
  expect(api.writes).toHaveLength(1); expect((await snapshot(page)).legacyImport.status).toBe('pending');
  api.control.failure = 0; await page.reload(); await expect(summary(page)).toContainText('Ajout confirmé');
});
test('mobile and desktop: long country labels and partial results keep every action visible',async({page}) => {
  await page.setViewportSize({width:360,height:800});
  await seed(page,['valid','missing'],['CD','CF']); const api = await account(page,[],['SN','CI','ML','GN','NG']); api.control.missing.add('missing');
  await page.goto('/?kind=legacy'); await expect(add(page)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await add(page).click(); await expect(summary(page)).toContainText('Certains choix restent à ajouter');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole('button',{name:'Réessayer l’ajout'})).toBeVisible();
  await page.screenshot({path:'.local-logs/legacy-fix-2026-10-10/partial-mobile.png',fullPage:true});
  await page.setViewportSize({width:1366,height:768});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({path:'.local-logs/legacy-fix-2026-10-10/partial-desktop.png',fullPage:true});
});
