import assert from 'node:assert/strict';
import test from 'node:test';

import { countLabel } from './format';

test('French count labels keep 0 and 1 singular', () => {
  assert.equal(countLabel(0, 'dépêche', 'dépêches'), '0 dépêche');
  assert.equal(countLabel(1, 'dépêche', 'dépêches'), '1 dépêche');
  assert.equal(countLabel(8, 'dépêche', 'dépêches'), '8 dépêches');
  assert.equal(countLabel(2, 'chaîne référencée', 'chaînes référencées'), '2 chaînes référencées');
});
