import { auth } from '@clerk/nextjs/server';
import { desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { subscriptions, users } from '@/db/schema';
import { isLocalDevMode, LOCAL_USER_ID } from './local-dev';
import type { AccessDecision } from './access-policy';

import { evaluateAccess } from './access-policy';
import { ensureInternalUser, IdentityDeletedError } from './identity';
import { getAdministratorAccess } from './admin-access';
import { evaluateUserAccess } from './refund-trial-access';

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

  let user;
  try { user = await ensureInternalUser(clerkUserId); }
  catch (error) {
    if (!(error instanceof IdentityDeletedError)) throw error;
    return { user:null,clerkSessionId,subscriptions:[],decision:{ status:'blocked',hasAccess:false,expiresAt:null,reason:'identity_deleted' } satisfies AccessDecision };
  }
  const userSubscriptions = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, user.id))
    .orderBy(desc(subscriptions.createdAt));

  const standardDecision = await evaluateUserAccess(user, userSubscriptions);
  if (standardDecision.hasAccess) {
    return {
      user,
      clerkSessionId,
      subscriptions: userSubscriptions,
      decision: standardDecision,
    };
  }

  // Active administrators maintain full platform access
  const admin = await getAdministratorAccess();
  if (admin.allowed) {
    return {
      user,
      clerkSessionId,
      subscriptions: userSubscriptions,
      decision: {
        status: 'active',
        hasAccess: true,
        expiresAt: null,
        reason: 'administrator_access',
      } satisfies AccessDecision,
    };
  }

  return {
    user,
    clerkSessionId,
    subscriptions: userSubscriptions,
    decision: standardDecision,
  };
}
