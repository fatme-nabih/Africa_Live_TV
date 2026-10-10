import { randomUUID } from 'node:crypto';

import { and, eq, lte, sql } from 'drizzle-orm';

import { db } from '@/db';
import { clerkIdentityDeletions, sessions, subscriptions, users } from '@/db/schema';

import { TRIAL_DURATION_DAYS } from './access-policy';
import { BadRequestError, ForbiddenError, ServiceUnavailableError } from './api-errors';

export type ClerkIdentityInput = {
  clerkUserId: string;
  email: string | null;
  status: 'active' | 'blocked';
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
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

export class IdentityDeletedError extends ForbiddenError {
  constructor() { super('Cette identité a été supprimée.', 'IDENTITY_DELETED'); }
}
type IdentityTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
async function lockIdentity(tx: IdentityTransaction, id: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${'africa-live:identity:' + id}, 0))`);
}
function validateIdentity(input: ClerkIdentityInput) {
  if (!input.clerkUserId || !Number.isFinite(input.createdAt.getTime()) || !Number.isFinite(input.updatedAt.getTime()) || (input.processedAt && !Number.isFinite(input.processedAt.getTime()))) throw new BadRequestError('Dates d’identité invalides.', 'INVALID_IDENTITY_DATE');
}
async function loadCurrentProfile(clerkUserId: string): Promise<ClerkIdentityInput> {
  const { clerkClient } = await import('@clerk/nextjs/server');
  const profile = await (await clerkClient()).users.getUser(clerkUserId);
  return { clerkUserId: profile.id, email: primaryEmailFromClerkUser(profile), status: profile.banned || profile.locked ? 'blocked' : 'active', createdAt: new Date(profile.createdAt), updatedAt: new Date(profile.updatedAt) };
}
export async function syncClerkUser(input: ClerkIdentityInput, options: { revalidate?: (id: string) => Promise<ClerkIdentityInput> } = {}) {
  validateIdentity(input);
  const existing = await findInternalUserByClerkId(input.clerkUserId);
  if (existing?.status === 'deleted' || (await db.select().from(clerkIdentityDeletions).where(eq(clerkIdentityDeletions.clerkUserId, input.clerkUserId))).length) throw new IdentityDeletedError();
  let authoritative = input;
  if (existing && !existing.clerkProfileUpdatedAt) {
    // Historical clerkSyncedAt has mixed provenance. Revalidation happens BEFORE any SQL lock.
    try { authoritative = await (options.revalidate ?? loadCurrentProfile)(input.clerkUserId); }
    catch { throw new ServiceUnavailableError('La révision de cette identité doit être vérifiée.', 'IDENTITY_REVISION_UNAVAILABLE'); }
    validateIdentity(authoritative);
    if (authoritative.clerkUserId !== input.clerkUserId) throw new ServiceUnavailableError('Profil d’identité incohérent.', 'IDENTITY_REVISION_UNAVAILABLE');
  }
  return db.transaction(async tx => {
    await lockIdentity(tx, input.clerkUserId);
    if ((await tx.select().from(clerkIdentityDeletions).where(eq(clerkIdentityDeletions.clerkUserId, input.clerkUserId))).length) throw new IdentityDeletedError();
    const [current] = await tx.select().from(users).where(eq(users.clerkUserId, input.clerkUserId));
    if (current?.status === 'deleted') throw new IdentityDeletedError();
    const revision = authoritative.updatedAt.toISOString(), processed = (input.processedAt ?? new Date()).toISOString();
    if (current?.clerkProfileUpdatedAt && Date.parse(current.clerkProfileUpdatedAt) >= authoritative.updatedAt.getTime()) return current;
    const status = current?.status === 'blocked' && !current.clerkProfileUpdatedAt ? 'blocked' : authoritative.status;
    if (current) {
      const [updated] = await tx.update(users).set({ email: authoritative.email, status, clerkProfileUpdatedAt: revision, clerkSyncedAt: processed, updatedAt: processed }).where(eq(users.id, current.id)).returning();
      return updated;
    }
    const created = authoritative.createdAt.toISOString();
    const [createdUser] = await tx.insert(users).values({ id: randomUUID(), clerkUserId: authoritative.clerkUserId, email: authoritative.email, status, createdAt: created, updatedAt: processed, lastSeenAt: processed, trialStartedAt: created, trialEndsAt: addDays(authoritative.createdAt, TRIAL_DURATION_DAYS).toISOString(), clerkSyncedAt: processed, clerkProfileUpdatedAt: revision }).returning();
    return createdUser;
  });
}

export async function ensureInternalUser(clerkUserId: string) {
  const existing = await findInternalUserByClerkId(clerkUserId);
  if (existing?.status === 'deleted' || (await db.select().from(clerkIdentityDeletions).where(eq(clerkIdentityDeletions.clerkUserId, clerkUserId))).length) throw new IdentityDeletedError();
  if (existing?.clerkProfileUpdatedAt) return existing;

  // Webhook/database synchronization can run independently of the Next request runtime.
  const { currentUser } = await import('@clerk/nextjs/server');
  const clerkUser = await currentUser();
  if (!clerkUser || clerkUser.id !== clerkUserId) {
    throw new Error('Authenticated Clerk user could not be loaded.');
  }
  return syncClerkUser({
    clerkUserId,
    email: primaryEmailFromClerkUser(clerkUser),
    status: clerkUser.banned || clerkUser.locked ? 'blocked' : 'active',
    createdAt: new Date(clerkUser.createdAt),
    updatedAt: new Date(clerkUser.updatedAt),
  });
}

export async function markClerkUserDeleted(clerkUserId: string, providerDeletedAt: Date | null = null) {
  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    await lockIdentity(tx, clerkUserId);
    await tx.insert(clerkIdentityDeletions).values({ clerkUserId, providerDeletedAt: providerDeletedAt?.toISOString() ?? null, receivedAt: now }).onConflictDoNothing();
    const [user] = await tx
      .update(users)
      .set({
        status: 'deleted',
        email: null,
        updatedAt: now,
        clerkSyncedAt: now,
      })
      .where(eq(users.clerkUserId, clerkUserId))
      .returning();

    if (user) {
      await tx
        .update(subscriptions)
        .set({
          status: 'expired',
          updatedAt: now,
        })
        .where(eq(subscriptions.userId, user.id));
    }
  });
}

export async function syncClerkSession(input: ClerkSessionInput) {
  return db.transaction(async tx => {
  const [owner] = await tx.select().from(users).where(eq(users.id, input.userId));
  if (!owner) throw new IdentityDeletedError();
  await lockIdentity(tx, owner.clerkUserId);
  const [current] = await tx.select().from(users).where(eq(users.id, input.userId));
  if (current?.status === 'deleted' || (await tx.select().from(clerkIdentityDeletions).where(eq(clerkIdentityDeletions.clerkUserId, owner.clerkUserId))).length) throw new IdentityDeletedError();
  const [session] = await tx
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
    await tx.select().from(sessions).where(eq(sessions.id, input.id)).limit(1)
  )[0];
  });
}
