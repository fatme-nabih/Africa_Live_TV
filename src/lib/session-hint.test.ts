import assert from 'node:assert/strict';
import test from 'node:test';

import { hasClerkSessionHint } from './session-hint';

test('signed-in hint requires a positive __client_uat timestamp', () => {
  assert.equal(hasClerkSessionHint('__client_uat=1759500000'), true);
  assert.equal(hasClerkSessionHint('theme=dark; __client_uat_NzBj5idP=1759500000; other=1'), true);
});

test('signed-out, missing or look-alike cookies never show the member variant', () => {
  for (const header of [
    '', '__client_uat=0', '__client_uat_NzBj5idP=0; __client_uat=0', '__clerk_db_jwt=dvb_x',
    'x__client_uat=1759500000', '__client_uat=abc', '__client_uat=-1', '__client_uat=', 'al_eco=1',
  ]) assert.equal(hasClerkSessionHint(header), false, header);
});
