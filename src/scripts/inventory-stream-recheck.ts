// Read-only inventory of legacy qualifications; this does not contact providers.
import { mkdir, writeFile } from 'node:fs/promises';
import { loadEnvConfig } from '@next/env';
import { Pool } from 'pg';
loadEnvConfig(process.cwd());
async function run() {
  const target = new URL(process.env.DATABASE_URL ?? '');
  if (!['localhost','127.0.0.1','[::1]'].includes(target.hostname) || target.pathname !== '/africa_live_dev' || target.search || target.hash) throw new Error('LOCAL_INVENTORY_TARGET_REQUIRED');
  const pool = new Pool({ connectionString: target.href, max: 1 });
  try {
    await pool.query('BEGIN READ ONLY');
    const result = await pool.query("select id, channel_id, status, verification_state, direct_eligibility, last_success_at from streams where active and status in ('BROWSER_OK','VLC_ONLY') order by id");
    await pool.query('COMMIT');
    await mkdir('.local-logs/bugs-2026-10-09', { recursive: true });
    await writeFile('.local-logs/bugs-2026-10-09/recheck-candidates.json', JSON.stringify({ collectedAt: new Date().toISOString(), reason: 'Legacy qualifications lack the new resource evidence', candidates: result.rows }, null, 2));
    console.log('Legacy qualifications to recheck after separate authorization:', result.rows.length);
  } finally { await pool.end(); }
}
run().catch(() => { console.error('Stream inventory failed (controlled diagnostic).'); process.exitCode = 1; });
