import { expect, test, type Page } from '@playwright/test';
import { fixtureRadar } from './helpers/radar-fixture';
import {
  fixtureCatalog,
  FIXTURE_CHANNELS,
  LOGO_HOST,
  mockResolutions,
  mockVlc,
  rowRequests,
  serveVideo,
} from './helpers/tv-fixture';

// P2 — TV « streaming » : tuiles, rangées, Reprendre, lecteur, zapping, partage, Éco data, filtres actifs.
test.use({ trace: 'off', screenshot: 'off' });

const region = (page: Page, name: string) => page.getByRole('region', { name, exact: true });
const distinctRows = (requests: Array<Record<string, unknown>>) =>
  new Set(rowRequests(requests).map(request => `${request.favoritesOnly}|${request.country}|${request.group}`));
const currentTime = (page: Page) => page.locator('video').evaluate(video => (video as HTMLVideoElement).currentTime);

async function openFromInfoRow(page: Page, name = 'Alpha Sénégal') {
  await region(page, 'Info').getByRole('button', { name: `Regarder ${name}`, exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

test.describe('Accueil en rangées', () => {
  test('Sénégal, Info, Sport et Musique, chargées à la demande puis gardées en session', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 700 });
    const { requests } = await fixtureCatalog(page);
    await page.goto('/app');
    await expect(region(page, 'Sénégal en direct')).toBeVisible();
    await expect(region(page, 'Info')).toBeVisible();
    await expect(page.locator('#catalogue')).toHaveAccessibleName('Tout le catalogue');

    // La première chaîne est visible sans défiler (au-dessus de la ligne de flottaison).
    const first = region(page, 'Sénégal en direct').getByRole('button', { name: 'Regarder Alpha Sénégal', exact: true });
    expect((await first.boundingBox())!.y).toBeLessThan(700 - 60);

    // Chargement paresseux : les rangées éloignées ne sont demandées qu'en approchant de l'écran.
    await page.waitForTimeout(600);
    expect(distinctRows(requests).size).toBeLessThan(5);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect.poll(() => distinctRows(requests).size).toBe(5);
    await expect(region(page, 'Sport')).toBeVisible();
    await expect(region(page, 'Musique')).toBeVisible();
    // Une rangée vide (aucun favori) n'est pas affichée.
    await expect(region(page, 'Mes favoris')).toHaveCount(0);

    // Gardées cinq minutes en session : un rechargement ne redemande que les favoris.
    requests.length = 0;
    await page.reload();
    await expect(region(page, 'Sénégal en direct')).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(region(page, 'Musique')).toBeVisible();
    expect(rowRequests(requests).filter(request => !request.favoritesOnly)).toHaveLength(0);
  });

  test('aucune tuile vide, libellés humains et noms accessibles uniques', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await fixtureCatalog(page);
    await page.goto('/app');
    await expect(region(page, 'Info')).toBeVisible();
    await expect(page.locator('#catalogue article')).toHaveCount(FIXTURE_CHANNELS.length);

    // Logo si disponible, sinon vignette (initiales) : jamais de carte vide.
    const emptyTiles = await page.locator('article').evaluateAll(tiles => tiles.filter(tile =>
      !tile.querySelector('img') && !(tile.querySelector('span[aria-hidden="true"]')?.textContent ?? '').trim()).length);
    expect(emptyTiles).toBe(0);
    await expect(page.locator('#catalogue article', { hasText: 'Alpha Sénégal' }).locator('img')).toHaveCount(1);
    await expect(page.locator('#catalogue article', { hasText: 'Beta Sénégal' }).getByText('BS', { exact: true })).toBeVisible();

    // Catégories : « Undefined » devient Généralistes, un composite se lit « Économie · Actualités ».
    const catalogue = page.locator('#catalogue');
    await expect(catalogue.getByText('Généralistes', { exact: true })).toHaveCount(1);
    await expect(catalogue.getByText('Économie · Actualités', { exact: true })).toHaveCount(1);
    await expect(catalogue.getByText(/Undefined|non renseignée/)).toHaveCount(0);

    // Deux chaînes « 2M Monde » restent distinguables pour un lecteur d'écran.
    const labels = await catalogue.locator('button[aria-label]').evaluateAll(buttons => buttons.map(button => button.getAttribute('aria-label')));
    expect(new Set(labels).size).toBe(labels.length);
    await expect(catalogue.getByRole('button', { name: 'Regarder 2M Monde, Maroc n° 1', exact: true })).toBeVisible();
    await expect(catalogue.getByRole('button', { name: 'Regarder 2M Monde, Maroc n° 2', exact: true })).toBeVisible();
  });

  test('focus itinérant : une seule tuile par rangée dans l’ordre de tabulation, flèches pour avancer', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await fixtureCatalog(page);
    await page.goto('/app');
    const row = region(page, 'Info');
    await expect(row).toBeVisible();
    await expect(row.locator('[data-tile-main][tabindex="0"]')).toHaveCount(1);
    const tiles = row.locator('[data-tile-main]');
    await tiles.nth(0).focus();
    await page.keyboard.press('ArrowRight');
    await expect(tiles.nth(1)).toBeFocused();
    await expect(row.locator('[data-tile-main][tabindex="0"]')).toHaveCount(1);
    await page.keyboard.press('End');
    await expect(tiles.last()).toBeFocused();
    await page.keyboard.press('Home');
    await expect(tiles.first()).toBeFocused();
  });
});

