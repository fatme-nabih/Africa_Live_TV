import { inngest } from "../client";
import { db } from "@/db";
import { naboopayTransactions } from "@/db/schema";
import { eq, or, and, lt } from "drizzle-orm";
import { structuredLog } from "@/lib/structured-log";

export const reconcileNaboopay = inngest.createFunction(
  { id: "reconcile-naboopay", triggers: [{ cron: "*/15 * * * *" }] },
  async ({ step }) => {
    return await step.run("scan-and-reconcile", async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

      const transactionsToReconcile = await db.query.naboopayTransactions.findMany({
        where: or(
          eq(naboopayTransactions.status, 'reconciliation_required'),
          and(
            eq(naboopayTransactions.status, 'pending'),
            lt(naboopayTransactions.updatedAt, oneHourAgo)
          )
        )
      });

      const results = { reconciled: 0, failed: 0, errors: 0 };

      for (const tx of transactionsToReconcile) {
        if (!tx.providerOrderId) continue;

        try {
          const apiKey = process.env.NABOOPAY_API_KEY;
          if (!apiKey) throw new Error("NABOOPAY_API_KEY missing");

          const response = await fetch(`https://api.naboopay.com/api/v2/transactions/${tx.providerOrderId}`, {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Accept': 'application/json',
            }
          });

          if (response.ok) {
            const data = await response.json();
            // Data will contain transaction_status
            const status = data.transaction_status;
            
            // If API returns final state, update our DB
            if (status === 'completed' || status === 'canceled' || status === 'failed') {
              await db.update(naboopayTransactions)
                .set({ status: status, updatedAt: now.toISOString() })
                .where(eq(naboopayTransactions.id, tx.id));
              results.reconciled++;
              structuredLog('info', 'naboopay.reconciliation.success', { orderId: tx.providerOrderId, status });
              continue;
            }
          }

          // If still not reconciled and older than 24h, mark as failed
          if (tx.createdAt < twentyFourHoursAgo) {
            await db.update(naboopayTransactions)
              .set({ status: 'failed', updatedAt: now.toISOString() })
              .where(eq(naboopayTransactions.id, tx.id));
            results.failed++;
            structuredLog('warn', 'naboopay.reconciliation.timeout_failed', { orderId: tx.providerOrderId });
          }

        } catch (error) {
          results.errors++;
          structuredLog('error', 'naboopay.reconciliation.error', { orderId: tx.providerOrderId, error: String(error) });
        }
      }

      return results;
    });
  }
);
