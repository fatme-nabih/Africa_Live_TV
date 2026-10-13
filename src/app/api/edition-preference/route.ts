import { NextResponse } from 'next/server';

import { editionPreferenceSchema } from '@/lib/api-contracts';
import { ApiError, BadRequestError, withApiErrorHandler } from '@/lib/api-errors';
import { readBoundedJson } from '@/lib/bounded-json';
import { savePreferredEdition } from '@/lib/edition-preference-store';
import { enabledEditions, isEditionEnabled } from '@/lib/editions';
import { isLocalDevMode } from '@/lib/local-dev';
import { preferenceOwnerKey } from '@/lib/preference-contracts';
import { authorizeCatalogRequest } from '@/lib/require-app-access';

// Édition choisie, mémorisée au compte (EDI-603). Simple préférence comme les pays suivis : tout compte connecté
// et non bloqué y a droit, sans abonnement. Le cookie de l'appareil reste prioritaire ; le compte sert aux autres appareils.
export const PUT = withApiErrorHandler(async (request: Request) => {
  const authorization = await authorizeCatalogRequest({ bucket: 'edition-preference.write', limit: 20 }, request);
  if (!authorization.ok) return authorization.response;

  const parsed = editionPreferenceSchema.safeParse(await readBoundedJson(request, 256));
  if (!parsed.success || !isEditionEnabled(parsed.data.edition, enabledEditions())) {
    throw new BadRequestError('Cette édition n’est pas disponible.', 'EDITION_UNAVAILABLE');
  }
  const owner = preferenceOwnerKey(authorization.user.id, isLocalDevMode());
  if (parsed.data.owner !== owner) throw new ApiError('Le compte a changé ou la page doit être rechargée.', 409, 'PREFERENCE_OWNER_CHANGED');

  const edition = await savePreferredEdition(authorization.user.id, parsed.data.edition);
  return NextResponse.json({ edition }, { headers: { 'Cache-Control': 'private, no-store' } });
});
