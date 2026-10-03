import { expect, type Locator, type Page } from '@playwright/test';
import { AFRICAN_COUNTRIES } from '../../src/lib/radar-countries';

/** Nom français affiché pour un code pays africain (source unique : la liste du Radar). */
export function countryName(code: string) {
  const country = AFRICAN_COUNTRIES.find(item => item.code === code);
  if (!country) throw new Error(`Pays inconnu dans la liste du Radar : ${code}`);
  return country.name;
}

/** Sélecteur de pays de la barre haute (combobox accessible « Choisir un pays »). */
export function countryPicker(page: Page): Locator {
  return page.getByRole('combobox', { name: 'Choisir un pays', exact: true });
}

/** Choisit un pays comme un utilisateur : ouvre la liste, saisit le nom, clique l'option. */
export async function selectCountry(page: Page, code: string) {
  const name = countryName(code);
  const input = countryPicker(page);
  await input.click();
  await input.fill(name);
  // La liste du sélecteur uniquement : la TV expose aussi des <option> natives du filtre « Pays ».
  await page.getByRole('listbox', { name: 'Choisir un pays' }).getByRole('option', { name, exact: true }).click();
}

/** Vérifie le pays affiché : code ou null (« Afrique · tous les pays », champ vide). */
export async function expectCountry(page: Page, code: string | null) {
  await expect(countryPicker(page)).toHaveValue(code ? countryName(code) : '');
}