test.describe('Reprendre', () => {
  test('apparaît avec l’historique de l’appareil et s’efface d’un clic', async ({ page }) => {
    const recents = FIXTURE_CHANNELS.slice(0, 2);
    await page.addInitScript(items => localStorage.setItem('al_recent_channels', JSON.stringify(items)), recents);
    await fixtureCatalog(page);
    await page.goto('/app');
    const row = region(page, 'Reprendre');
    await expect(row).toBeVisible();
    await expect(row.getByRole('button', { name: /^Regarder / })).toHaveCount(2);
    await page.getByRole('button', { name: 'Effacer l’historique Reprendre' }).click();
    await expect(region(page, 'Reprendre')).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('al_recent_channels'))).toBeNull();
  });

  test('après une lecture, la chaîne rejoint Reprendre (seuls les champs publics sont gardés)', async ({ page }) => {
    await mockVlc(page);
    await serveVideo(page);
    await mockResolutions(page);
    await fixtureCatalog(page);
    await page.goto('/app');
    await expect(region(page, 'Reprendre')).toHaveCount(0);
    await openFromInfoRow(page);
    await expect.poll(() => currentTime(page)).toBeGreaterThan(0);
    await page.getByRole('button', { name: 'Fermer le lecteur' }).click();
    const stored = await page.evaluate(() => localStorage.getItem('al_recent_channels'));
    expect(JSON.parse(stored!).map((item: { id: string }) => item.id)).toEqual(['sn-1']);
    expect(stored).not.toMatch(/m3u8|sourceUrl|streams/);
    await page.reload();
    await expect(region(page, 'Reprendre').getByRole('button', { name: 'Regarder Alpha Sénégal', exact: true })).toBeVisible();
  });
});

