import { expect, test, type Page } from '@playwright/test';
import { fixtureRadar } from './helpers/radar-fixture';
import { fixtureArabicRadar } from './helpers/arabic-fixture';

const enabled = (process.env.EDITIONS ?? '').split(',').includes('en');
test.skip(!enabled, 'Réception E3 avec EDITIONS=fr,en');

async function englishRadar(page: Page) {
  await fixtureRadar(page);
  const at = new Date().toISOString();
  await page.route('**/api/live/rss?edition=en', route => route.fulfill({ json: {
    articles: [{ id: 'en-story', title: 'Nigeria announces new schools in Lagos', url: 'https://example.org/english-story', domain: 'punchng.com', sourceName: 'Punch', sourceType: 'rss', countryCode: 'NG', editorialScope: 'africa', countryBasis: 'inferred_topic', category: 'Education', publishedAt: at }],
    sources: [], updatedAt: at, stale: false, availability: [],
  } }));
  await page.route('**/api/live/world*edition=en*', route => route.fulfill({ json: {
    articles: [{ id: 'en-world', title: 'Ukraine talks continue in Kyiv', url: 'https://example.org/world', sourceName: 'BBC', origin: 'Royaume-Uni', publishedAt: at, region: 'europe', regionBasis: 'inferred', africanCountries: [], touchesAfrica: false }],
    updatedAt: at, availability: [],
  } }));
  await page.route('**/api/live/markets*edition=en*', route => route.fulfill({ json: {
    commodities: [], alerts: [], updatedAt: at, availability: [], disclaimer: '',
    forex: ['NGN', 'GHS', 'KES', 'ZAR'].map((quote, i) => ({ pair: 'USD / ' + quote, base: 'USD', quote, rate: 100 + i, label: 'Indicative', isPegged: false, updatedAt: at, source: 'Fixture' })),
  } }));
}

test('EDI-308: cookie EN, anglais, bouquet explicite, météo Nigeria et retour FR par clavier', async ({ page, context }) => {
  test.skip(process.env.LOCAL_DEV_MODE !== 'true', 'Scénario cockpit MVP');
  await context.addCookies([{ name: 'al_edition', value: 'en', domain: 'localhost', path: '/' }]);
  await englishRadar(page);
  const requests: string[] = []; page.on('request', request => { if (request.url().includes('/api/live/')) requests.push(request.url()); });
  await page.goto('/app/live');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { name: 'Africa Radar', exact: true })).toBeVisible();
  await expect(page.getByText('Nigeria announces new schools in Lagos').first()).toBeVisible();
  await expect.poll(() => requests.some(url => url.endsWith('/api/live/rss?edition=en'))).toBe(true);
  await expect.poll(() => requests.some(url => url.includes('/api/live/markets?edition=en'))).toBe(true);
  await expect.poll(() => requests.some(url => /api\/live\/weather.*code=NG/.test(url))).toBe(true);
  await page.getByRole('button', { name: 'Choose an edition', exact: true }).click();
  await expect(page.getByRole('radiogroup', { name: 'Choose an edition' })).toBeVisible();
  await page.getByRole('radio', { name: 'English', exact: true }).press('ArrowLeft');
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await expect(page.getByRole('heading', { name: 'Radar Afrique', exact: true })).toBeVisible();
  expect(new URL(page.url()).pathname).toBe('/app/live');
});

test('EDI-308: pages publiques explicites et prix anglais en FCFA, carte internationale prioritaire', async ({ page, context }) => {
  test.skip(process.env.LOCAL_DEV_MODE === 'true', 'Pages publiques du build Clerk');
  await context.clearCookies();
  await page.goto('/'); await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await page.goto('/en'); await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByText('Choose your edition: each language has its own Radar sources.')).toBeVisible();
  await page.goto('/en/pricing');
  await expect(page.getByRole('heading', { name: 'One pass, all of Africa live.' })).toBeVisible();
  await expect(page.getByText(/international bank card.*Senegal.*WAEMU/).first()).toBeVisible();
  await expect(page.getByRole('list', { name: 'Accepted payment methods' }).locator('li').first()).toContainText('International bank card');
  await expect(page.getByText('FCFA', { exact: true }).first()).toBeVisible();
});

