import { asc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { db } from '@/db';
import { userFollowedCountries } from '@/db/schema';
import { followedCountriesSchema } from '@/lib/api-contracts';
import { BadRequestError, withApiErrorHandler } from '@/lib/api-errors';
import { readBoundedJson } from '@/lib/bounded-json';
import { AFRICAN_COUNTRIES } from '@/lib/radar-countries';
import { authorizeCatalogRequest } from '@/lib/require-app-access';

// Pays suivis synchronisés au compte (UX-503b). Simple préférence : tout compte connecté et non bloqué y a droit,
// sans abonnement (comme la consultation du catalogue). Le stockage de l'appareil reste le repli hors connexion.
const AFRICAN_CODES: ReadonlySet<string> = new Set(AFRICAN_COUNTRIES.map(country => country.code));

async function listFollowedCountries(userId: string) {
  const rows = await db
    .select({ countryCode: userFollowedCountries.countryCode })
    .from(userFollowedCountries)
    .where(eq(userFollowedCountries.userId, userId))
    .orderBy(asc(userFollowedCountries.position));
  return rows.map(row => row.countryCode);
}

export const GET = withApiErrorHandler(async (request: Request) => {
  const authorization = await authorizeCatalogRequest({ bucket: 'followed-countries.read', limit: 60 }, request);
  if (!authorization.ok) return authorization.response;
  return NextResponse.json({ countries: await listFollowedCountries(authorization.user.id) });
});

export const PUT = withApiErrorHandler(async (request: Request) => {
  const authorization = await authorizeCatalogRequest({ bucket: 'followed-countries.write', limit: 30 }, request);
  if (!authorization.ok) return authorization.response;

  const parsed = followedCountriesSchema.safeParse(await readBoundedJson(request, 1_024));
  if (!parsed.success || parsed.data.countries.some(code => !AFRICAN_CODES.has(code))) {
    throw new BadRequestError('La liste des pays suivis est invalide.', 'INVALID_FOLLOWED_COUNTRIES');
  }

  const userId = authorization.user.id;
  await db.transaction(async tx => {
    await tx.delete(userFollowedCountries).where(eq(userFollowedCountries.userId, userId));
    if (parsed.data.countries.length > 0) {
      await tx.insert(userFollowedCountries).values(
        parsed.data.countries.map((countryCode, position) => ({ userId, countryCode, position })),
      );
    }
  });
  return NextResponse.json({ countries: await listFollowedCountries(userId) });
});
