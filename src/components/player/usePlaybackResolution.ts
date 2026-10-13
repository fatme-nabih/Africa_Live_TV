'use client';
import { useI18n } from '@/i18n/client';

import { useCallback, useRef, type Dispatch, type RefObject } from 'react';
import { ApiRequestError, playbackResolutionRequestSchema, playbackResolutionResponseSchema, readApiResponse } from '@/lib/api-contracts';
import type { PlaybackEvent } from '@/lib/playback-machine';

export type PlaybackSession = { id: string; channelId: string; attemptId: string };
type Options = {
  channelId: string;
  selectedChannelIdRef: RefObject<string>;
  webAttemptCountRef: RefObject<number>;
  playbackSessionRef: RefObject<PlaybackSession | null>;
  setResolvedChannel: (channel: { channelId: string; name: string }) => void;
  dispatch: Dispatch<PlaybackEvent>;
};

// This hook owns the resolution controller, sequence and 12-second deadline.
// The selection effect in Player cancels it before replacing a channel.
export function usePlaybackResolution({ channelId, selectedChannelIdRef, webAttemptCountRef, playbackSessionRef, setResolvedChannel, dispatch }: Options) {
  const { t, edition } = useI18n();
  const sequenceRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const cancelResolution = useCallback(() => {
    sequenceRef.current += 1;
    controllerRef.current?.abort();
  }, []);

  const resolveWebSource = useCallback(async ({ signal, previous }: {
    signal?: AbortSignal;
    previous: Pick<PlaybackSession, 'id' | 'attemptId'> | null;
  }) => {
    const body = playbackResolutionRequestSchema.parse({
      channelId, destination: 'web', playbackSessionId: previous?.id ?? null,
      previousAttemptId: previous?.attemptId ?? null,
    });
    const sequence = ++sequenceRef.current;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const abort = () => controller.abort();
    if (signal?.aborted) controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    const deadline = window.setTimeout(abort, 12_000);
    try {
      const response = await fetch('/api/playback/resolutions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body), cache: 'no-store', signal: controller.signal,
      });
      const payload = await readApiResponse(response, playbackResolutionResponseSchema);
      if (selectedChannelIdRef.current !== channelId || sequence !== sequenceRef.current || controller.signal.aborted) return;
      webAttemptCountRef.current += 1;
      playbackSessionRef.current = { id: payload.playbackSessionId, channelId, attemptId: payload.attemptId };
      setResolvedChannel({ channelId, name: payload.channel.name });
      dispatch({ type: 'RESOLVED', source: { url: payload.sourceUrl }, attemptId: payload.attemptId });
    } catch (error) {
      if (sequence !== sequenceRef.current || signal?.aborted) return;
      if (controller.signal.aborted) throw new ApiRequestError(t.player.copy["La préparation de la lecture a dépassé le délai attendu."], 408, 'RESOLUTION_TIMEOUT');
      if (edition !== 'fr') throw new ApiRequestError(error instanceof ApiRequestError && error.code ? (t.errors.api as Record<string,string>)[error.code] ?? t.player.copy['Impossible de préparer la lecture de cette chaîne.'] : t.player.copy['Impossible de préparer la lecture de cette chaîne.'], error instanceof ApiRequestError ? error.status : 503, error instanceof ApiRequestError ? error.code : undefined);
      throw error;
    } finally {
      window.clearTimeout(deadline);
      signal?.removeEventListener('abort', abort);
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }, [channelId, selectedChannelIdRef, webAttemptCountRef, playbackSessionRef, setResolvedChannel, dispatch, t.player.copy, t.errors.api, edition]);
  return { resolveWebSource, cancelResolution };
}
