import { expect, test, type Page } from '@playwright/test';
import { fixtureRadar } from './helpers/radar-fixture';
import { fixtureCatalog } from './helpers/tv-fixture';

// P5 / UX-503 — Pays suivis (1 à 5) : le Radar et la TV s'ouvrent sur le pays principal.
// UX-503b — synchronisés au compte : l'API est simulée ici (compte en mémoire) pour ne rien écrire dans la base entre les tests.
const followButton = (page: Page, name: string) => page.getByRole('button', { name: new RegExp(`^(Suivre|Ne plus suivre) ${name}$`) });

async function fakeAccount(page: Page, initial: string[] = []) {
  const account = { countries: [...initial], puts: [] as string[][] };
  await page.route('**/api/followed-countries', async route => {
    if (route.request().method() === 'PUT') {
      account.countries = (route.request().postDataJSON() as { countries: string[] }).countries;
      account.puts.push(account.countries);
    }
    await route.fulfill({ json: { countries: account.countries } });
  });
  return account;
}

test.describe('Pays suivis (UX-503)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await fixtureRadar(page, { weatherOk: true });
    await fixtureCatalog(page);
  });

  test('suivre un pays en fait le pays principal du Radar et de la TV', async ({ page }) => {
    const account = await fakeAccount(page);
    await page.goto('/app/live?country=CI');
    const button = followButton(page, 'Côte d’Ivoire');
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    // Attendre l'hydratation (le bouton est rendu par le client) avant de cliquer.
    await expect(async () => {
      await button.click();
      await expect(button).toHaveAttribute('aria-pressed', 'true', { timeout: 500 });
    }).toPass({ timeout: 15_000 });
    await expect(button).toHaveText('Pays principal');
    expect(await page.evaluate(() => localStorage.getItem('al_followed_countries'))).toBe('["CI"]');
    await expect.poll(() => account.countries).toEqual(['CI']);

    await page.goto('/app/live');
    await expect(page).toHaveURL(/\/app\/live\?country=CI$/);

    await page.goto('/app');
    await expect(page.getByRole('region', { name: 'Côte d’Ivoire en direct', exact: true })).toBeVisible();

    await page.goto('/app/live?country=CI');
    await expect(async () => {
      await followButton(page, 'Côte d’Ivoire').click();
      await expect(followButton(page, 'Côte d’Ivoire')).toHaveAttribute('aria-pressed', 'false', { timeout: 500 });
    }).toPass({ timeout: 15_000 });
    expect(await page.evaluate(() => localStorage.getItem('al_followed_countries'))).toBe('[]');
    await expect.poll(() => account.countries).toEqual([]);
  });

  test('au-delà de 5 pays, le bouton est désactivé et explique pourquoi', async ({ page }) => {
    await fakeAccount(page);
    await page.addInitScript(() => localStorage.setItem('al_followed_countries', JSON.stringify(['SN', 'CI', 'ML', 'GN', 'NG'])));
    await page.goto('/app/live?country=KE');
    const button = followButton(page, 'Kenya');
    await expect(button).toBeDisabled();
    await expect(button).toHaveAttribute('title', /5 pays/);
    await expect(followButton(page, 'Kenya')).toHaveAttribute('aria-pressed', 'false');
  });

  test('un nouvel appareil reprend les pays suivis du compte', async ({ page }) => {
    const account = await fakeAccount(page, ['ML', 'SN']);
    await page.goto('/app/live?country=ML');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('al_followed_countries'))).toBe('["ML","SN"]');
    await expect(followButton(page, 'Mali')).toHaveText('Pays principal');
    expect(account.puts).toEqual([]);
  });

  test('le premier appareil envoie ses pays au compte, et le compte garde son ordre', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('al_followed_countries', JSON.stringify(['CI', 'SN'])));
    const account = await fakeAccount(page, ['SN']);
    await page.goto('/app/live?country=SN');
    await expect.poll(() => account.countries).toEqual(['SN', 'CI']);
    await expect.poll(() => page.evaluate(() => localStorage.getItem('al_followed_countries'))).toBe('["SN","CI"]');
  });

  test('API réelle : validation, ordre conservé et remise à zéro', async ({ page }) => {
    // Appels depuis la page (même origine, comme l'application) : la garde du mode local refuse une écriture sans Origin.
    await page.goto('/app/live');
    const call = (method: 'GET' | 'PUT', countries?: string[]) => page.evaluate(async ([verb, list]) => {
      const response = await fetch('/api/followed-countries', verb === 'PUT'
        ? { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ countries: list }) }
        : { cache: 'no-store' });
      return { status: response.status, body: response.ok ? await response.json() : null };
    }, [method, countries] as const);
    expect((await call('PUT', ['SN', 'SN'])).status).toBe(400);
    expect((await call('PUT', ['FR'])).status).toBe(400);
    expect((await call('PUT', ['SN', 'CI', 'ML', 'GN', 'NG', 'KE'])).status).toBe(400);
    try {
      expect(await call('PUT', ['CI', 'SN'])).toEqual({ status: 200, body: { countries: ['CI', 'SN'] } });
      expect(await call('GET')).toEqual({ status: 200, body: { countries: ['CI', 'SN'] } });
    } finally {
      expect((await call('PUT', [])).status).toBe(200);
      await page.evaluate(() => localStorage.removeItem('al_followed_countries'));
    }
    expect(await call('GET')).toEqual({ status: 200, body: { countries: [] } });
  });

  test('COR-303 : lecture initiale en panne, reprise et modification pendant un PUT lent',async({page})=>{
    let gets=0,active=0,maxActive=0;const puts:string[][]=[];let account:string[]=[];
    let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
    await page.route('**/api/followed-countries',async route=>{
      if(route.request().method()==='GET') {
        if(++gets===1){await route.fulfill({status:500,json:{error:'fixture'}});return;}
      }else{
        active++;maxActive=Math.max(maxActive,active);
        const countries=route.request().postDataJSON().countries as string[];puts.push(countries);
        if(puts.length===1)await gate;
        account=countries;active--;
      }
      await route.fulfill({json:{countries:account}});
    });
    await page.goto('/app?country=SN');
    await expect.poll(()=>gets).toBe(1);
    const change=(codes:string[])=>page.evaluate(list=>{localStorage.setItem('al_followed_countries',JSON.stringify(list));window.dispatchEvent(new Event('al_followed_countries_change'));},codes);
    await change(['SN']);await page.evaluate(()=>window.dispatchEvent(new Event('online')));
    await expect.poll(()=>puts.length).toBe(1);
    await change(['CI','SN']);release();
    await expect.poll(()=>account).toEqual(['CI','SN']);
    expect(maxActive).toBe(1);
    expect(await page.evaluate(()=>localStorage.getItem('al_followed_countries'))).toBe('["CI","SN"]');
  });
});
