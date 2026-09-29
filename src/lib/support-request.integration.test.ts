import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { eq } from 'drizzle-orm';

import { db, pool } from '@/db';
import { supportRequestEvents, supportRequests } from '@/db/schema';
import { POST } from '@/app/api/contact-requests/route';
import { assertIntegrationTarget } from './integration-test-safety';

const integrationEnabled = process.env.SUPPORT_REQUEST_INTEGRATION_TEST === '1';

test(
  'public contact form confirms only after a request and audit event are persisted',
  { skip: !integrationEnabled },
  async () => {
    await assertIntegrationTarget(pool);
    const email = `request-${randomUUID()}@example.test`;
    const request = new Request('http://localhost/api/contact-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Fixture Requester',
        email,
        subject: 'removal',
        message: 'Please remove this source.',
        channelName: 'Fixture Channel',
        sourceUrl: 'https://media.example/fixture.m3u8?token=discard-this',
      }),
    });

    const response = await POST(request, {});
    assert.equal(response.status, 201);
    const payload = await response.json() as { received: boolean; requestId: string };
    assert.equal(payload.received, true);
    const [stored] = await db.select().from(supportRequests).where(eq(supportRequests.id, payload.requestId));
    assert.equal(stored?.email, email);
    assert.equal(stored?.sourceUrl, 'https://media.example/fixture.m3u8');
    const events = await db.select().from(supportRequestEvents).where(eq(supportRequestEvents.requestId, payload.requestId));
    assert.equal(events.length, 1);
    assert.equal(events[0]?.eventType, 'submitted');
  },
);
