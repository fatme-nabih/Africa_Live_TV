import { expect, test, type Page } from '@playwright/test';
import { fixtureRadar } from './helpers/radar-fixture';
import { fixtureCatalog, mockResolutions, mockVlc, serveVideo } from './helpers/tv-fixture';

// P5 / UX-508 — Audit axe-core (WCAG 2.1 A et AA) des états interactifs ajoutés en P5, et contrôle clavier.
const AXE = require.resolve('axe-core/axe.min.js');

async function axeViolations(page: Page) {
  await page.addScriptTag({ path: AXE });
  return page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: (context: Document, options: object) => Promise<{ violations: Array<{ id: string; nodes: unknown[] }> }> } }).axe;
    const result = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } });
    return result.violations.map(violation => `${violation.id} ×${violation.nodes.length}`);
  });
}

test.describe('Accessibilité des états P5 (UX-508)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await mockVlc(page);
    await serveVideo(page);
    await mockResolutions(page);
    await fixtureCatalog(page);
    await fixtureRadar(page, { weatherOk: true });
  });

  test('lecteur agrandi puis réduit : aucune violation, focus piégé dans la fenêtre puis rendu à la page', async ({ page }) => {
    await page.goto('/app');
    await page.getByRole('region', { name: 'Info', exact: true }).getByRole('button', { name: 'Regarder Alpha Sénégal', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(page.getByRole('button', { name: 'Fermer le lecteur' })).toBeFocused();
    expect(await axeViolations(page)).toEqual([]);
    // Tab reste dans la fenêtre.
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
    }
    await page.getByRole('button', { name: 'Réduire le lecteur' }).click();
    await expect(page.getByRole('region', { name: 'Mini-lecteur', exact: true })).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);
  });

  test('palette de recherche : aucune violation, liste annoncée et navigable au clavier', async ({ page }) => {
    await page.goto('/app/live');
    await expect(async () => {
      await page.keyboard.press('Control+k');
      await expect(page.getByRole('dialog', { name: 'Recherche universelle' })).toBeVisible({ timeout: 500 });
    }).toPass({ timeout: 15_000 });
    await page.keyboard.type('se');
    await expect(page.getByRole('option').first()).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);
    const combobox = page.getByRole('combobox', { name: /Rechercher un pays/ });
    const first = await combobox.getAttribute('aria-activedescendant');
    await page.keyboard.press('ArrowDown');
    expect(await combobox.getAttribute('aria-activedescendant')).not.toBe(first);
  });
});
