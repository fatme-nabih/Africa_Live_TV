import { structuredLog } from '../lib/structured-log';

function simulateIncident() {
  console.log('--- Début de la simulation d\'incident ---');
  
  // 1. Erreur de processus / crash géré
  structuredLog('error', 'process.uncaught_exception', {
    errorName: 'SimulatedError',
    errorMessage: 'Simulation: TypeError undefined is not a function',
  });

  // 2. Erreur Pool DB (Panne applicative interne)
  structuredLog('error', 'db.pool.connection_failed', {
    errorName: 'PostgresError',
    errorMessage: 'Simulation: connection timeout to database',
    attempt: 3,
  });

  // 3. Panne Fournisseur Externe (Clerk / NabooPay)
  structuredLog('error', 'external.provider.failed', {
    provider: 'NabooPay',
    endpoint: '/v2/transaction',
    status: 502,
    errorMessage: 'Simulation: Bad Gateway from provider',
  });

  // 4. Fraîcheur des flux (Alerte sur jobs)
  structuredLog('warn', 'stream.verification.stale', {
    staleCount: 450,
    message: 'Simulation: Les flux n\'ont pas été vérifiés depuis plus de 72h',
  });

  // 5. Erreurs API massives (Taux d'erreur > 5%)
  structuredLog('error', 'api.unhandled_error', {
    correlationId: crypto.randomUUID(),
    method: 'GET',
    url: '/api/channels',
    errorName: 'TimeoutError',
    errorMessage: 'Simulation: Request timeout',
  });

  console.log('--- Simulation terminée. Vérifiez les logs structurés. ---');
}

simulateIncident();
