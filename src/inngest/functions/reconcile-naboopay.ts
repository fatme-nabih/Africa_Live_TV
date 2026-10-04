import { claimPaymentReconciliation } from '@/lib/payment-reconciliation';
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

    const { orders: candidates, ambiguousCreations } = await claimPaymentReconciliation(new Date(), RECONCILIATION_BATCH_SIZE);

    const results = { disabled: false, reconciled: 0, errors: 0, ambiguousCreations };
    for (const transaction of candidates) {
      try {
        const providerTransaction = await getNabooPayTransaction(transaction.provider_order_id);
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
