/**
 * Paiement NabooPay — tests E2E (Playwright)
 *
 * Les tests unitaires et d'intégration du tunnel de paiement (validation de
 * schéma, signature HMAC, logique de réconciliation) sont dans :
 *   src/lib/payment.test.ts  (npm test)
 *
 * Réception UI locale hors MVP : aucune transaction réelle. Les requêtes de
 * création sont interceptées, les pages publiques sont testées sans connexion.
 */

import { test, expect } from '@playwright/test';

test.describe('Page de paiement — interface utilisateur', () => {
  test.skip(process.env.LOCAL_DEV_MODE === 'true', 'Les offres sont redirigées en MVP ; réception sur le build hors MVP.');
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/checkout/naboopay', route => route.fulfill({
      status: 401, json: { error: 'Authentification requise.' },
    }));
  });
  test('Affiche la page /pricing avec les deux forfaits', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.getByRole('heading', { name: /Un seul accès/ })).toBeVisible();
    await expect(page.getByText('Abonnement Mensuel')).toBeVisible();
    await expect(page.getByText('Abonnement Annuel')).toBeVisible();
    await expect(page.getByPlaceholder('+221771234567')).toBeVisible();
  });

  test('Le refus de connexion est annoncé sans créer de paiement', async ({ page }) => {
    await page.goto('/pricing');
    await page.getByLabel('Prénom').fill('Test');
    await page.getByLabel('Nom', { exact: true }).fill('User');
    await page.getByPlaceholder('+221771234567').fill('+221771234567');
    await page.getByRole('button', { name: /Payer avec NabooPay/i }).first().click();
    await expect(page.getByRole('main').getByRole('alert')).toContainText('Veuillez vous connecter');
  });

  test('Affiche une erreur si le téléphone est mal formaté', async ({ page }) => {
    const creations: string[] = [];
    page.on('request', request => { if (request.url().includes('/api/checkout/naboopay')) creations.push(request.url()); });
    await page.goto('/pricing');
    await page.getByLabel('Prénom').fill('Test');
    await page.getByLabel('Nom', { exact: true }).fill('User');
    await page.getByPlaceholder('+221771234567').fill('0771234567');
    await page.getByRole('button', { name: /Payer avec NabooPay/i }).first().click();
    await expect(page.getByRole('main').getByRole('alert')).toContainText('+');
    expect(creations).toEqual([]);
  });

  test('Page /pricing/success affiche "Statut indisponible" sans order_id', async ({ page }) => {
    await page.goto('/pricing/success');
    await expect(page.getByRole('heading', { name: /Statut indisponible/i })).toBeVisible();
  });

  test('Page /pricing/error affiche un message d\'erreur générique', async ({ page }) => {
    await page.goto('/pricing/error');
    await expect(page.getByRole('heading', { name: 'Paiement non abouti' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Retour aux offres' })).toHaveAttribute('href', '/pricing');
  });
});
