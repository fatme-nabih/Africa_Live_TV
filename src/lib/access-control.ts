import { auth } from '@clerk/nextjs/server';
import { desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { subscriptions, users } from '@/db/schema';
import { isLocalDevMode, LOCAL_USER_ID } from './local-dev';
import type { AccessDecision } from './access-policy';

import { evaluateAccess } from './access-policy';
import { ensureInternalUser } from './identity';

export async function getCurrentAccessDecision() {
  if (isLocalDevMode()) {
    const [user] = await db.select().from(users).where(eq(users.id, LOCAL_USER_ID)).limit(1);
    if (!user) throw new Error('Run npm run setup:local before starting Africa Live.');
    return { user, clerkSessionId: null, subscriptions: [], decision: {
      status: 'active', hasAccess: true, expiresAt: null, reason: 'local_development',
    } satisfies AccessDecision };
  }
  const { userId: clerkUserId, sessionId: clerkSessionId } = await auth();

  if (!clerkUserId) {
    return {
      user: null,
      clerkSessionId: null,
      subscriptions: [],
      decision: evaluateAccess(null, []),
    };
  }

  const user = await ensureInternalUser(clerkUserId);
  const userSubscriptions = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, user.id))
    .orderBy(desc(subscriptions.createdAt));

  return {
    user,
    clerkSessionId,
    subscriptions: userSubscriptions,
    decision: evaluateAccess(user, userSubscriptions),
  };
}
