import { and, asc, eq, inArray } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { db } from '@/db';
import { channels, userFavorites } from '@/db/schema';
import { favoriteMutationSchema, favoritesResponseSchema } from '@/lib/api-contracts';
import { readBoundedJson } from '@/lib/bounded-json';
import { authorizeAppRequest } from '@/lib/require-app-access';

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
    throw new Error('Invalid JSON body');
  }
  return body as Record<string, unknown>;
}

export async function GET(request: Request) {
  const authorization = await authorizeAppRequest(
    { bucket: 'favorites.read', limit: 120 },
    request,
  );
  if (!authorization.ok) return authorization.response;
  return NextResponse.json(
    favoritesResponseSchema.parse({ favorites: await listFavorites(authorization.user.id) }),
  );
}

export async function PATCH(request: Request) {
  const authorization = await authorizeAppRequest(
    { bucket: 'favorites.write', limit: 60 },
    request,
  );
  if (!authorization.ok) return authorization.response;

  let body: Record<string, unknown>;
  try {
    body = await parseObjectBody(request);
  } catch {
    return NextResponse.json(
      { error: 'Le corps JSON est invalide.', code: 'INVALID_JSON' },
      { status: 400 },
    );
  }
  const mutation = favoriteMutationSchema.safeParse(body);
  if (!mutation.success) {
    return NextResponse.json(
      { error: 'La modification de favoris est invalide.', code: 'INVALID_FAVORITE_MUTATION' },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(
      favoritesResponseSchema.parse({
        favorites: await mutateFavorites(
          authorization.user.id,
          mutation.data.add,
          mutation.data.remove,
        ),
      }),
    );
  } catch (error) {
    console.error('Erreur API favoris PATCH:', error);
    return NextResponse.json(
      { error: 'Impossible de mettre à jour les favoris.', code: 'FAVORITES_UNAVAILABLE' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const authorization = await authorizeAppRequest(
    { bucket: 'favorites.write', limit: 60 },
    request,
  );
  if (!authorization.ok) return authorization.response;

  let body: Record<string, unknown>;
  try {
    body = await parseObjectBody(request);
  } catch {
    return NextResponse.json(
      { error: 'Le corps JSON est invalide.', code: 'INVALID_JSON' },
      { status: 400 },
    );
  }
  const mutation = favoriteMutationSchema.safeParse({
    add: body.channelIds ?? [body.channelId],
    remove: [],
  });
  if (!mutation.success) {
    return NextResponse.json(
      { error: 'Un identifiant de chaîne valide est requis.', code: 'INVALID_FAVORITE_MUTATION' },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(
      favoritesResponseSchema.parse({
        favorites: await mutateFavorites(authorization.user.id, mutation.data.add, []),
      }),
      { status: 201 },
    );
  } catch (error) {
    console.error('Erreur API favoris POST:', error);
    return NextResponse.json(
      { error: 'Impossible de mettre à jour les favoris.', code: 'FAVORITES_UNAVAILABLE' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const authorization = await authorizeAppRequest(
    { bucket: 'favorites.write', limit: 60 },
    request,
  );
  if (!authorization.ok) return authorization.response;

  let body: Record<string, unknown>;
  try {
    body = await parseObjectBody(request);
  } catch {
    return NextResponse.json(
      { error: 'Le corps JSON est invalide.', code: 'INVALID_JSON' },
      { status: 400 },
    );
  }
  const mutation = favoriteMutationSchema.safeParse({
    add: [],
    remove: body.channelIds ?? [body.channelId],
  });
  if (!mutation.success) {
    return NextResponse.json(
      { error: 'Un identifiant de chaîne valide est requis.', code: 'INVALID_FAVORITE_MUTATION' },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(
      favoritesResponseSchema.parse({
        favorites: await mutateFavorites(authorization.user.id, [], mutation.data.remove),
      }),
    );
  } catch (error) {
    console.error('Erreur API favoris DELETE:', error);
    return NextResponse.json(
      { error: 'Impossible de mettre à jour les favoris.', code: 'FAVORITES_UNAVAILABLE' },
      { status: 500 },
    );
  }
}
