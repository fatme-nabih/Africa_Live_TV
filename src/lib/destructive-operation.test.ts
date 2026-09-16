import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parseDestructiveOperationArgs,
  requireDestructiveConfirmation,
} from './destructive-operation';

test('parseDestructiveOperationArgs only accepts --force', () => {
  assert.deepEqual(parseDestructiveOperationArgs([]), { force: false });
  assert.deepEqual(parseDestructiveOperationArgs(['--force']), { force: true });
  assert.throws(() => parseDestructiveOperationArgs(['--unknown']), /Argument\(s\) inconnu\(s\)/);
});

test('non-interactive destructive operations require --force', async () => {
  await assert.rejects(
    requireDestructiveConfirmation({
      operation: 'remplacer le catalogue',
      confirmationText: 'REMPLACER LE CATALOGUE',
      args: [],
      interactive: false,
    }),
    /Opération destructive refusée/,
  );

  await assert.doesNotReject(
    requireDestructiveConfirmation({
      operation: 'remplacer le catalogue',
      confirmationText: 'REMPLACER LE CATALOGUE',
      args: ['--force'],
      interactive: false,
    }),
  );
});

test('interactive confirmation must match the exact text', async () => {
  await assert.rejects(
    requireDestructiveConfirmation({
      operation: 'remplacer le catalogue',
      confirmationText: 'REMPLACER LE CATALOGUE',
      args: [],
      interactive: true,
      ask: async () => 'non',
    }),
    /Confirmation incorrecte/,
  );

  await assert.doesNotReject(
    requireDestructiveConfirmation({
      operation: 'remplacer le catalogue',
      confirmationText: 'REMPLACER LE CATALOGUE',
      args: [],
      interactive: true,
      ask: async () => 'REMPLACER LE CATALOGUE',
    }),
  );
});
