import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';

import { db } from '@/db';
import { supportRequestEvents, supportRequests } from '@/db/schema';
import { getAbuseRequestContext } from '@/lib/abuse-request-context';
import { consumeRateLimits, type RateLimitPolicy } from '@/lib/rate-limit';
import { readBoundedJson } from '@/lib/bounded-json';
import { BadRequestError, RateLimitError, withApiErrorHandler } from '@/lib/api-errors';
import { supportRequestSubmissionSchema } from '@/lib/support-request-contracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PRIVATE_HEADERS = { 'Cache-Control': 'no-store' };

export const POST = withApiErrorHandler(async (request: Request) => {
  const input = await readBoundedJson(request, 12 * 1_024);
  const parsed = supportRequestSubmissionSchema.safeParse(input);
  if (!parsed.success) {
    throw new BadRequestError('Vérifiez les champs du formulaire.', 'INVALID_SUPPORT_REQUEST');
  }

  // A filled honeypot is acknowledged without storing the submission.
  if (parsed.data.website) {
    return NextResponse.json({ received: true }, { status: 202, headers: PRIVATE_HEADERS });
  }

  const abuseContext = getAbuseRequestContext(request);
  const limits: RateLimitPolicy[] = [{
    bucket: 'public.contact.email',
    dimension: 'user',
    subject: parsed.data.email,
    limit: 5,
    windowSeconds: 24 * 60 * 60,
  }];
  if (abuseContext.networkFingerprint) {
    limits.push({
      bucket: 'public.contact.network',
      dimension: 'network',
      subject: abuseContext.networkFingerprint,
      limit: 30,
      windowSeconds: 60 * 60,
    });
  }
  const rateLimit = await consumeRateLimits(limits);
  if (!rateLimit.allowed) {
    throw new RateLimitError('Trop de demandes ont été envoyées depuis cette adresse. Réessayez plus tard.', 'RATE_LIMITED', {
      'Retry-After': String(rateLimit.denied?.retryAfterSeconds ?? 86_400),
    });
  }

  const now = new Date().toISOString();
  const id = randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(supportRequests).values({
      id,
      name: parsed.data.name,
      email: parsed.data.email,
      subject: parsed.data.subject,
      message: parsed.data.message,
      channelName: parsed.data.channelName,
      sourceUrl: parsed.data.sourceUrl,
      status: 'new',
      createdAt: now,
      updatedAt: now,
    });
    await tx.insert(supportRequestEvents).values({
      id: randomUUID(),
      requestId: id,
      eventType: 'submitted',
      createdAt: now,
    });
  });

  return NextResponse.json({ received: true, requestId: id }, { status: 201, headers: PRIVATE_HEADERS });
});