for (const width of [360, 768, 1366]) test(`EDI-308: anglais ${width}px, Éco et mouvement réduit sans débordement`, async ({ page, context }) => {
  test.skip(process.env.LOCAL_DEV_MODE !== 'true', 'Scénario cockpit MVP');
  await context.addCookies([{ name: 'al_edition', value: 'en', domain: 'localhost', path: '/' }]);
  await page.setViewportSize({ width, height: 850 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.setItem('al_eco', 'true'));
  await englishRadar(page); await page.goto('/app/live');
  await expect(page.getByRole('heading', { name: 'Africa Radar', exact: true })).toBeVisible();
  await expect(page.getByText('Nigeria announces new schools in Lagos').first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator('html')).toHaveAttribute('data-eco', 'true');
});

// EDI-404 : édition arabe (droite → gauche), seulement quand le build et le serveur activent `ar`.
const arabic = (process.env.EDITIONS ?? '').split(',').includes('ar');

test.describe('EDI-404 : édition arabe', () => {
  test.skip(!arabic, 'Réception E4 avec EDITIONS=fr,en,ar');

  test('cookie AR : html rtl, Radar arabe, bouquet ar, Algérie, recherche arabe et « نظرة على العالم » rempli', async ({ page, context }) => {
    test.skip(process.env.LOCAL_DEV_MODE !== 'true', 'Scénario cockpit MVP');
    await context.addCookies([{ name: 'al_edition', value: 'ar', domain: 'localhost', path: '/' }]);
    await fixtureArabicRadar(page);
    const requests: string[] = []; page.on('request', request => { if (request.url().includes('/api/live/')) requests.push(request.url()); });
    await page.goto('/app/live');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByRole('heading', { name: 'رادار أفريقيا', exact: true })).toBeVisible();
    await expect(page.getByText('وضعية آيت نوري تتعقّد').first()).toBeVisible();
    await expect.poll(() => requests.some(url => url.endsWith('/api/live/rss?edition=ar'))).toBe(true);
    await expect.poll(() => requests.some(url => url.includes('/api/live/markets?edition=ar'))).toBe(true);
    await expect.poll(() => requests.some(url => /api\/live\/weather.*code=DZ/.test(url))).toBe(true);
    // Lieu météo dans la langue de l'édition (le contrat serveur reste français).
    await expect(page.getByText('الجزائر · النقطة المرجعية').first()).toBeVisible();
    await expect(page.getByText('Point de référence', { exact: false })).toHaveCount(0);
    // Recherche arabe effective dans le fil.
    await page.getByRole('searchbox', { name: 'البحث في الأخبار' }).fill('آيت');
    await expect(page.getByText('عُثر على خبر واحد، بما في ذلك «أبرز الأخبار»')).toBeVisible();
    // « Regards sur le monde » : régions déduites, origine traduite, RT Arabic signalé comme média d'État (D6).
    await page.locator('#regards-monde').scrollIntoViewIfNeeded();
    await expect(page.getByText('محادثات جديدة في كييف بشأن وقف إطلاق النار')).toBeVisible();
    await expect(page.getByText('روسيا · وسيلة إعلام حكومية')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });

  test('bandeau : défilement inversé en arabe, arrêt au survol ; français inchangé', async ({ page, context }) => {
    test.skip(process.env.LOCAL_DEV_MODE !== 'true', 'Scénario cockpit MVP');
    await page.setViewportSize({ width: 1366, height: 850 }); await page.emulateMedia({ reducedMotion: 'no-preference' });
    await context.addCookies([{ name: 'al_edition', value: 'ar', domain: 'localhost', path: '/' }]);
    await fixtureArabicRadar(page);
    await page.goto('/app/live');
    const track = page.locator('.ticker-wire .animate-marquee');
    await expect(track).toBeVisible();
    await expect.poll(() => track.evaluate(element => getComputedStyle(element).animationName)).toBe('marquee-scroll-rtl');
    await page.locator('.ticker-wire').hover();
    await expect.poll(() => track.evaluate(element => getComputedStyle(element).animationPlayState)).toBe('paused');
    await context.addCookies([{ name: 'al_edition', value: 'fr', domain: 'localhost', path: '/' }]);
    await page.goto('/app/live');
    await expect(page.locator('html')).not.toHaveAttribute('dir', /.+/);
    await expect.poll(() => page.locator('.ticker-wire .animate-marquee').evaluate(element => getComputedStyle(element).animationName)).toBe('marquee-scroll');
  });

  test('clavier : en arabe la flèche droite revient à l’édition précédente ; police arabe seulement en arabe', async ({ page, context }) => {
    test.skip(process.env.LOCAL_DEV_MODE !== 'true', 'Scénario cockpit MVP');
    await context.addCookies([{ name: 'al_edition', value: 'ar', domain: 'localhost', path: '/' }]);
    await fixtureArabicRadar(page);
    const fonts: string[] = []; page.on('request', request => { if (request.resourceType() === 'font') fonts.push(request.url()); });
    await page.goto('/app/live');
    await expect(page.getByRole('heading', { name: 'رادار أفريقيا', exact: true })).toBeVisible();
    expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toMatch(/Cairo/);
    // La police arabe est réellement téléchargée (et non remplacée par une face de repli locale).
    await expect.poll(() => page.evaluate(() => [...document.fonts].some(face => face.family === 'Cairo' && face.status === 'loaded'))).toBe(true);
    expect(fonts.length).toBeGreaterThan(0);
    await page.getByRole('button', { name: 'اختر نسخة', exact: true }).click();
    await page.getByRole('radio', { name: 'العربية', exact: true }).press('ArrowRight');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).not.toHaveAttribute('dir', /.+/);
    expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).not.toMatch(/Cairo/);
  });

  for (const width of [360, 768, 1366]) test(`arabe ${width}px, Éco et mouvement réduit sans débordement`, async ({ page, context }) => {
    test.skip(process.env.LOCAL_DEV_MODE !== 'true', 'Scénario cockpit MVP');
    await context.addCookies([{ name: 'al_edition', value: 'ar', domain: 'localhost', path: '/' }]);
    await page.setViewportSize({ width, height: 850 }); await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(() => localStorage.setItem('al_eco', 'true'));
    await fixtureArabicRadar(page); await page.goto('/app/live');
    await expect(page.getByRole('heading', { name: 'رادار أفريقيا', exact: true })).toBeVisible();
    await expect(page.getByText('وضعية آيت نوري تتعقّد').first()).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-eco', 'true');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const path of ['/app', '/account', '/pricing']) {
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), path).toBe(true);
    }
  });

  test('pages publiques : /ar en rtl, prix FCFA et carte internationale d’abord ; / reste français', async ({ page, context }) => {
    test.skip(process.env.LOCAL_DEV_MODE === 'true', 'Pages publiques du build Clerk');
    await context.clearCookies();
    await page.goto('/'); await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await expect(page.locator('html')).not.toHaveAttribute('dir', /.+/);
    await page.goto('/ar'); await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByText('اختر نسختك: لكل لغة مصادرها الخاصة في الرادار.')).toBeVisible();
    await page.goto('/ar/pricing');
    await expect(page.getByRole('heading', { name: 'وصول واحد، وأفريقيا كلها مباشرة.' })).toBeVisible();
    await expect(page.getByRole('list', { name: 'وسائل الدفع المقبولة' }).locator('li').first()).toContainText('بطاقة مصرفية دولية');
    await expect(page.getByText('FCFA', { exact: true }).first()).toBeVisible();
  });
});

