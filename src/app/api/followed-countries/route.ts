import { asc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { db } from '@/db';
import { userFollowedCountries } from '@/db/schema';
import { followedCountriesSchema } from '@/lib/api-contracts';
import { ApiError, BadRequestError, withApiErrorHandler } from '@/lib/api-errors';
import { readBoundedJson } from '@/lib/bounded-json';
import { AFRICAN_COUNTRIES } from '@/lib/radar-countries';
import { authorizeCatalogRequest } from '@/lib/require-app-access';
import { replaceAccountCountries } from '@/lib/followed-countries-store';
import { CountryVersionConflict, countryListVersion } from '@/lib/country-version';
import { preferenceOwnerKey } from '@/lib/preference-contracts';
import { isLocalDevMode } from '@/lib/local-dev';

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
  const owner = preferenceOwnerKey(authorization.user.id,isLocalDevMode());
  if (request.headers.has('x-preference-owner') && request.headers.get('x-preference-owner') !== owner) throw new ApiError('Le compte a changé. Rechargez la page.',409,'PREFERENCE_OWNER_CHANGED');
  const countries = await listFollowedCountries(authorization.user.id);
  return NextResponse.json({ countries, version: countryListVersion(countries), owner });
});

export const PUT = withApiErrorHandler(async (request: Request) => {
  const authorization = await authorizeCatalogRequest({ bucket: 'followed-countries.write', limit: 30 }, request);
  if (!authorization.ok) return authorization.response;

  const parsed = followedCountriesSchema.safeParse(await readBoundedJson(request, 1_024));
  if (!parsed.success || parsed.data.countries.some(code => !AFRICAN_CODES.has(code))) {
    throw new BadRequestError('La liste des pays suivis est invalide.', 'INVALID_FOLLOWED_COUNTRIES');
  }

  const userId = authorization.user.id;
  const owner = preferenceOwnerKey(userId,isLocalDevMode());
  if (parsed.data.owner !== owner) throw new ApiError('Le compte a changé ou la page doit être rechargée.',409,'PREFERENCE_OWNER_CHANGED');
  if (!parsed.data.baseVersion) throw new ApiError('Rechargez la page pour synchroniser vos choix en attente.',409,'PREFERENCE_VERSION_REQUIRED');
  try {
    const snapshot = await replaceAccountCountries(userId, parsed.data.countries, parsed.data.baseVersion);
    return NextResponse.json({ ...snapshot, owner });
  } catch (error) {
    if (error instanceof CountryVersionConflict) return NextResponse.json({ error: 'Les pays ont changé sur un autre appareil.', code: 'PREFERENCE_VERSION_CONFLICT', countries: error.countries, version: error.version, owner }, { status: 409 });
    throw error;
  }
});