test.describe('Lecteur : commandes, raccourcis et zapping', () => {
  test('commandes maison, raccourcis clavier et aide, sans commandes natives', async ({ page }) => {
    await mockVlc(page);
    await serveVideo(page);
    await mockResolutions(page);
    await page.goto('/player/test-browser');
    await expect.poll(() => currentTime(page)).toBeGreaterThan(0);
    expect(await page.locator('video').evaluate(video => (video as HTMLVideoElement).controls)).toBe(false);

    const toolbar = page.getByRole('toolbar', { name: 'Commandes du lecteur' });
    await expect(toolbar).toBeVisible();
    for (const name of ['Pause', 'Rétablir le son', 'Plein écran']) {
      const box = (await toolbar.getByRole('button', { name, exact: true }).boundingBox())!;
      expect(box.width, name).toBeGreaterThanOrEqual(44);
      expect(box.height, name).toBeGreaterThanOrEqual(44);
    }
    // Sans liste de zapping (lecteur ouvert directement), pas de chaîne précédente/suivante.
    await expect(page.getByRole('button', { name: 'Chaîne suivante' })).toHaveCount(0);

    // Pause / lecture par bouton puis par raccourcis K et Espace.
    await toolbar.getByRole('button', { name: 'Pause', exact: true }).click();
    await expect.poll(() => page.locator('video').evaluate(video => (video as HTMLVideoElement).paused)).toBe(true);
    await expect(toolbar.getByRole('button', { name: 'Lecture', exact: true })).toBeVisible();
    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await page.keyboard.press('k');
    await expect.poll(() => page.locator('video').evaluate(video => (video as HTMLVideoElement).paused)).toBe(false);
    await page.keyboard.press('Space');
    await expect.poll(() => page.locator('video').evaluate(video => (video as HTMLVideoElement).paused)).toBe(true);
    await page.keyboard.press('Space');
    await expect.poll(() => page.locator('video').evaluate(video => (video as HTMLVideoElement).paused)).toBe(false);

    // Son : la lecture automatique démarre muette ; M rétablit puis coupe.
    await expect(toolbar.getByRole('button', { name: 'Rétablir le son', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('m');
    await expect(toolbar.getByRole('button', { name: 'Couper le son', exact: true })).toHaveAttribute('aria-pressed', 'false');
    await page.keyboard.press('m');
    await expect(toolbar.getByRole('button', { name: 'Rétablir le son', exact: true })).toBeVisible();

    // Aide : ? l'ouvre, Échap la ferme d'abord.
    await page.keyboard.press('?');
    await expect(region(page, 'Raccourcis clavier')).toBeVisible();
    await expect(region(page, 'Raccourcis clavier')).toContainText('Plein écran');
    await page.keyboard.press('Escape');
    await expect(region(page, 'Raccourcis clavier')).toHaveCount(0);
  });

  test('zapping dans la modale : suivant, précédent, flèches, borne de liste et accès VLC manuel', async ({ page }) => {
    const intents = await mockVlc(page);
    await serveVideo(page);
    const resolutions = await mockResolutions(page, { external: ['ci-1'] });
    await fixtureCatalog(page);
    await page.goto('/app');
    await openFromInfoRow(page, 'Alpha Sénégal');
    await expect.poll(() => currentTime(page)).toBeGreaterThan(0);
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('button', { name: 'Chaîne précédente' })).toBeDisabled();

    // Suivant : une chaîne qui exige VLC ne lance jamais VLC pendant le zapping.
    await dialog.getByRole('button', { name: 'Chaîne suivante' }).click();
    await expect(dialog.getByRole('heading', { name: 'Canal Ivoire', level: 2 })).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Lecteur VLC requis' })).toBeVisible();
    await page.waitForTimeout(800);
    expect(intents).toHaveLength(0);
    await dialog.getByRole('button', { name: 'Lancer VLC', exact: true }).click();
    await expect.poll(() => intents.length).toBe(1);
    expect(intents[0].channelId).toBe('ci-1');

    // Les flèches avancent dans la même liste ; la liste d'origine est celle de la rangée Info.
    await page.keyboard.press('ArrowRight');
    await expect(dialog.getByRole('heading', { name: '2M Monde', level: 2 })).toBeVisible();
    await page.keyboard.press('ArrowLeft');
    await expect(dialog.getByRole('heading', { name: 'Canal Ivoire', level: 2 })).toBeVisible();
    expect(resolutions.slice(0, 2)).toEqual(['sn-1', 'ci-1']);

    // Échap ferme l'aide avant la fenêtre.
    await page.keyboard.press('?');
    await expect(region(page, 'Raccourcis clavier')).toHaveCount(0); // lecteur VLC : commandes inactives
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('un choix direct d’une chaîne VLC la lance automatiquement une seule fois', async ({ page }) => {
    const intents = await mockVlc(page);
    await mockResolutions(page, { external: ['fr-1'] });
    await fixtureCatalog(page);
    await page.goto('/app');
    await openFromInfoRow(page, 'Zeta France');
    await expect(page.getByRole('heading', { name: 'VLC lancé' })).toBeVisible();
    expect(intents).toHaveLength(1);
    expect(intents[0].channelId).toBe('fr-1');
  });

  test('zapping dans la fenêtre séparée grâce à la liste transmise par le catalogue', async ({ page }) => {
    await mockVlc(page);
    await serveVideo(page);
    const resolutions = await mockResolutions(page);
    await page.addInitScript(items => localStorage.setItem('al_zap_list', JSON.stringify({ savedAt: Date.now(), entries: items })), FIXTURE_CHANNELS.slice(0, 3));
    await page.goto('/player/sn-1');
    await expect.poll(() => currentTime(page)).toBeGreaterThan(0);
    await expect(page.getByRole('button', { name: 'Chaîne précédente' })).toBeDisabled();
    await page.getByRole('button', { name: 'Chaîne suivante' }).click();
    await expect(page).toHaveURL(/\/player\/sn-2$/);
    await expect.poll(() => resolutions.includes('sn-2')).toBe(true);
    await expect.poll(() => currentTime(page)).toBeGreaterThan(0);
    const stored = JSON.parse((await page.evaluate(() => localStorage.getItem('al_recent_channels')))!);
    expect(stored.map((item: { id: string }) => item.id)).toContain('sn-2');
  });
});

test.describe('Partage WhatsApp', () => {
  test('une chaîne : titre et lien du lecteur Africa Live, jamais l’URL du flux', async ({ page }) => {
    await fixtureCatalog(page);
    await page.goto('/app');
    const link = region(page, 'Info').getByRole('link', { name: 'Partager Alpha Sénégal sur WhatsApp', exact: true });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', /noopener/);
    const href = (await link.getAttribute('href'))!;
    expect(href.startsWith('https://wa.me/?text=')).toBe(true);
    const text = decodeURIComponent(href.split('?text=')[1]);
    expect(text).toContain('Alpha Sénégal');
    expect(text).toContain('/player/sn-1');
    expect(text).not.toMatch(/m3u8|media\.fixture|logos\.fixture/);
  });

  test('une dépêche : titre, rédaction, article de l’éditeur et origine Africa Live', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await fixtureRadar(page, { weatherOk: true });
    await page.goto('/app/live?country=SN');
    const link = page.getByRole('link', { name: /^Partager « Dépêche Sénégal récente » sur WhatsApp$/ }).first();
    await expect(link).toBeVisible();
    const text = decodeURIComponent((await link.getAttribute('href'))!.split('?text=')[1]);
    expect(text).toContain('Dépêche Sénégal récente');
    expect(text).toMatch(/\nhttps?:\/\/\S+\n/);
    expect(text).toContain('Via Africa Live :');
  });
});

test.describe('Éco data', () => {
  test('la bascule retire les logos, s’applique avant l’affichage et survit au rechargement', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    const { logoRequests } = await fixtureCatalog(page);
    await page.goto('/app');
    await expect(region(page, 'Info')).toBeVisible();
    await expect.poll(() => logoRequests.length).toBeGreaterThan(0);
    const toggle = page.getByRole('button', { name: 'Mode Éco data', exact: true });
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('html')).toHaveAttribute('data-eco', 'true');
    expect(await page.evaluate(() => localStorage.getItem('al_eco'))).toBe('true');

    logoRequests.length = 0;
    await page.reload();
    await expect(region(page, 'Info')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-eco', 'true');
    await expect(page.locator('article', { hasText: 'Alpha Sénégal' }).first().getByText('AS', { exact: true })).toBeVisible();
    await page.waitForTimeout(400);
    expect(logoRequests.filter(url => url.startsWith(LOGO_HOST))).toHaveLength(0);
  });

  test('Save-Data active le mode par défaut ; le choix de l’utilisateur reste prioritaire', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: { saveData: true }, configurable: true }));
    await fixtureCatalog(page);
    await page.goto('/app');
    const toggle = page.getByRole('button', { name: 'Mode Éco data', exact: true });
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await page.reload();
    await expect(page.getByRole('button', { name: 'Mode Éco data', exact: true })).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('html')).not.toHaveAttribute('data-eco', 'true');
  });

  test('lecture à la demande : le flux est préparé mais aucun segment n’est chargé avant « Lire maintenant »', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('al_eco', 'true'));
    await mockVlc(page);
    const served = await serveVideo(page);
    await mockResolutions(page);
    await fixtureCatalog(page);
    await page.goto('/app');
    await openFromInfoRow(page);
    const play = page.getByRole('button', { name: 'Lire maintenant', exact: true });
    await expect(play).toBeVisible();
    await page.waitForTimeout(800);
    expect(served.filter(name => name.endsWith('.ts'))).toHaveLength(0);
    await play.click();
    await expect.poll(() => currentTime(page)).toBeGreaterThan(0);
    expect(served.some(name => name.endsWith('.ts'))).toBe(true);
  });

  test('la carte du Radar s’ouvre sur le fond sombre léger', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.addInitScript(() => localStorage.setItem('al_eco', 'true'));
    await fixtureRadar(page, { weatherOk: true });
    await page.goto('/app/live');
    await expect(page.getByRole('button', { name: /Sombre/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: /Satellite/ })).toHaveAttribute('aria-pressed', 'false');
  });
});

