import { expect, type Locator, type Page } from '@playwright/test';

/**
 * UX-209 : les filtres de la TV (catégorie, pays, langue, favoris) sont dans un tiroir unique à toutes les largeurs.
 * Ouvre le tiroir (en attendant l'hydratation), exécute l'action, puis le referme par « Voir les résultats ».
 */
export const filtersDrawer = (page: Page) => page.getByRole('dialog', { name: 'Filtres', exact: true });

export async function openFilters(page: Page): Promise<Locator> {
  const drawer = filtersDrawer(page);
  await expect(async () => {
    if (!(await drawer.isVisible())) await page.getByRole('button', { name: 'Ouvrir les filtres' }).click();
    await expect(drawer).toBeVisible({ timeout: 500 });
  }).toPass({ timeout: 15_000 });
  return drawer;
}

export async function closeFilters(page: Page) {
  const drawer = filtersDrawer(page);
  await drawer.getByRole('button', { name: 'Voir les résultats' }).click();
  await expect(drawer).toHaveCount(0);
}

export async function withFilters<T>(page: Page, action: (drawer: Locator) => Promise<T>): Promise<T> {
  const drawer = await openFilters(page);
  const result = await action(drawer);
  await closeFilters(page);
  return result;
}