// EDI-505 : pages publiques par édition (build Clerk), métadonnées, liens et suggestion de langue.
test.describe('EDI-505 : pages publiques par édition', () => {
  test.skip(!enabled || !arabic, 'Réception E5 avec EDITIONS=fr,en,ar');
  test.skip(process.env.LOCAL_DEV_MODE === 'true', 'Pages publiques du build Clerk');

  const head = (page: Page) => page.evaluate(() => ({
    canonical: document.querySelector('link[rel=canonical]')?.getAttribute('href'),
    hreflang: Object.fromEntries([...document.querySelectorAll('link[rel=alternate][hreflang]')]
      .map(link => [link.getAttribute('hreflang'), new URL(link.getAttribute('href')!, location.href).pathname])),
    ogImage: new URL(document.querySelector('meta[property="og:image"]')!.getAttribute('content')!, location.href).pathname,
  }));

  test('landing EN traduite, liens et métadonnées de l’édition ; FR inchangée', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/en');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('within sight.');
    await expect(page.getByRole('navigation', { name: 'Footer links' }).getByRole('link', { name: 'Privacy', exact: true })).toHaveAttribute('href', '/en/privacy');
    await expect(page.getByRole('link', { name: 'Start your 5-day free trial' })).toHaveAttribute('href', '/en/sign-up');
    expect(await head(page)).toEqual({ canonical: expect.stringMatching(/\/en$/), hreflang: { fr: '/', en: '/en', ar: '/ar', 'x-default': '/' }, ogImage: '/og-image-en.png' });
    // Visiter /en ne choisit rien : aucun préchargement de /en/sign-in ne doit poser le cookie d'édition.
    await page.waitForLoadState('networkidle');
    expect((await context.cookies()).some(cookie => cookie.name === 'al_edition')).toBe(false);
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('à portée de regard.');
    await expect(page.getByRole('navigation', { name: 'Liens du pied de page' }).getByRole('link', { name: 'Confidentialité', exact: true })).toHaveAttribute('href', '/privacy');
    expect((await head(page)).ogImage).toBe('/og-image.png');
  });

  test('CGU et confidentialité AR : rtl, « la version française fait foi », lien de contact de l’édition', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/ar/cgu');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByRole('heading', { level: 1, name: 'شروط الاستخدام والبيع' })).toBeVisible();
    await expect(page.getByText('النص الفرنسي هو النص المعتمد', { exact: false })).toBeVisible();
    await expect(page.getByRole('link', { name: 'الاتصال والإبلاغ' })).toHaveAttribute('href', '/ar/contact');
    expect(await head(page)).toMatchObject({ hreflang: { fr: '/cgu', en: '/en/cgu', ar: '/ar/cgu' }, ogImage: '/og-image-ar.png' });
    await page.goto('/ar/privacy');
    await expect(page.getByRole('heading', { level: 1, name: 'سياسة الخصوصية' })).toBeVisible();
    await page.goto('/cgu');
    await expect(page.getByText('La version française fait foi', { exact: false })).toHaveCount(0);
  });

  test('contact EN : formulaire traduit, e-mail de gauche à droite', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/en/contact');
    await expect(page.getByRole('heading', { level: 1, name: 'How can we help?' })).toBeVisible();
    await expect(page.getByLabel('Your email address *')).toHaveAttribute('dir', 'ltr');
    await expect(page.getByRole('combobox', { name: 'Subject of your request *' })).toContainText('Other request');
  });
});

