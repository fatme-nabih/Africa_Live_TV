import { pool } from '@/db';
import { checkServiceHealth } from '@/lib/healthcheck';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const responseHeaders = {
  'Cache-Control': 'no-store, max-age=0',
  'Content-Type': 'application/json; charset=utf-8',
};

export async function GET() {
  const result = await checkServiceHealth(() => pool.query('select 1'));

  return Response.json(result.payload, {
    status: result.status,
    headers: responseHeaders,
  });
}
