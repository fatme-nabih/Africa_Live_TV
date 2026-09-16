import 'server-only';

import { randomUUID } from 'node:crypto';

import { and, eq, gte, inArray } from 'drizzle-orm';

import { db } from '@/db';
import {
  channels,
  playbackAttempts,
  playbackSessions,
  streams,
} from '@/db/schema';
import { isLocalDevMode } from './local-dev';
import { isLocalPlaybackCandidate } from './local-playback-policy';
import { selectBestStream } from '@/lib/channel-selection';
import { directEligibilityStatesForDestination } from '@/lib/direct-eligibility';
import {
  isPlaybackSourceEligible,
  MAX_PLAYBACK_ATTEMPTS_PER_SESSION,
  playbackOperationExpiresAt,
  PLAYBACK_SOURCE_FRESHNESS_MS,
  productionPlaybackResolutionEnabled,
  type PlaybackDestination,
} from '@/lib/playback-resolution-policy';

const PLAYABLE_STATUSES = ['BROWSER_OK', 'VLC_ONLY'] as const;

export class PlaybackResolutionError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'PlaybackResolutionError';
  }
}

type ResolvePlaybackAttemptInput = {
  userId: string;
  channelId: string;
  destination: PlaybackDestination;
  playbackSessionId: string | null;
  previousAttemptId: string | null;
  accessExpiresAt: string | null;
  now?: Date;
};

function resolutionUnavailable(destination: PlaybackDestination) {
  if (destination === 'web') {
    return new PlaybackResolutionError(
      409,
      'WEB_PLAYBACK_UNAVAILABLE',
      'Cette chaîne nécessite actuellement un lecteur externe.',
    );
  }
  return new PlaybackResolutionError(
    404,
    'NO_ELIGIBLE_SOURCE',
    'Aucune source utilisable n’est disponible pour cette chaîne.',
  );
}

function isFallbackReplayError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: string; constraint?: string };
  return (
    candidate.code === '23505' &&
    candidate.constraint === 'playback_attempts_previous_attempt_uidx'
  );
}