test.describe('EDI-503 : suggestion de langue', () => {
  test.skip(!enabled || !arabic, 'Réception E5 avec EDITIONS=fr,en,ar');
  test.skip(process.env.LOCAL_DEV_MODE === 'true', 'Pages publiques du build Clerk');

  test('navigateur anglais sans cookie : proposition en anglais, sans redirection, puis choix ou fermeture mémorisée', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'en-GB' });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    const banner = page.getByRole('complementary', { name: 'Africa Live is also available in English.' });
    await expect(banner).toBeVisible();
    await banner.getByRole('button', { name: 'Dismiss the suggestion' }).click();
    await expect(banner).toHaveCount(0);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await page.waitForTimeout(500);
    await expect(banner).toHaveCount(0);
    await page.evaluate(() => localStorage.clear()); await page.reload();
    await page.getByRole('button', { name: 'Open the English edition' }).click();
    await expect(page).toHaveURL(/\/en$/);
    expect((await context.cookies()).find(cookie => cookie.name === 'al_edition')?.value).toBe('en');
    await context.close();
  });

  test('aucune suggestion avec un cookie d’édition ou un navigateur français', async ({ browser }) => {
    const arabicBrowser = await browser.newContext({ locale: 'ar-DZ' });
    await arabicBrowser.addCookies([{ name: 'al_edition', value: 'fr', domain: 'localhost', path: '/' }]);
    const page = await arabicBrowser.newPage();
    await page.goto('/'); await page.waitForTimeout(800);
    await expect(page.getByRole('complementary', { name: /متاحة أيضًا/ })).toHaveCount(0);
    await arabicBrowser.close();
    const french = await browser.newContext({ locale: 'fr-SN' });
    const frenchPage = await french.newPage();
    await frenchPage.goto('/'); await frenchPage.waitForTimeout(800);
    await expect(frenchPage.getByRole('complementary')).toHaveCount(0);
    await french.close();
  });
});

