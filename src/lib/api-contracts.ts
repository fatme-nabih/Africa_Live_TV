import { z } from 'zod';

import {
  CHANNEL_AVAILABILITY_STATUSES,
  PLAYBACK_MODES,
  STREAM_STATUSES,
} from '@/types/channel';

export const streamStatusSchema = z.enum(STREAM_STATUSES);
export const playbackModeSchema = z.enum(PLAYBACK_MODES);
export const channelAvailabilityStatusSchema = z.enum(
  CHANNEL_AVAILABILITY_STATUSES,
);

export const channelSchema = z.object({
  id: z.string().min(1).max(200),
  name: z.string().min(1).max(500),
  logoUrl: z.url().nullable(),
  groupTitle: z.string().max(500).nullable(),
  countryCode: z.string().max(10).nullable(),
  playbackMode: playbackModeSchema,
  availabilityStatus: channelAvailabilityStatusSchema,
}).strict();

export const channelFiltersSchema = z.object({
  search: z
    .string()
    .trim()
    .max(200)
    .refine((value) => value.length === 0 || value.length >= 2)
    .default(''),
  country: z.string().trim().max(10).default(''),
  group: z.string().trim().max(500).default(''),
  language: z
    .string()
    .trim()
    .toLowerCase()
    .max(35)
    .regex(/^[a-z]{2,3}(?:-[a-z0-9]{1,8})*$/)
    .or(z.literal(''))
    .default(''),
  status: z.union([streamStatusSchema, z.literal('')]).default(''),
});

export const catalogRequestSchema = channelFiltersSchema.extend({
  favoritesOnly: z.boolean().default(false),
  cursor: z.string().max(1_000).nullable().default(null),
  limit: z.number().int().min(1).max(30).default(30),
});

export const catalogResponseSchema = z.object({
  channels: z.array(channelSchema),
  hasMore: z.boolean(),
  limit: z.number().int().min(1).max(30),
  nextCursor: z.string().nullable(),
}).strict();

export const playbackResolutionDestinationSchema = z.enum(['web', 'vlc-mobile']);

export const playbackResolutionRequestSchema = z.object({
  channelId: z.string().trim().min(1).max(200),
  destination: playbackResolutionDestinationSchema,
  playbackSessionId: z.uuid().nullable().default(null),
  previousAttemptId: z.uuid().nullable().default(null),
}).strict().refine(
  ({ playbackSessionId, previousAttemptId }) =>
    Boolean(playbackSessionId) === Boolean(previousAttemptId),
  {
    message: 'La session et la tentative précédente doivent être fournies ensemble.',
    path: ['previousAttemptId'],
  },
);

export const playbackResolutionResponseSchema = z.object({
  playbackSessionId: z.uuid(),
  attemptId: z.uuid(),
  channel: z.object({
    id: z.string().min(1).max(200),
    name: z.string().min(1).max(500),
  }).strict(),
  sourceUrl: z.url(),
}).strict();

export const telemetryPlayerEngineSchema = z.enum([
  'hls.js',
  'native-hls',
  'media_kit',
  'flutter',
  'vlc',
]);

export const playerEngineSchema = z.enum([
  ...telemetryPlayerEngineSchema.options,
  'browser',
]);

export const playbackEventNameSchema = z.enum([
  'opened',
  'started',
  'paused',
  'stopped',
  'failed',
  'buffering_started',
  'buffering_ended',
]);

const optionalText = (maximum: number) => z.string().trim().min(1).max(maximum).nullable().optional();

export const playbackEventRequestSchema = z.object({
  schemaVersion: z.literal(1),
  event: playbackEventNameSchema,
  playbackSessionId: z.uuid(),
  attemptId: z.uuid(),
  channelId: z.string().trim().min(1).max(200),
  timestamp: z.iso.datetime({ offset: true }),
  startupTimeMs: z.number().int().nonnegative().nullable().optional(),
  devicePlatform: z.string().trim().min(1).max(100),
  appVersion: optionalText(100),
  playerEngine: telemetryPlayerEngineSchema.nullable().optional(),
  deviceModel: optionalText(200),
  osVersion: optionalText(100),
  errorCode: optionalText(100),
  errorMessage: optionalText(1_000),
  sessionEnded: z.boolean().default(false),
}).strict().refine(({ event, sessionEnded }) => !sessionEnded || event === 'stopped', {
  message: 'Seul un événement stopped peut terminer une session.',
  path: ['sessionEnded'],
});

