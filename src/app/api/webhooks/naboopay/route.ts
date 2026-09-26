import crypto from 'node:crypto';

import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { db } from '@/db';
import { naboopayWebhookEvents } from '@/db/schema';
import { BadRequestError, UnauthorizedError, withApiErrorHandler } from '@/lib/api-errors';
import { readBoundedJsonText } from '@/lib/bounded-json';
import {
  NabooPayTransactionPayloadSchema,
  verifyNabooPayWebhookSignature,
} from '@/lib/naboopay';
import {
  applyVerifiedNabooPayPayment,
  NabooPayPaymentMismatchError,
} from '@/lib/naboopay-payment';
import { structuredLog } from '@/lib/structured-log';

export const POST = withApiErrorHandler(async (request: Request) => {
  const contentType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
  if (contentType !== 'application/json') {
    throw new BadRequestError('Content-Type application/json requis.', 'INVALID_CONTENT_TYPE');
  }

  const signature = request.headers.get('x-signature');
  if (!signature) throw new UnauthorizedError('Signature manquante.', 'MISSING_SIGNATURE');

  const payloadText = await readBoundedJsonText(request, 64 * 1024);
  if (!verifyNabooPayWebhookSignature(payloadText, signature)) {
    throw new UnauthorizedError('Signature invalide.', 'INVALID_SIGNATURE');
  }

  let rawPayload: unknown;
  try {
    rawPayload = JSON.parse(payloadText);
  } catch {
    throw new BadRequestError('JSON invalide.', 'INVALID_JSON');
  }
  const parsed = NabooPayTransactionPayloadSchema.safeParse(rawPayload);
  if (!parsed.success) throw new BadRequestError('Payload invalide.', 'INVALID_PAYLOAD');

  const payload = parsed.data;
  const digest = crypto.createHash('sha256').update(payloadText).digest('hex');
  const candidateEventId = crypto.randomUUID();
  const [inserted] = await db.insert(naboopayWebhookEvents).values({
    id: candidateEventId,
    providerOrderId: payload.order_id,
    payloadDigest: digest,
    providerStatus: payload.transaction_status,
    providerCreatedAt: payload.created_at,
    state: 'received',
    sanitizedPayload: {
      order_id: payload.order_id,
      transaction_status: payload.transaction_status,
      amount: payload.amount,
      currency: payload.currency,
      products: payload.products,
      created_at: payload.created_at,
      updated_at: payload.updated_at,
      paid_at: payload.paid_at,
    },
  }).onConflictDoNothing().returning({ id: naboopayWebhookEvents.id });

  const eventId = inserted?.id ?? (
    await db.select({ id: naboopayWebhookEvents.id, state: naboopayWebhookEvents.state })
      .from(naboopayWebhookEvents)
      .where(eq(naboopayWebhookEvents.payloadDigest, digest)).limit(1)
  )[0]?.id;
  if (!eventId) throw new Error('Webhook event could not be persisted.');

  const [event] = await db.select({ state: naboopayWebhookEvents.state })
    .from(naboopayWebhookEvents).where(eq(naboopayWebhookEvents.id, eventId)).limit(1);
  if (event?.state === 'processed') {
    return NextResponse.json({ status: 'already_processed' });
  }

  try {
    const result = await applyVerifiedNabooPayPayment(payload);
    if (result.outcome === 'unknown_order') {
      await db.update(naboopayWebhookEvents).set({
        state: 'rejected', errorCode: 'UNKNOWN_ORDER',
      }).where(eq(naboopayWebhookEvents.id, eventId));
      structuredLog('warn', 'naboopay.webhook.unknown_order');
      return NextResponse.json(
        { error: 'Commande inconnue', code: 'UNKNOWN_ORDER' },
        { status: 400 },
      );
    }

    await db.update(naboopayWebhookEvents).set({
      state: 'processed', errorCode: null,
    }).where(eq(naboopayWebhookEvents.id, eventId));
    structuredLog('info', 'naboopay.webhook.processed', {
      providerStatus: payload.transaction_status,
      outcome: result.outcome,
    });
    return NextResponse.json({ status: 'received' });
  } catch (error) {
    const errorCode = error instanceof NabooPayPaymentMismatchError
      ? error.code
      : 'PROCESSING_FAILED';
    await db.update(naboopayWebhookEvents).set({
      state: 'failed', errorCode,
    }).where(eq(naboopayWebhookEvents.id, eventId));
    if (error instanceof NabooPayPaymentMismatchError) {
      return NextResponse.json(
        { error: 'Confirmation incohérente', code: error.code },
        { status: 400 },
      );
    }
    throw error;
  }
});
