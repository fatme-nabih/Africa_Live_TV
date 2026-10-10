import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => new URL(route.request().url()).origin === 'http://127.0.0.1:3001' ? route.continue() : route.abort());
  await page.addInitScript(() => {
    document.addEventListener('click', event => {
      if ((event.target as Element).closest('a')?.href.includes('naboopay.com')) event.preventDefault();
    }, true);
  });
});

async function fill(page: import('@playwright/test').Page) {
  await page.getByLabel('Prénom').fill('Test');
  await page.getByLabel('Nom', { exact: true }).fill('User');
  await page.getByPlaceholder('+221771234567').fill('+221771234567');
}

for (const status of ['completed', 'failed', 'canceled', 'refunded']) {
  for (const url of [null, 'https://checkout.naboopay.com/old']) {
    test(`B01: ${status}, URL=${Boolean(url)} releases only the finished attempt on next click`, async ({ page }) => {
      const keys: string[] = [];
      await page.route('**/api/checkout/naboopay', route => {
        keys.push(route.request().postDataJSON().idempotencyKey);
        return route.fulfill({ json: { status, checkout_url: url, checkout_attempt_id: 'old' } });
      });
      await page.goto('/?kind=pricing'); await fill(page);
      const button = page.getByRole('button', { name: 'Activer pour 990 FCFA' });
      await button.click();
      await expect(page.getByRole('alert')).toBeVisible();
      expect(keys).toHaveLength(1);
      await button.click(); await expect(button).toBeEnabled();
      expect(keys).toHaveLength(2); expect(keys[1]).not.toBe(keys[0]);
    });
  }
}

test('B01: uncertain response and tracking survive reload; no duplicate while fetch is pending', async ({ page }) => {
  const keys: string[] = [];
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/checkout/naboopay', async route => {
    keys.push(route.request().postDataJSON().idempotencyKey);
    if (keys.length === 1) await held;
    await route.fulfill({ json: { status: 'pending', checkout_url: null, checkout_attempt_id: 'uncertain' } });
  });
  await page.goto('/?kind=pricing'); await fill(page);
  const button = page.getByRole('button', { name: 'Activer pour 990 FCFA' });
  await button.click(); await expect(page.getByRole('button', { name: 'Ouverture du paiement…' })).toBeDisabled();
  expect(keys).toHaveLength(1); release();
  await expect(page.getByRole('link', { name: 'Suivre la vérification du paiement' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('link', { name: 'Suivre la vérification du paiement' })).toBeVisible();
  await fill(page); await button.click(); await expect(button).toBeEnabled();
  expect(keys).toHaveLength(2); expect(keys[1]).toBe(keys[0]);
});

for (const unavailable of [false, true]) test(`B01: invalid/network responses keep uncertainty (Storage denied=${unavailable})`, async ({ page }) => {
  if (unavailable) await page.addInitScript(() => { Object.defineProperty(window, 'sessionStorage', { get() { throw new Error('denied'); } }); });
  const keys: string[] = [];
  await page.route('**/api/checkout/naboopay', route => {
    keys.push(route.request().postDataJSON().idempotencyKey);
    return keys.length === 1 ? route.fulfill({ json: { invalid: true } }) : route.abort();
  });
  await page.goto('/?kind=pricing'); await fill(page);
  const button = page.getByRole('button', { name: 'Activer pour 990 FCFA' });
  await button.click(); await expect(page.getByRole('alert')).toContainText('invalide');
  await button.click(); await expect(page.getByRole('alert')).toContainText('Connexion interrompue');
  expect(keys).toHaveLength(2); expect(keys[1]).toBe(keys[0]);
});

test('B01: confirmation of A does not clear the later uncertain B', async ({ page }) => {
  const key = '11111111-1111-4111-8111-111111111111';
  await page.addInitScript(({ key }) => sessionStorage.setItem('al_checkout_attempt_lumina_all_access_monthly', JSON.stringify({ key, attemptId: 'B' })), { key });
  await page.route('**/api/checkout/status?*', route => route.fulfill({ json: { status: 'completed', checkout_attempt_id: 'A', plan: 'lumina_all_access_monthly', amount: 990, currency: 'XOF' } }));
  await page.goto('/?kind=success&order_id=A');
  await expect(page.getByRole('heading', { name: 'Paiement réussi' })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('al_checkout_attempt_lumina_all_access_monthly')!).attemptId)).toBe('B');
});
test('B01: late creation response A cannot replace a different uncertain B in memory', async ({ page }) => {
  let release!:()=>void; const held = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/checkout/naboopay',async route => { await held; await route.fulfill({ json:{ status:'completed',checkout_url:'https://checkout.naboopay.com/old',checkout_attempt_id:'A' } }); });
  await page.goto('/?kind=pricing'); await fill(page);
  await page.getByRole('button',{ name:'Activer pour 990 FCFA' }).click(); await page.getByRole('button',{ name:'Replace attempt' }).click(); release();
  await expect(page.getByRole('link',{ name:'Suivre la vérification du paiement' })).toHaveAttribute('href','/pricing/success?order_id=B');
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('al_checkout_attempt_lumina_all_access_monthly')!).attemptId)).toBe('B');
});
test('B01: returning an existing uncertain reservation adopts its actual server key on reload', async ({ page }) => {
  const keys:string[] = [], actual = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  await page.route('**/api/checkout/naboopay',route => { keys.push(route.request().postDataJSON().idempotencyKey); return route.fulfill({ json:{ status:'pending',checkout_url:null,checkout_attempt_id:'existing',idempotency_key:actual } }); });
  await page.goto('/?kind=pricing'); await fill(page); await page.getByRole('button',{ name:'Activer pour 990 FCFA' }).click();
  await expect(page.getByRole('alert')).toContainText('vérification'); await page.reload(); await fill(page); await page.getByRole('button',{ name:'Activer pour 990 FCFA' }).click();
  await expect(page.getByRole('button',{ name:'Activer pour 990 FCFA' })).toBeEnabled(); expect(keys[1]).toBe(actual);
});
