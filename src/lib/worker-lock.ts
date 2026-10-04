import type { Pool } from 'pg';
export async function withWorkerLock<T>(pool: Pool, key: string, task: (signal:AbortSignal) => Promise<T>): Promise<T | undefined> {
  const client = await pool.connect();
  let locked = false;
  let connectionError: Error | undefined;
  const controller=new AbortController();
  const onError = (error: Error) => { connectionError = error;controller.abort(error); };
  client.on('error', onError);
  try {
    const result = await client.query<{locked:boolean}>('select pg_try_advisory_lock(hashtext($1)) as locked',[key]);
    locked = result.rows[0]?.locked ?? false;
    if (!locked) return;
    const resultValue = await task(controller.signal);
    if (connectionError) throw connectionError;
    return resultValue;
  } finally {
    try { if (locked && !connectionError) await client.query('select pg_advisory_unlock(hashtext($1))',[key]); }
    catch (error) { connectionError = error instanceof Error ? error : new Error('WORKER_UNLOCK_FAILED'); throw error; }
    finally { client.removeListener('error',onError); client.release(connectionError); }
  }
}
