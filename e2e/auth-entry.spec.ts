import { expect, test } from '@playwright/test';

test('landing page offers sign-in and sign-up without exposing the catalogue', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /L’Afrique à portée de regard/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Commencer', exact: true })).toHaveAttribute('href', '/sign-up');
  await expect(page.getByRole('link', { name: 'Se connecter' }).first()).toHaveAttribute('href', '/sign-in');
  await expect(page.getByRole('link', { name: 'Administration', exact: true })).toHaveCount(0);
  await expect(page.locator('#catalogue')).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

function isMockClerkKey(value: string | undefined) {
  if (!value) return true;
  const encodedDomain = value.replace(/^pk_(?:test|live)_/, '');
  const decodedDomain = Buffer.from(encodedDomain, 'base64').toString('utf8');
  return /example\.com|placeholder/i.test(`${value} ${decodedDomain}`);
}

const isMockClerk = isMockClerkKey(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

test('Clerk sign-in and sign-up widgets load', async ({ page }) => {
  test.skip(isMockClerk, 'Clerk live widgets require a valid Clerk development instance');
  await page.goto('/sign-in');
  await expect(page.getByRole('heading', { name: 'Ravi de vous retrouver' })).toBeVisible();
  await expect(page.locator('.cl-signIn-root')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.cl-signIn-root input').first()).toBeVisible();
  await page.goto('/sign-up');
  await expect(page.locator('.cl-signUp-root')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.cl-signUp-root input').first()).toBeVisible();
});

test('anonymous visitors cannot access app, account, admin or protected APIs', async ({ page }) => {
  for (const path of ['/app/live', '/app', '/account', '/admin']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/sign-in(?:[/?]|$)/);
  }
  for (const path of ['/api/favorites', '/api/followed-countries', '/api/channels',
    '/api/live/news', '/api/live/rss', '/api/live/weather', '/api/live/events',
    '/api/live/firms', '/api/live/markets', '/api/live/briefing', '/api/live/channels']) {
    const response = await page.request.get(path, { maxRedirects: 0 });
    expect([401, 403, 404, 307]).toContain(response.status());
    const body = await response.text();
    expect(body).not.toContain('sourceUrl');
    expect(body).not.toContain('"channels":');
    expect(body).not.toContain('"favorites":');
    expect(body).not.toContain('"articles":');
    expect(body).not.toContain('"commodities":');
  }
});
