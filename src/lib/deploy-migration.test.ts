import assert from 'node:assert/strict';
import test from 'node:test';

import { assertDeployMigrationEnvironment } from './deploy-migration';

const railway = {
  DEPLOYMENT_ENV: 'staging',
  RAILWAY_PROJECT_ID: 'project-id',
  RAILWAY_ENVIRONMENT_ID: 'environment-id',
  DATABASE_URL: 'postgresql://internal:secret@postgres.railway.internal:5432/railway',
};

test('deploy migrations accept an explicit Railway staging target', () => {
  assert.doesNotThrow(() => assertDeployMigrationEnvironment(railway));
});

test('deploy migrations refuse local, incomplete and unsupported targets', () => {
  assert.throws(() => assertDeployMigrationEnvironment({ ...railway, DATABASE_URL: 'postgresql://localhost/africa_live_dev' }), /REFUSED/);
  assert.throws(() => assertDeployMigrationEnvironment({ ...railway, RAILWAY_PROJECT_ID: undefined }), /REFUSED/);
  assert.throws(() => assertDeployMigrationEnvironment({ ...railway, DEPLOYMENT_ENV: 'preview' }), /REFUSED/);
  assert.throws(() => assertDeployMigrationEnvironment({ ...railway, DATABASE_URL: 'not-a-url' }), /INVALID/);
});