test.describe('Filtres actifs', () => {
  test('pastilles retirables, compteur et « Tout effacer »', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await fixtureCatalog(page);
    await page.goto('/app?country=SN&group=News');
    const chips = page.getByRole('group', { name: 'Filtres actifs' });
    await expect(chips).toBeVisible();
    await expect(chips.getByText('2 filtres', { exact: true })).toBeVisible();
    await expect(chips.getByRole('button', { name: 'Retirer le filtre Sénégal', exact: true })).toBeVisible();
    await expect(chips.getByRole('button', { name: 'Retirer le filtre Actualités', exact: true })).toBeVisible();

    await chips.getByRole('button', { name: 'Retirer le filtre Sénégal', exact: true }).click();
    await expect(page).toHaveURL(/group=News/);
    expect(new URL(page.url()).searchParams.has('country')).toBe(false);
    await expect(chips.getByText('1 filtre', { exact: true })).toBeVisible();

    await chips.getByRole('button', { name: 'Tout effacer', exact: true }).click();
    expect(new URL(page.url()).search).toBe('');
    await expect(page.getByRole('group', { name: 'Filtres actifs' })).toHaveCount(0);
    // Sans filtre, l'accueil en rangées revient.
    await expect(region(page, 'Info')).toBeVisible();
  });
});