export const playbackEventResponseSchema = z.object({
  ok: z.literal(true),
  id: z.string().nullable(),
  deduplicated: z.boolean(),
});

export const openVlcRequestSchema = z.object({
  launchId: z.uuid().optional(),
  channelId: z.string().trim().min(1).max(200),
}).strict();

export const openVlcResponseSchema = z.object({ ok: z.literal(true) });

export const filterOptionsResponseSchema = z.object({
  countries: z.array(z.string().min(1).max(10)),
  groups: z.array(z.string().min(1).max(500)),
  languages: z.array(
    z.string().min(2).max(35).regex(/^[a-z]{2,3}(?:-[a-z0-9]{1,8})*$/),
  ),
  statuses: z.array(streamStatusSchema),
});

const favoriteIdSchema = z.string().min(1).max(200);

export const favoritesResponseSchema = z.object({
  favorites: z.array(favoriteIdSchema),
});

export const favoriteMutationSchema = z
  .object({
    add: z.array(favoriteIdSchema).max(100).default([]),
    remove: z.array(favoriteIdSchema).max(100).default([]),
  })
  .transform(({ add, remove }) => ({
    add: [...new Set(add)],
    remove: [...new Set(remove)],
  }))
  .refine(({ add, remove }) => add.length + remove.length > 0, {
    message: 'Au moins une modification de favori est requise.',
  });

export const apiErrorSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
});

export type CatalogRequest = z.infer<typeof catalogRequestSchema>;
export type CatalogChannel = z.infer<typeof channelSchema>;
export type CatalogResponse = z.infer<typeof catalogResponseSchema>;
export type PlaybackResolutionDestination = z.infer<typeof playbackResolutionDestinationSchema>;
export type PlaybackResolutionRequest = z.infer<typeof playbackResolutionRequestSchema>;
export type PlaybackResolutionResponse = z.infer<typeof playbackResolutionResponseSchema>;
export type FilterOptionsResponse = z.infer<typeof filterOptionsResponseSchema>;
export type FavoriteMutation = z.infer<typeof favoriteMutationSchema>;
export type PlaybackEventName = z.infer<typeof playbackEventNameSchema>;
export type PlayerEngine = z.infer<typeof playerEngineSchema>;
export type TelemetryPlayerEngine = z.infer<typeof telemetryPlayerEngineSchema>;

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export async function readApiResponse<T>(response: Response, schema: z.ZodType<T>): Promise<T> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    // Clerk deliberately answers unauthenticated API requests with an HTML 404.
    // Surface that as an expired session without weakening the server-side guard.
    if (response.status === 401 || response.status === 404) {
      throw new ApiRequestError(
        'Votre session a expiré. Reconnectez-vous pour continuer.',
        response.status,
        'AUTHENTICATION_REQUIRED',
      );
    }
    if (response.status === 403) {
      throw new ApiRequestError(
        'Votre compte ne permet pas d’effectuer cette action.',
        response.status,
        'ACCESS_DENIED',
      );
    }
    if (response.status >= 500) {
      throw new ApiRequestError(
        'Le serveur est temporairement indisponible.',
        response.status,
        'SERVER_UNAVAILABLE',
      );
    }
    throw new ApiRequestError('La réponse du serveur est illisible.', response.status);
  }

  if (!response.ok) {
    const parsedError = apiErrorSchema.safeParse(payload);
    throw new ApiRequestError(
      parsedError.success ? parsedError.data.error : `La requête a échoué (${response.status}).`,
      response.status,
      parsedError.success ? parsedError.data.code : undefined,
    );
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiRequestError('La réponse du serveur ne respecte pas le contrat attendu.', response.status);
  }
  return parsed.data;
}

export function messageForApiError(error: unknown, fallback: string) {
  if (error instanceof ApiRequestError || error instanceof Error) return error.message;
  return fallback;
}
