import { and, asc, eq, inArray } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { db } from '@/db';
import { channels, userFavorites } from '@/db/schema';
import { favoriteMutationSchema, favoritesResponseSchema } from '@/lib/api-contracts';
import { readBoundedJson } from '@/lib/bounded-json';
import { authorizeAppRequest } from '@/lib/require-app-access';
import { ApiError, BadRequestError, withApiErrorHandler } from '@/lib/api-errors';
import { preferenceOwnerKey } from '@/lib/preference-contracts';
import { isLocalDevMode } from '@/lib/local-dev';
function assertOwner(value: unknown, userId: string) {
  if (value !== preferenceOwnerKey(userId,isLocalDevMode())) throw new ApiError('Le compte a changé ou la page doit être rechargée.',409,'PREFERENCE_OWNER_CHANGED');
}

async function listFavorites(userId: string) {
  const rows = await db
    .select({ channelId: userFavorites.channelId })
    .from(userFavorites)
    .where(eq(userFavorites.userId, userId))
    .orderBy(asc(userFavorites.createdAt), asc(userFavorites.channelId));
  return rows.map((row) => row.channelId);
}

async function mutateFavorites(userId: string, add: string[], remove: string[]) {
  const removeSet = new Set(remove);
  const requestedAdds = add.filter((id) => !removeSet.has(id));

  await db.transaction(async (tx) => {
    if (requestedAdds.length > 0) {
      const validChannels = await tx
        .select({ id: channels.id })
        .from(channels)
        .where(inArray(channels.id, requestedAdds));
      if (validChannels.length > 0) {
        await tx
          .insert(userFavorites)
          .values(validChannels.map((channel) => ({ userId, channelId: channel.id })))
          .onConflictDoNothing();
      }
    }

    if (remove.length > 0) {
      await tx
        .delete(userFavorites)
        .where(
          and(eq(userFavorites.userId, userId), inArray(userFavorites.channelId, remove)),
        );
    }
  });

  return listFavorites(userId);
}

async function parseObjectBody(request: Request) {
  const body: unknown = await readBoundedJson(request, 32 * 1_024);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new BadRequestError('Le corps JSON est invalide.', 'INVALID_JSON');
  }
  return body as Record<string, unknown>;
}

export const GET = withApiErrorHandler(async (request: Request) => {
  const authorization = await authorizeAppRequest(
    { bucket: 'favorites.read', limit: 120 },
    request,
  );
  if (!authorization.ok) return authorization.response;
  if (request.headers.has('x-preference-owner')) assertOwner(request.headers.get('x-preference-owner'),authorization.user.id);
  return NextResponse.json(
    favoritesResponseSchema.parse({ favorites: await listFavorites(authorization.user.id), owner: preferenceOwnerKey(authorization.user.id,isLocalDevMode()) }),
  );
});

export const PATCH = withApiErrorHandler(async (request: Request) => {
  const authorization = await authorizeAppRequest(
    { bucket: 'favorites.write', limit: 60 },
    request,
  );
  if (!authorization.ok) return authorization.response;

  const body = await parseObjectBody(request);
  assertOwner(body.owner,authorization.user.id);
  const mutation = favoriteMutationSchema.safeParse(body);
  if (!mutation.success) {
    throw new BadRequestError('La modification de favoris est invalide.', 'INVALID_FAVORITE_MUTATION');
  }
  return NextResponse.json(
    favoritesResponseSchema.parse({
      owner: preferenceOwnerKey(authorization.user.id,isLocalDevMode()),
      favorites: await mutateFavorites(
        authorization.user.id,
        mutation.data.add,
        mutation.data.remove,
      ),
    }),
  );
});

export const POST = withApiErrorHandler(async (request: Request) => {
  const authorization = await authorizeAppRequest(
    { bucket: 'favorites.write', limit: 60 },
    request,
  );
  if (!authorization.ok) return authorization.response;

  const body = await parseObjectBody(request);
  assertOwner(body.owner,authorization.user.id);
  const mutation = favoriteMutationSchema.safeParse({
    add: body.channelIds ?? [body.channelId],
    remove: [],
  });
  if (!mutation.success) {
    throw new BadRequestError('Un identifiant de chaîne valide est requis.', 'INVALID_FAVORITE_MUTATION');
  }
  return NextResponse.json(
    favoritesResponseSchema.parse({
      owner: preferenceOwnerKey(authorization.user.id,isLocalDevMode()),
      favorites: await mutateFavorites(authorization.user.id, mutation.data.add, []),
    }),
    { status: 201 },
  );
});

export const DELETE = withApiErrorHandler(async (request: Request) => {
  const authorization = await authorizeAppRequest(
    { bucket: 'favorites.write', limit: 60 },
    request,
  );
  if (!authorization.ok) return authorization.response;

  const body = await parseObjectBody(request);
  assertOwner(body.owner,authorization.user.id);
  const mutation = favoriteMutationSchema.safeParse({
    add: [],
    remove: body.channelIds ?? [body.channelId],
  });
  if (!mutation.success) {
    throw new BadRequestError('Un identifiant de chaîne valide est requis.', 'INVALID_FAVORITE_MUTATION');
  }
  return NextResponse.json(
    favoritesResponseSchema.parse({
      owner: preferenceOwnerKey(authorization.user.id,isLocalDevMode()),
      favorites: await mutateFavorites(authorization.user.id, [], mutation.data.remove),
    }),
  );
});