export async function resolvePlaybackAttempt({
  userId,
  channelId,
  destination,
  playbackSessionId,
  previousAttemptId,
  accessExpiresAt,
  now = new Date(),
}: ResolvePlaybackAttemptInput) {
  if (!productionPlaybackResolutionEnabled()) {
    throw new PlaybackResolutionError(
      503,
      'PLAYBACK_ELIGIBILITY_PENDING',
      'La résolution de lecture attend la validation du catalogue de production.',
    );
  }

  try {
    return await db.transaction(async (tx) => {
      const [channel] = await tx
        .select({ id: channels.id, name: channels.name })
        .from(channels)
        .where(and(eq(channels.id, channelId), eq(channels.active, true)))
        .limit(1);
      if (!channel) {
        throw new PlaybackResolutionError(
          404,
          'CHANNEL_NOT_FOUND',
          'Cette chaîne est introuvable.',
        );
      }

      let session: typeof playbackSessions.$inferSelect | null = null;
      let previousAttempt: typeof playbackAttempts.$inferSelect | null = null;
      let attemptedStreamIds = new Set<string>();

      if (playbackSessionId && previousAttemptId) {
        const [lockedSession] = await tx
          .select()
          .from(playbackSessions)
          .where(eq(playbackSessions.id, playbackSessionId))
          .limit(1)
          .for('update');
        if (!lockedSession || lockedSession.userId !== userId) {
          throw new PlaybackResolutionError(
            404,
            'PLAYBACK_SESSION_NOT_FOUND',
            'Cette session de lecture est introuvable.',
          );
        }
        if (lockedSession.channelId !== channelId) {
          throw new PlaybackResolutionError(
            409,
            'PLAYBACK_SESSION_CHANNEL_MISMATCH',
            'Cette session appartient à une autre chaîne.',
          );
        }
        if (
          lockedSession.status !== 'active' ||
          new Date(lockedSession.expiresAt).getTime() <= now.getTime()
        ) {
          throw new PlaybackResolutionError(
            409,
            'PLAYBACK_SESSION_CLOSED',
            'Cette session de lecture est terminée ou expirée.',
          );
        }

        const [attempt] = await tx
          .select()
          .from(playbackAttempts)
          .where(and(
            eq(playbackAttempts.id, previousAttemptId),
            eq(playbackAttempts.playbackSessionId, lockedSession.id),
          ))
          .limit(1);
        if (!attempt || attempt.destination !== destination) {
          throw new PlaybackResolutionError(
            404,
            'PLAYBACK_ATTEMPT_NOT_FOUND',
            'Cette tentative de lecture est introuvable.',
          );
        }
        if (lockedSession.streamId !== attempt.streamId) {
          throw new PlaybackResolutionError(
            409,
            'PLAYBACK_ATTEMPT_SUPERSEDED',
            'Une nouvelle tentative a déjà remplacé cette source.',
          );
        }

        const priorAttempts = await tx
          .select({ streamId: playbackAttempts.streamId })
          .from(playbackAttempts)
          .where(eq(playbackAttempts.playbackSessionId, lockedSession.id));
        if (priorAttempts.length >= MAX_PLAYBACK_ATTEMPTS_PER_SESSION) {
          throw new PlaybackResolutionError(
            429,
            'PLAYBACK_ATTEMPT_LIMIT_REACHED',
            'Le nombre maximal de tentatives pour cette lecture est atteint.',
          );
        }

        session = lockedSession;
        previousAttempt = attempt;
        attemptedStreamIds = new Set(priorAttempts.map((item) => item.streamId));
      }

      const freshnessCutoff = new Date(
        now.getTime() - PLAYBACK_SOURCE_FRESHNESS_MS,
      ).toISOString();
      const sourceRows = await tx
        .select()
        .from(streams)
        .where(and(
          eq(streams.channelId, channelId),
          eq(streams.active, true),
          isLocalDevMode() ? undefined : inArray(streams.status, PLAYABLE_STATUSES),
          isLocalDevMode() ? undefined : inArray(
            streams.directEligibility,
            [...directEligibilityStatesForDestination(destination)],
          ),
          isLocalDevMode() ? undefined : gte(streams.lastSuccessAt, freshnessCutoff),
        ));
      const eligibleSources = sourceRows.filter(
        (source) =>
          !attemptedStreamIds.has(source.id) &&
          (isLocalDevMode()
            ? isLocalPlaybackCandidate(source, destination)
            : isPlaybackSourceEligible(source, destination, now)),
      );
      const preferredExternal = isLocalDevMode() && destination !== 'web'
        ? selectBestStream(eligibleSources.filter(source => source.status === 'VLC_ONLY'))
        : null;
      const selectedSource = preferredExternal ?? selectBestStream(eligibleSources);
      if (!selectedSource) throw resolutionUnavailable(destination);

      const expiresAt = session
        ? new Date(session.expiresAt)
        : playbackOperationExpiresAt(now, accessExpiresAt);
      const attemptId = randomUUID();

      if (!session) {
        const playbackSessionId = randomUUID();
        const [createdSession] = await tx
          .insert(playbackSessions)
          .values({
            id: playbackSessionId,
            userId,
            deviceId: null,
            channelId,
            streamId: selectedSource.id,
            status: 'active',
            schemaVersion: 1,
            playerEngine: destination === 'web' ? null : 'vlc',
            startedAt: now.toISOString(),
            expiresAt: expiresAt.toISOString(),
            lastHeartbeatAt: now.toISOString(),
          })
          .returning();
        session = createdSession ?? null;
      } else {
        await tx
          .update(playbackSessions)
          .set({
            streamId: selectedSource.id,
            playerEngine: destination === 'web' ? session.playerEngine : 'vlc',
            lastHeartbeatAt: now.toISOString(),
          })
          .where(and(
            eq(playbackSessions.id, session.id),
            eq(playbackSessions.userId, userId),
          ));
      }
      if (!session) throw new Error('PLAYBACK_SESSION_CREATION_FAILED');

      await tx.insert(playbackAttempts).values({
        id: attemptId,
        playbackSessionId: session.id,
        streamId: selectedSource.id,
        previousAttemptId: previousAttempt?.id ?? null,
        destination,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      });

      return {
        playbackSessionId: session.id,
        attemptId,
        channel,
        source: selectedSource,
      };
    });
  } catch (error) {
    if (error instanceof PlaybackResolutionError) throw error;
    if (isFallbackReplayError(error)) {
      throw new PlaybackResolutionError(
        409,
        'PLAYBACK_FALLBACK_ALREADY_USED',
        'Cette tentative a déjà demandé une source de remplacement.',
      );
    }
    throw error;
  }
}
