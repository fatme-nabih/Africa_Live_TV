import assert from 'node:assert/strict';
import test from 'node:test';

import { applyEco, ECO_BOOT_SCRIPT, effectiveEco, writeEco } from './eco-mode';

test('le choix de l’utilisateur prime ; sans choix, Save-Data du navigateur décide', () => {
  assert.equal(effectiveEco('true', false), true);
  assert.equal(effectiveEco('false', true), false);
  assert.equal(effectiveEco(null, true), true);
  assert.equal(effectiveEco(null, false), false);
  assert.equal(effectiveEco('n’importe quoi', false), false);
});

test('le mode s’applique à la page par l’attribut data-eco et se retire proprement', () => {
  const root = { dataset: {} as DOMStringMap };
  applyEco(true, root);
  assert.equal(root.dataset.eco, 'true');
  applyEco(false, root);
  assert.equal('eco' in root.dataset, false);
});

test('writeEco enregistre, applique et notifie ; un stockage indisponible ne bloque pas le choix', () => {
  const store = new Map<string, string>();
  const root = { dataset: {} as DOMStringMap };
  let notified = 0;
  writeEco(true, { getItem: key => store.get(key) ?? null, setItem: (key, value) => { store.set(key, value); } }, root, () => { notified += 1; });
  assert.equal(store.get('al_eco'), 'true');
  assert.equal(root.dataset.eco, 'true');
  assert.equal(notified, 1);

  const broken = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); } };
  writeEco(false, broken, root, () => { notified += 1; });
  assert.equal('eco' in root.dataset, false);
  assert.equal(notified, 2);
});

function runBoot(stored: string | null, saveData: boolean) {
  const root = { dataset: {} as DOMStringMap };
  new Function('localStorage', 'navigator', 'document', ECO_BOOT_SCRIPT)(
    { getItem: () => stored }, { connection: { saveData } }, { documentElement: root },
  );
  return root.dataset.eco;
}

test('le script de démarrage applique le mode avant l’affichage, avec les mêmes règles', () => {
  assert.equal(runBoot('true', false), 'true');
  assert.equal(runBoot('false', true), undefined);
  assert.equal(runBoot(null, true), 'true');
  assert.equal(runBoot(null, false), undefined);
});

test('le script de démarrage ne lève jamais d’exception (stockage bloqué)', () => {
  const root = { dataset: {} as DOMStringMap };
  assert.doesNotThrow(() => new Function('localStorage', 'navigator', 'document', ECO_BOOT_SCRIPT)(
    { getItem: () => { throw new Error('SecurityError'); } }, {}, { documentElement: root },
  ));
  assert.equal(root.dataset.eco, undefined);
});
