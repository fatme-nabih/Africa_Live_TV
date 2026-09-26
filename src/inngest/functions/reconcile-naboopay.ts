import { and, eq, isNull, lt, or } from 'drizzle-orm';

import { db } from '@/db';
import { naboopayTransactions } from '@/db/schema';
import { getNabooPayTransaction } from '@/lib/naboopay';
import { applyVerifiedNabooPayPayment } from '@/lib/naboopay-payment';
import { structuredLog } from '@/lib/structured-log';

import { inngest } from '../client';

const RECONCILIATION_BATCH_SIZE = 100;

export const reconcileNaboopay = inngest.createFunction(
  { id: 'reconcile-naboopay', triggers: [{ cron: '*/15 * * * *' }] },
  async ({ step }) => step.run('scan-and-reconcile', async () => {
    if (process.env.PAYMENTS_ENABLED !== 'true') {
      return { disabled: true, reconciled: 0, errors: 0, ambiguousCreations: 0 };
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1_000).toISOString();
    const candidates = await db.query.naboopayTransactions.findMany({
      where: or(
        eq(naboopayTransactions.status, 'reconciliation_required'),
        and(eq(naboopayTransactions.status, 'pending'), lt(naboopayTransactions.updatedAt, oneHourAgo)),
        and(eq(naboopayTransactions.status, 'completed'), isNull(naboopayTransactions.fulfilledAt)),
      ),
      limit: RECONCILIATION_BATCH_SIZE,
    });

    const results = { disabled: false, reconciled: 0, errors: 0, ambiguousCreations: 0 };
    for (const transaction of candidates) {
      if (!transaction.providerOrderId) {
        // The documented v2 lookup requires provider order_id. A timed-out
        // creation without it is ambiguous and must never be retried blindly.
        results.ambiguousCreations += 1;
        continue;
      }
      try {
        const providerTransaction = await getNabooPayTransaction(transaction.providerOrderId);
        const result = await applyVerifiedNabooPayPayment(providerTransaction);
        if (result.outcome !== 'unknown_order') results.reconciled += 1;
      } catch (error) {
        results.errors += 1;
        structuredLog('error', 'naboopay.reconciliation.error', {
          errorName: error instanceof Error ? error.name : 'UnknownError',
        });
      }
    }

    if (results.ambiguousCreations > 0) {
      structuredLog('warn', 'naboopay.reconciliation.ambiguous_creations', {
        count: results.ambiguousCreations,
      });
    }
    return results;
  }),
);
