import { createHmac, timingSafeEqual } from 'node:crypto';

import { z } from 'zod';

import { AFRICAN_COUNTRIES } from './radar-countries';

const CATALOG_CURSOR_TTL_MS = 15 * 60 * 1_000;

const catalogCursorPayloadSchema = z.object({
  version: z.literal(1),
  name: z.string().min(1).max(500),
  id: z.string().min(1).max(200),
  // Rang géographique (0 = Afrique, 1 = reste du monde), présent seulement avec l'ordre « Afrique d'abord ».
  rank: z.number().int().min(0).max(1).optional(),
  context: z.string().length(64),
  expiresAt: z.number().int().positive(),
});

export type CatalogCursor = Pick<
  z.infer<typeof catalogCursorPayloadSchema>,
  'name' | 'id' | 'rank'
>;

const AFRICAN_CODES: ReadonlySet<string> = new Set(AFRICAN_COUNTRIES.map(country => country.code));

/** Codes pays africains, dans l'ordre de la liste du Radar (source unique pour le tri SQL). */
export const AFRICAN_COUNTRY_CODES: readonly string[] = AFRICAN_COUNTRIES.map(country => country.code);

/** Rang d'une chaîne : 0 pour un pays africain, 1 sinon (pays absent compris). */
export function africaRank(countryCode: string | null | undefined): 0 | 1 {
  return countryCode && AFRICAN_CODES.has(countryCode.toUpperCase()) ? 0 : 1;
}

/**
 * Ordre par défaut « Afrique d'abord » : Afrique, puis reste du monde, puis nom. Il ne s'applique pas à une
 * recherche (le nom saisi décide) ni aux favoris (liste personnelle de l'utilisateur, par nom).
 */
export function usesAfricaFirstOrder(input: { search: string; favoritesOnly: boolean }) {
  return normalizeCatalogSearch(input.search) === '' && !input.favoritesOnly;
}

function cursorSecret() {
  const configured = process.env.CATALOG_CURSOR_SECRET ?? process.env.ABUSE_HASH_SECRET;
  if (configured && configured.length >= 32) return configured;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'CATALOG_CURSOR_SECRET or ABUSE_HASH_SECRET must contain at least 32 characters in production.',
    );
  }
  return 'lumina-development-catalog-cursor-secret';
}

function signature(payload: string) {
  return createHmac('sha256', cursorSecret())
    .update(`catalog-cursor-signature:v1:${payload}`)
    .digest('base64url');
}

export function normalizeCatalogSearch(value: string) {
  return value.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

export function catalogCursorContext(input: {
  userId: string;
  clerkSessionId: string | null;
  search: string;
  country: string;
  region?: '' | 'africa';
  group: string;
  language: string;
  status: string;
  favoritesOnly: boolean;
}) {
  return createHmac('sha256', cursorSecret())
    .update(
      JSON.stringify([
        'catalog-context:v1',
        input.userId,
        input.clerkSessionId,
        normalizeCatalogSearch(input.search),
        input.country.toUpperCase(),
        input.region ?? '',
        input.group,
        input.language.toLowerCase(),
        input.status,
        input.favoritesOnly,
      ]),
    )
    .digest('hex');
}

export function encodeCatalogCursor(
  cursor: CatalogCursor,
  context: string,
  now = new Date(),
) {
  const payload = Buffer.from(
    JSON.stringify(
      catalogCursorPayloadSchema.parse({
        version: 1,
        ...cursor,
        context,
        expiresAt: now.getTime() + CATALOG_CURSOR_TTL_MS,
      }),
    ),
    'utf8',
  ).toString('base64url');
  return `${payload}.${signature(payload)}`;
}

export function decodeCatalogCursor(
  value: string | null,
  context: string,
  now = new Date(),
): CatalogCursor | null {
  if (!value) return null;
  try {
    const [payload, receivedSignature, ...extra] = value.split('.');
    if (!payload || !receivedSignature || extra.length > 0) {
      throw new Error('INVALID_CATALOG_CURSOR');
    }
    const expectedSignature = signature(payload);
    const expected = Buffer.from(expectedSignature);
    const received = Buffer.from(receivedSignature);
    if (
      expected.length !== received.length ||
      !timingSafeEqual(expected, received)
    ) {
      throw new Error('INVALID_CATALOG_CURSOR');
    }
    const parsed = catalogCursorPayloadSchema.parse(
      JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')),
    );
    if (parsed.context !== context || parsed.expiresAt <= now.getTime()) {
      throw new Error('INVALID_CATALOG_CURSOR');
    }
    return parsed.rank === undefined
      ? { name: parsed.name, id: parsed.id }
      : { name: parsed.name, id: parsed.id, rank: parsed.rank };
  } catch {
    throw new Error('INVALID_CATALOG_CURSOR');
  }
}