test.describe('EDI-601/602/603 : pont entre éditions, halo de la sphère et choix mémorisé', () => {
  test.skip(process.env.LOCAL_DEV_MODE !== 'true', 'Scénario cockpit MVP');
  const story = (id: string, at: string) => ({ id, title: `Dépêche Nigeria ${id}`, url: `https://example.org/${id}`, domain: 'example.org', sourceName: 'APS (Sénégal)', sourceType: 'rss', countryCode: 'NG', editorialScope: 'africa', countryBasis: 'inferred_topic', category: 'Politique', publishedAt: at });
  async function frenchRss(page: Page, stories: number, bridge: unknown) {
    const at = new Date().toISOString();
    await page.route('**/api/live/rss', route => route.fulfill({ json: { articles: Array.from({ length: stories }, (_, index) => story('ng-' + index, at)), sources: [], updatedAt: at, stale: false, availability: [], ...(bridge ? { bridge } : {}) } }));
  }
  // Le halo est retiré au bout de 2,4 s : on note toute apparition de l'attribut, pas seulement l'état final.
  const watchHalo = (page: Page) => page.addInitScript(() => {
    const seen: string[] = [];
    (window as unknown as { haloSeen: string[] }).haloSeen = seen;
    new MutationObserver(records => { for (const record of records) { const value = (record.target as Element).getAttribute('data-edition-halo'); if (value) seen.push(value); } })
      .observe(document, { subtree: true, attributes: true, attributeFilter: ['data-edition-halo'] });
  });
  const haloSeen = (page: Page) => page.evaluate(() => (window as unknown as { haloSeen: string[] }).haloSeen);
  const englishSphere = ['AO', 'BI', 'BW', 'CM', 'CV', 'EG', 'ER', 'ET', 'GH', 'GM', 'KE', 'LR', 'LS', 'LY', 'MU', 'MW', 'MZ', 'NA', 'NG', 'RW', 'SC', 'SD', 'SL', 'SO', 'SS', 'SZ', 'TZ', 'UG', 'ZA', 'ZM', 'ZW'];

  test('pont affiché sous les seuils ; le geste pose le cookie, mémorise le compte, ouvre le Radar du pays et allume la sphère une fois', async ({ page, context }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await englishRadar(page);
    await frenchRss(page, 2, [{ edition: 'en', counts: { NG: 9, SN: 4 }, updatedAt: new Date().toISOString() }]);
    const sent: unknown[] = [];
    await page.route('**/api/edition-preference', route => { sent.push(route.request().postDataJSON()); return route.fulfill({ json: { edition: 'en' } }); });
    await watchHalo(page);
    await page.goto('/app/live?country=NG');
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    const bridge = page.getByRole('button', { name: 'Nigéria se raconte surtout en anglais : 9 dépêches dans l’édition English' });
    await expect(bridge).toBeVisible();
    await expect(bridge.locator('bdi')).toHaveAttribute('lang', 'en');
    expect(await haloSeen(page)).toEqual([]);
    await bridge.click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    const url = new URL(page.url());
    expect(url.pathname + url.search).toBe('/app/live?country=NG');
    expect((await context.cookies()).find(cookie => cookie.name === 'al_edition')?.value).toBe('en');
    expect(sent).toEqual([{ edition: 'en', owner: expect.stringMatching(/^local:/) }]);
    await expect(page.locator('.maplibregl-canvas')).toBeVisible({ timeout: 30_000 });
    await expect.poll(() => haloSeen(page), { timeout: 15_000 }).toEqual([String(englishSphere.length)]);
    await expect(page.locator('[data-edition-halo]')).toHaveCount(0, { timeout: 5_000 });
    expect(await page.evaluate(() => sessionStorage.getItem('al_edition_changed'))).toBeNull();
    await page.reload();
    await expect(page.locator('.maplibregl-canvas')).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(3_000);
    expect(await haloSeen(page)).toEqual([]);
  });

  test('aucun pont avec 3 dépêches dans l’édition courante, ou moins de 5 ailleurs', async ({ page }) => {
    await fixtureRadar(page);
    await frenchRss(page, 3, [{ edition: 'en', counts: { NG: 40 }, updatedAt: new Date().toISOString() }]);
    await page.goto('/app/live?country=NG');
    await expect(page.getByText('Dépêche Nigeria ng-2').first()).toBeVisible();
    await expect(page.locator('[data-edition-bridge]')).toHaveCount(0);
    await page.unrouteAll({ behavior: 'ignoreErrors' });
    await fixtureRadar(page);
    await frenchRss(page, 0, [{ edition: 'en', counts: { NG: 4 }, updatedAt: new Date().toISOString() }, { edition: 'ar', counts: { NG: 3 }, updatedAt: new Date().toISOString() }]);
    await page.reload();
    await expect(page.getByText('Aucune dépêche pour : Nigéria')).toBeVisible();
    await expect(page.locator('[data-edition-bridge]')).toHaveCount(0);
  });

  for (const calm of ['mouvement réduit', 'Éco'] as const) test(`aucun halo en ${calm}, et la marque est consommée`, async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    if (calm === 'mouvement réduit') await page.emulateMedia({ reducedMotion: 'reduce' });
    await fixtureRadar(page);
    await watchHalo(page);
    await page.goto('/app/live');
    await page.evaluate(eco => { sessionStorage.setItem('al_edition_changed', 'fr'); if (eco) localStorage.setItem('al_eco', 'true'); }, calm === 'Éco');
    await page.reload();
    if (calm === 'Éco') await expect(page.locator('html')).toHaveAttribute('data-eco', 'true');
    await expect(page.locator('.maplibregl-canvas')).toBeVisible({ timeout: 30_000 });
    await expect.poll(() => page.evaluate(() => sessionStorage.getItem('al_edition_changed')), { timeout: 15_000 }).toBeNull();
    await page.waitForTimeout(1_000);
    expect(await haloSeen(page)).toEqual([]);
  });
});
