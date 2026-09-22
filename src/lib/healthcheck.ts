export type HealthPayload = {
  status: 'ok' | 'unavailable';
  checks: {
    process: 'ok';
    database: 'ok' | 'error';
  };
};

export async function checkServiceHealth(
  checkDatabase: () => Promise<unknown>,
): Promise<{ status: 200 | 503; payload: HealthPayload }> {
  try {
    await checkDatabase();
    return {
      status: 200,
      payload: { status: 'ok', checks: { process: 'ok', database: 'ok' } },
    };
  } catch {
    return {
      status: 503,
      payload: { status: 'unavailable', checks: { process: 'ok', database: 'error' } },
    };
  }
}
