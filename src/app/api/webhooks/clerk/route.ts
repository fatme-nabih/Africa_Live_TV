import { verifyWebhook } from '@clerk/nextjs/webhooks';
import { NextRequest, NextResponse } from 'next/server';

import {
  findInternalUserByClerkId,
  markClerkUserDeleted,
  syncClerkSession,
  syncClerkUser,
} from '@/lib/identity';
import { structuredLog } from '@/lib/structured-log';

export const runtime = 'nodejs';

type ClerkUserPayload = {
  id: string;
  primary_email_address_id: string | null;
  email_addresses: Array<{ id: string; email_address: string }>;
  banned: boolean;
  locked: boolean;
  created_at: number;
  updated_at: number;
};

function primaryEmail(user: ClerkUserPayload) {
  return (
    user.email_addresses.find((address) => address.id === user.primary_email_address_id)
      ?.email_address ?? user.email_addresses[0]?.email_address ?? null
  );
}

async function syncWebhookUser(user: ClerkUserPayload) {
  return syncClerkUser({
    clerkUserId: user.id,
    email: primaryEmail(user),
    status: user.banned || user.locked ? 'blocked' : 'active',
    createdAt: new Date(user.created_at),
    syncedAt: new Date(user.updated_at),
  });
}

export async function POST(request: NextRequest) {
  let event: Awaited<ReturnType<typeof verifyWebhook>>;
  try {
    event = await verifyWebhook(request);
  } catch (error) {
    console.warn('Webhook Clerk rejeté : signature invalide.', error);
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }

  if (event.type === 'user.created' || event.type === 'user.updated') {
    await syncWebhookUser(event.data);
  } else if (event.type === 'user.deleted') {
    if (event.data.id) await markClerkUserDeleted(event.data.id);
  } else if (
    event.type === 'session.created' ||
    event.type === 'session.ended' ||
    event.type === 'session.removed' ||
    event.type === 'session.revoked'
  ) {
    const internalUser = event.data.user
      ? await syncWebhookUser(event.data.user)
      : await findInternalUserByClerkId(event.data.user_id);

    if (!internalUser) {
      console.warn(`Session Clerk ${event.data.id} ignorée : utilisateur inconnu.`);
      return NextResponse.json({ ok: true, ignored: 'unknown_user' }, { status: 202 });
    }

    const status = event.type.replace('session.', '') as
      | 'created'
      | 'ended'
      | 'removed'
      | 'revoked';
    await syncClerkSession({
      id: event.data.id,
      userId: internalUser.id,
      status: status === 'created' ? 'active' : status,
      createdAt: new Date(event.data.created_at),
      lastSeenAt: new Date(event.data.last_active_at),
      expiresAt: event.data.expire_at ? new Date(event.data.expire_at) : null,
      endedAt: status === 'created' ? null : new Date(event.data.updated_at),
    });
  }
  
  return NextResponse.json({ ok: true });
}
