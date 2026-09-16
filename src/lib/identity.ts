import { randomUUID } from 'node:crypto';

import { currentUser } from '@clerk/nextjs/server';
import { and, eq, isNull, lte, or } from 'drizzle-orm';

import { db } from '@/db';
import { sessions, users } from '@/db/schema';

import { TRIAL_DURATION_DAYS } from './access-policy';

export type ClerkIdentityInput = {
  clerkUserId: string;
  email: string | null;
  status: 'active' | 'blocked';
  createdAt?: Date;
  syncedAt?: Date;
};

export type ClerkSessionInput = {
  id: string;
  userId: string;
  status: 'active' | 'ended' | 'revoked' | 'removed';
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date | null;
  endedAt: Date | null;
};

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function primaryEmailFromClerkUser(user: {
  primaryEmailAddressId: string | null;
  emailAddresses: Array<{ id: string; emailAddress: string }>;
}) {
  const primary = user.emailAddresses.find(
    (address) => address.id === user.primaryEmailAddressId,
  );
  return primary?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null;
}

export async function findInternalUserByClerkId(clerkUserId: string) {
  return (
    await db.select().from(users).where(eq(users.clerkUserId, clerkUserId)).limit(1)
  )[0] ?? null;
}

export async function syncClerkUser({
  clerkUserId,
  email,
  status,
  createdAt = new Date(),
  syncedAt = new Date(),
}: ClerkIdentityInput) {
  const createdAtIso = createdAt.toISOString();
  const syncedAtIso = syncedAt.toISOString();
  const trialEndsAt = addDays(createdAt, TRIAL_DURATION_DAYS).toISOString();
  const [user] = await db
    .insert(users)
    .values({
      id: randomUUID(),
      clerkUserId,
      email,
      status,
      createdAt: createdAtIso,
      updatedAt: syncedAtIso,
      lastSeenAt: syncedAtIso,
      trialStartedAt: createdAtIso,
      trialEndsAt,
      clerkSyncedAt: syncedAtIso,
    })
    .onConflictDoUpdate({
      target: users.clerkUserId,
      set: {
        email,
        status,
        updatedAt: syncedAtIso,
        clerkSyncedAt: syncedAtIso,
      },
      setWhere: or(isNull(users.clerkSyncedAt), lte(users.clerkSyncedAt, syncedAtIso)),
    })
    .returning();
  if (user) return user;
  const existing = await findInternalUserByClerkId(clerkUserId);
  if (!existing) throw new Error('Unable to synchronize Clerk user.');
  return existing;
}

export async function ensureInternalUser(clerkUserId: string) {
  const existing = await findInternalUserByClerkId(clerkUserId);
  if (existing) return existing;

  const clerkUser = await currentUser();
  if (!clerkUser || clerkUser.id !== clerkUserId) {
    throw new Error('Authenticated Clerk user could not be loaded.');
  }
  return syncClerkUser({
    clerkUserId,
    email: primaryEmailFromClerkUser(clerkUser),
    status: clerkUser.banned || clerkUser.locked ? 'blocked' : 'active',
    createdAt: new Date(clerkUser.createdAt),
  });
}

export async function markClerkUserDeleted(clerkUserId: string) {
  const now = new Date().toISOString();
  return db
    .update(users)
    .set({
      status: 'deleted',
      email: null,
      updatedAt: now,
      clerkSyncedAt: now,
    })
    .where(eq(users.clerkUserId, clerkUserId));
}

export async function syncClerkSession(input: ClerkSessionInput) {
  const [session] = await db
    .insert(sessions)
    .values({
      id: input.id,
      userId: input.userId,
      provider: 'clerk',
      status: input.status,
      createdAt: input.createdAt.toISOString(),
      lastSeenAt: input.lastSeenAt.toISOString(),
      expiresAt: input.expiresAt?.toISOString() ?? null,
      endedAt: input.endedAt?.toISOString() ?? null,
    })
    .onConflictDoUpdate({
      target: sessions.id,
      set: {
        userId: input.userId,
        status: input.status,
        lastSeenAt: input.lastSeenAt.toISOString(),
        expiresAt: input.expiresAt?.toISOString() ?? null,
        endedAt: input.endedAt?.toISOString() ?? null,
      },
      setWhere: and(
        lte(sessions.lastSeenAt, input.lastSeenAt.toISOString()),
        input.status === 'active' ? eq(sessions.status, 'active') : undefined,
      ),
    })
    .returning();
  if (session) return session;
  return (
    await db.select().from(sessions).where(eq(sessions.id, input.id)).limit(1)
  )[0];
}
