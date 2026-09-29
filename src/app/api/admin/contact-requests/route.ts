import { desc, inArray } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { db } from '@/db';
import { supportRequestEvents, supportRequests } from '@/db/schema';
import { withApiErrorHandler } from '@/lib/api-errors';
import { requireAdminApiAccess } from '@/lib/require-admin-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withApiErrorHandler(async () => {
  await requireAdminApiAccess();
  const requests = await db
    .select()
    .from(supportRequests)
    .orderBy(desc(supportRequests.createdAt))
    .limit(100);
  const requestIds = requests.map((item) => item.id);
  const events = requestIds.length
    ? await db.select().from(supportRequestEvents)
      .where(inArray(supportRequestEvents.requestId, requestIds))
      .orderBy(supportRequestEvents.createdAt)
    : [];
  const eventsByRequest = new Map<string, typeof events>();
  for (const event of events) {
    const requestEvents = eventsByRequest.get(event.requestId) ?? [];
    requestEvents.push(event);
    eventsByRequest.set(event.requestId, requestEvents);
  }
  return NextResponse.json({
    requests: requests.map((item) => ({
      ...item,
      events: eventsByRequest.get(item.id) ?? [],
    })),
  }, { headers: { 'Cache-Control': 'private, no-store' } });
});
