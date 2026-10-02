'use client';

import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import Hls from 'hls.js';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ExternalLink,
  LoaderCircle,
} from 'lucide-react';
import {
  LoadingOverlay,
  AwaitingUserOverlay,
  FailureOverlay,
  ExternalOpeningOverlay,
  ExternalOpenedOverlay,
  ExternalSuggestedOverlay,
} from './player/PlayerOverlays';
import { EmptyChannelState } from './player/EmptyChannelState';

import {
  buildMobileVlcUrl,
  detectMobilePlatform,
} from '@/lib/external-playback';
import {
  ApiRequestError,
  messageForApiError,
  openVlcRequestSchema,
  openVlcResponseSchema,
  playbackResolutionRequestSchema,
  playbackResolutionResponseSchema,
  readApiResponse,
} from '@/lib/api-contracts';
import {
  classifyHlsFailure,
  classifyPlayRejection,
  nextMediaRecoveryAction,
  nextNetworkRecoveryAction,
} from '@/lib/playback-errors';
import {
  sendPlaybackEvent,
  type PlayerEngine,
  type TelemetryPlayerEngine,
} from '@/lib/playback-events-client';
import {
  initialPlaybackState,
  playbackReducer,
  type PlaybackFailure,
} from '@/lib/playback-machine';
import { MAX_AUTOMATIC_WEB_ATTEMPTS } from '@/lib/local-playback-policy';
import { PlaybackAttemptTelemetry } from '@/lib/playback-telemetry';
import { isLocalPlaybackMode } from '@/lib/local-playback-mode';

const LOCAL_AUTOMATIC_PLAYBACK = isLocalPlaybackMode();
const PLAYBACK_START_TIMEOUT_MS = 15_000;

interface PlayerProps {
  channelId: string;
  channelName?: string;
  /** Local experiment: preparation only, explicit play and external handoff. */
  anchored?: boolean;
  onExternalHandoff?: () => void;
  initialVolume?: number;
  onVolumePreference?: (volume: number) => void;
}

type ActiveAttempt = {
  playbackSessionId: string;
  attemptId: string;
  channelId: string;
  engine: PlayerEngine;
  startedAt: number;
};



function telemetryEngine(engine: PlayerEngine | null | undefined): TelemetryPlayerEngine | null {
  return engine && engine !== 'browser'
    ? engine as TelemetryPlayerEngine
    : null;
}

export default function Player({ channelId, channelName = '', anchored = false, onExternalHandoff, initialVolume = 1, onVolumePreference }: PlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(true);
  const [volume, setVolume] = useState(initialVolume);
  const [fullscreenError, setFullscreenError] = useState('');
  const webAttemptCountRef = useRef(0);
  const automaticDecisionsRef = useRef(new Set<string>());
  const externalLaunchRequestedRef = useRef(false);
  const externalLaunchPendingRef = useRef(false);
  const launchIdRef = useRef<string | null>(null);
  const resolutionSequenceRef = useRef(0);
  const resolutionControllerRef = useRef<AbortController | null>(null);
  const externalControllerRef = useRef<AbortController | null>(null);
  const bufferingTimeoutRef = useRef<number | null>(null);
  const [state, dispatch] = useReducer(playbackReducer, initialPlaybackState);
  const [resolvedChannel, setResolvedChannel] = React.useState({ channelId, name: channelName });
  const displayedChannelName = channelName || (
    resolvedChannel.channelId === channelId ? resolvedChannel.name : ''
  ) || 'Chaîne Africa Live';
  const source = state.channelId === channelId ? state.source : null;
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (anchored && videoRef.current) videoRef.current.volume = initialVolume;
  }, [anchored, initialVolume]);
  const hlsRef = useRef<Hls | null>(null);
  const activeAttemptRef = useRef<ActiveAttempt | null>(null);
  const selectedChannelIdRef = useRef(channelId);
  const playbackSessionRef = useRef<{
    id: string;
    channelId: string;
    attemptId: string;
  } | null>(null);
  const failedAttemptIdsRef = useRef(new Set<string>());
  const autoPlayAttemptIdsRef = useRef(new Set<string>());
  const bufferingAttemptRef = useRef<string | null>(null);
  const lastBufferingAtRef = useRef(0);
  const mediaRecoveryCountRef = useRef(0);
  const networkRecoveryCountRef = useRef(0);
  const startupTimeoutRef = useRef<number | null>(null);
  const playbackStartedAttemptIdsRef = useRef(new Set<string>());
  const mountGenerationRef = useRef(0);
  const telemetryRef = useRef<PlaybackAttemptTelemetry | null>(null);
  if (telemetryRef.current == null) {
    telemetryRef.current = new PlaybackAttemptTelemetry(sendPlaybackEvent);
  }

  useEffect(() => {
    selectedChannelIdRef.current = channelId;
    networkRecoveryCountRef.current = 0;
  }, [channelId]);

  const stopStartupTimeout = useCallback(() => {
    if (bufferingTimeoutRef.current != null) {
      window.clearTimeout(bufferingTimeoutRef.current);
      bufferingTimeoutRef.current = null;
    }
    if (startupTimeoutRef.current != null) {
      window.clearTimeout(startupTimeoutRef.current);
      startupTimeoutRef.current = null;
    }
  }, []);

  const emitForActiveAttempt = useCallback((
    event: Parameters<PlaybackAttemptTelemetry['emit']>[1],
    extras: Parameters<PlaybackAttemptTelemetry['emit']>[2] = {},
  ) => {
    const attempt = activeAttemptRef.current;
    if (!attempt) return false;
    return telemetryRef.current?.emit(attempt, event, {
      playerEngine: extras.playerEngine ?? telemetryEngine(attempt.engine),
      ...extras,
    }) ?? false;
  }, []);

  const updateAttemptEngine = useCallback((engine: PlayerEngine) => {
    if (activeAttemptRef.current) activeAttemptRef.current.engine = engine;
  }, []);

  const resolveWebSource = useCallback(async ({
    signal,
    previous,
  }: {
    signal?: AbortSignal;
    previous: { id: string; attemptId: string } | null;
  }) => {
    const body = playbackResolutionRequestSchema.parse({
      channelId,
      destination: 'web',
      playbackSessionId: previous?.id ?? null,
      previousAttemptId: previous?.attemptId ?? null,
    });
    const sequence = ++resolutionSequenceRef.current;
    resolutionControllerRef.current?.abort();
    const controller = new AbortController();
    resolutionControllerRef.current = controller;
    const abort = () => controller.abort();
    if (signal?.aborted) controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    const deadline = window.setTimeout(abort, 12_000);
    try {
    const response = await fetch('/api/playback/resolutions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: controller.signal,
    });
    const payload = await readApiResponse(response, playbackResolutionResponseSchema);
    if (selectedChannelIdRef.current !== channelId || sequence !== resolutionSequenceRef.current || controller.signal.aborted) return;
    webAttemptCountRef.current += 1;
    playbackSessionRef.current = {
      id: payload.playbackSessionId,
      channelId,
      attemptId: payload.attemptId,
    };
    setResolvedChannel({ channelId, name: payload.channel.name });
    dispatch({
      type: 'RESOLVED',
      source: { url: payload.sourceUrl },
      attemptId: payload.attemptId,
    });
    } catch (error) {
      if (sequence !== resolutionSequenceRef.current || signal?.aborted) return;
      if (controller.signal.aborted) {
        throw new ApiRequestError('La préparation de la lecture a dépassé le délai attendu.', 408, 'RESOLUTION_TIMEOUT');
      }
      throw error;
    } finally {
      window.clearTimeout(deadline);
      signal?.removeEventListener('abort', abort);
    }
  }, [channelId]);

  const handleResolutionFailure = useCallback((error: unknown) => {
    if (
      error instanceof ApiRequestError &&
      (error.code === 'WEB_PLAYBACK_UNAVAILABLE' ||
        (LOCAL_AUTOMATIC_PLAYBACK && error.code === 'PLAYBACK_ATTEMPT_LIMIT_REACHED'))
    ) {
      dispatch({ type: 'EXTERNAL_REQUIRED' });
      return;
    }
    dispatch({
      type: 'RESOLVE_FAILED',
      failure: {
        category: 'network',
        code: error instanceof ApiRequestError
          ? error.code ?? 'STREAM_RESOLUTION_FAILED'
          : 'STREAM_RESOLUTION_FAILED',
        message: messageForApiError(error, 'Impossible de préparer la lecture de cette chaîne.'),
      },
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    selectedChannelIdRef.current = channelId;
    playbackSessionRef.current = null;
    webAttemptCountRef.current = 0;
    automaticDecisionsRef.current.clear();
    externalLaunchRequestedRef.current = false;
    externalLaunchPendingRef.current = false;
    launchIdRef.current = crypto.randomUUID();
    externalControllerRef.current?.abort();
    dispatch({ type: 'SELECT_CHANNEL', channelId: channelId || null });
    if (!channelId) return () => controller.abort();

    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      void resolveWebSource({ signal: controller.signal, previous: null })
        .catch((error: unknown) => {
          if (!controller.signal.aborted) handleResolutionFailure(error);
        });
    });

    return () => {
      controller.abort();
      selectedChannelIdRef.current = '';
      resolutionSequenceRef.current += 1;
      resolutionControllerRef.current?.abort();
      externalControllerRef.current?.abort();
      stopStartupTimeout();
    };
  }, [channelId, handleResolutionFailure, resolveWebSource, stopStartupTimeout]);

  useEffect(() => {
    const previous = activeAttemptRef.current;
    if (previous && previous.attemptId !== state.attemptId) {
      telemetryRef.current?.emit(previous, 'stopped', {
        playerEngine: telemetryEngine(previous.engine),
        sessionEnded: previous.channelId !== channelId,
      });
      activeAttemptRef.current = null;
    }

    const playbackSession = playbackSessionRef.current;
    if (
      state.attemptId &&
      source &&
      channelId &&
      playbackSession?.attemptId === state.attemptId &&
      previous?.attemptId !== state.attemptId
    ) {
      const attempt: ActiveAttempt = {
        playbackSessionId: playbackSession.id,
        attemptId: state.attemptId,
        channelId,
        engine: 'browser',
        startedAt: performance.now(),
      };
      activeAttemptRef.current = attempt;
      failedAttemptIdsRef.current.delete(state.attemptId);
      mediaRecoveryCountRef.current = 0;
      networkRecoveryCountRef.current = 0;
      telemetryRef.current?.emit(attempt, 'opened', { playerEngine: null });
    }
  }, [channelId, source, state.attemptId]);

  useEffect(() => {
    const mountGeneration = mountGenerationRef;
    const generation = ++mountGeneration.current;
    return () => {
      queueMicrotask(() => {
        if (mountGeneration.current !== generation) return;
        const attempt = activeAttemptRef.current;
        if (attempt && attempt.engine !== 'vlc') {
          telemetryRef.current?.emit(attempt, 'stopped', {
            playerEngine: telemetryEngine(attempt.engine),
            sessionEnded: true,
          });
        }
      });
    };
  }, []);

  useEffect(() => {
    const handlePageHide = () => {
      const attempt = activeAttemptRef.current;
      if (attempt && attempt.engine !== 'vlc') {
        telemetryRef.current?.emit(attempt, 'stopped', {
          playerEngine: telemetryEngine(attempt.engine),
          sessionEnded: true,
        });
      }
    };
    window.addEventListener('pagehide', handlePageHide);
    return () => window.removeEventListener('pagehide', handlePageHide);
  }, []);

  const failCurrentAttempt = useCallback((failure: PlaybackFailure, engine?: PlayerEngine) => {
    const attemptId = activeAttemptRef.current?.attemptId;
    if (!attemptId || failedAttemptIdsRef.current.has(attemptId)) return;
    failedAttemptIdsRef.current.add(attemptId);
    stopStartupTimeout();
    emitForActiveAttempt('failed', {
      playerEngine: telemetryEngine(engine),
      errorCode: failure.code,
      errorMessage: `[${failure.category}] ${failure.message}`,
    });
    dispatch({ type: 'STREAM_FAILED', failure });
  }, [emitForActiveAttempt, stopStartupTimeout]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !source || !state.attemptId) return;

    hlsRef.current?.destroy();
    hlsRef.current = null;
    stopStartupTimeout();
    video.pause();
    video.removeAttribute('src');
    video.load();

    const playbackUrl = source.url;
    const currentAttemptId = state.attemptId;
    const isCurrent = () => activeAttemptRef.current?.attemptId === currentAttemptId && selectedChannelIdRef.current === channelId;
    const directFile = /\.(mp4|m4v|webm|og[gv])$/i.test(new URL(playbackUrl).pathname);
    if (LOCAL_AUTOMATIC_PLAYBACK) {
      startupTimeoutRef.current = window.setTimeout(() => {
        if (isCurrent()) failCurrentAttempt({ category: 'network', code: 'MANIFEST_START_TIMEOUT', message: 'Le flux ne répond pas dans le délai attendu.' });
      }, 12_000);
    }

    if (!directFile && Hls.isSupported()) {
      updateAttemptEngine('hls.js');
      dispatch({ type: 'ENGINE_SELECTED', engine: 'hls.js' });
      const hls = new Hls({
        autoStartLoad: false,
        maxBufferLength: 30,
        liveSyncDurationCount: 3,
        backBufferLength: 30,
        enableWorker: true,
        lowLatencyMode: false,
      });
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (!isCurrent()) return;
        if (anchored) stopStartupTimeout();
        dispatch({ type: 'STREAM_READY', engine: 'hls.js' });
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal || !isCurrent()) return;
        const httpStatus = data.response?.code ?? null;
        const failure = classifyHlsFailure({
          type: data.type,
          details: data.details,
          httpStatus,
          corsAllowed: true,
        });

        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          if (nextNetworkRecoveryAction(networkRecoveryCountRef.current) === 'retry') {
            networkRecoveryCountRef.current += 1;
            hls.startLoad();
            return;
          }
        }

        if (data.type === Hls.ErrorTypes.MEDIA_ERROR && failure.category === 'media') {
          const action = nextMediaRecoveryAction(mediaRecoveryCountRef.current);
          if (action !== 'fail') {
            mediaRecoveryCountRef.current += 1;
            dispatch({ type: 'MEDIA_RECOVERING' });
            if (action === 'swap-and-recover') hls.swapAudioCodec();
            hls.recoverMediaError();
            if (LOCAL_AUTOMATIC_PLAYBACK) {
              stopStartupTimeout();
              startupTimeoutRef.current = window.setTimeout(() => {
                if (isCurrent()) failCurrentAttempt({ category: 'media', code: 'MEDIA_RECOVERY_TIMEOUT', message: 'Le lecteur ne parvient pas à reprendre le flux.' });
              }, 12_000);
            }
            return;
          }
        }
        failCurrentAttempt(failure, 'hls.js');
      });

      const handleVideoError = () => {
        if (!isCurrent()) return;
        failCurrentAttempt(
          {
            category: 'media',
            code: 'VIDEO_ELEMENT_ERROR',
            message: 'L’élément vidéo a interrompu la lecture.',
          },
          'hls.js',
        );
      };
      video.addEventListener('error', handleVideoError);
      hls.loadSource(playbackUrl);
      hls.attachMedia(video);

      return () => {
        stopStartupTimeout();
        video.removeEventListener('error', handleVideoError);
        hls.destroy();
        if (hlsRef.current === hls) hlsRef.current = null;
        video.pause();
        video.removeAttribute('src');
        video.load();
      };
    }

    if (directFile || video.canPlayType('application/vnd.apple.mpegurl')) {
      updateAttemptEngine('native-hls');
      dispatch({ type: 'ENGINE_SELECTED', engine: 'native-hls' });
      let readyDispatched = false;
      const ready = () => {
        if (!readyDispatched && isCurrent()) {
          readyDispatched = true;
          if (anchored) stopStartupTimeout();
          dispatch({ type: 'STREAM_READY', engine: 'native-hls' });
        }
      };
      const failed = () => {
        if (!isCurrent()) return;
        const code = video.error?.code;
        failCurrentAttempt(
          code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
            ? {
                category: 'codec',
                code: 'NATIVE_CODEC_UNSUPPORTED',
                message: 'Le navigateur ne prend pas en charge le codec de ce flux.',
              }
            : {
                category: code === MediaError.MEDIA_ERR_NETWORK ? 'network' : 'media',
                code: 'NATIVE_HLS_ERROR',
                message: 'La lecture HLS native a échoué.',
              },
          'native-hls',
        );
      };
      video.addEventListener('loadedmetadata', ready);
      video.addEventListener('canplay', ready);
      video.addEventListener('error', failed);
      video.src = playbackUrl;
      video.load();
      return () => {
        stopStartupTimeout();
        video.removeEventListener('loadedmetadata', ready);
        video.removeEventListener('canplay', ready);
        video.removeEventListener('error', failed);
        video.pause();
        video.removeAttribute('src');
        video.load();
      };
    }

    failCurrentAttempt({
      category: 'unsupported',
      code: 'HLS_UNSUPPORTED',
      message: 'Ce navigateur ne prend pas en charge la lecture HLS.',
    });
  }, [anchored, channelId, failCurrentAttempt, source, state.attemptId, stopStartupTimeout, updateAttemptEngine]);

  const startPlayback = useCallback((userInitiated: boolean) => {
    const video = videoRef.current;
    const attempt = activeAttemptRef.current;
    if (!video || !attempt) return;

    dispatch({ type: 'PLAY_REQUESTED' });
    video.muted = !userInitiated;
    hlsRef.current?.startLoad(-1);
    stopStartupTimeout();
    startupTimeoutRef.current = window.setTimeout(() => {
      failCurrentAttempt({
        category: 'network',
        code: 'PLAYBACK_START_TIMEOUT',
        message: 'Le flux n’a fourni aucune image dans le délai attendu.',
      });
    }, PLAYBACK_START_TIMEOUT_MS);

    const attemptId = attempt.attemptId;
    void video.play().catch((error: unknown) => {
      if (
        activeAttemptRef.current?.attemptId !== attemptId ||
        failedAttemptIdsRef.current.has(attemptId) ||
        (error instanceof DOMException && error.name === 'AbortError')
      ) {
        return;
      }
      stopStartupTimeout();
      const failure = classifyPlayRejection(error);
      if (failure.category === 'autoplay') {
        emitForActiveAttempt('failed', {
          errorCode: failure.code,
          errorMessage: `[${failure.category}] ${failure.message}`,
        });
        dispatch({ type: 'AUTOPLAY_BLOCKED', failure });
      } else {
        failCurrentAttempt(failure);
      }
    });
  }, [emitForActiveAttempt, failCurrentAttempt, stopStartupTimeout]);

  useEffect(() => {
    if (anchored) return;
    if (state.phase !== 'ready' || !state.attemptId) return;
    if (autoPlayAttemptIdsRef.current.has(state.attemptId)) return;
    autoPlayAttemptIdsRef.current.add(state.attemptId);
    startPlayback(false);
  }, [anchored, startPlayback, state.attemptId, state.phase]);

  const handlePlaying = useCallback(() => {
    setPaused(false);
    stopStartupTimeout();
    networkRecoveryCountRef.current = 0;
    dispatch({ type: 'PLAYING' });
    const attempt = activeAttemptRef.current;
    if (attempt && !playbackStartedAttemptIdsRef.current.has(attempt.attemptId)) {
      playbackStartedAttemptIdsRef.current.add(attempt.attemptId);
      emitForActiveAttempt('started', {
        startupTimeMs: Math.round(performance.now() - attempt.startedAt),
      });
    }
    if (attempt && bufferingAttemptRef.current === attempt.attemptId) {
      bufferingAttemptRef.current = null;
      emitForActiveAttempt('buffering_ended');
    }
  }, [emitForActiveAttempt, stopStartupTimeout]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (
      state.phase === 'loading' &&
      video &&
      !video.paused &&
      !video.ended &&
      video.currentTime > 0 &&
      video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
    ) {
      handlePlaying();
    }
  }, [handlePlaying, state.phase]);

  const handlePause = useCallback(() => {
    setPaused(true);
    if (anchored) { hlsRef.current?.stopLoad(); stopStartupTimeout(); }
    const attempt = activeAttemptRef.current;
    if (state.phase === 'playing' && attempt && playbackStartedAttemptIdsRef.current.has(attempt.attemptId)) {
      stopStartupTimeout();
      emitForActiveAttempt('paused');
    }
  }, [anchored, emitForActiveAttempt, state.phase, stopStartupTimeout]);

  const handleWaiting = useCallback(() => {
    const attemptId = activeAttemptRef.current?.attemptId;
    if (!attemptId) return;
    const now = Date.now();
    if (bufferingAttemptRef.current === attemptId || now - lastBufferingAtRef.current < 5_000) {
      return;
    }
    bufferingAttemptRef.current = attemptId;
    lastBufferingAtRef.current = now;
    emitForActiveAttempt('buffering_started');
    if (LOCAL_AUTOMATIC_PLAYBACK && playbackStartedAttemptIdsRef.current.has(attemptId)) {
      bufferingTimeoutRef.current = window.setTimeout(() => {
        if (activeAttemptRef.current?.attemptId === attemptId && !videoRef.current?.paused) {
          failCurrentAttempt({ category: 'network', code: 'PLAYBACK_STALLED', message: 'Le flux reste interrompu.' });
        }
      }, 15_000);
    }
  }, [emitForActiveAttempt, failCurrentAttempt]);

  const tryAnotherSource = useCallback(() => {
    const previous = playbackSessionRef.current;
    if (!previous || previous.channelId !== channelId) return;
    dispatch({ type: 'SELECT_CHANNEL', channelId });
    void resolveWebSource({
      previous: {
        id: previous.id,
        attemptId: previous.attemptId,
      },
    }).catch(handleResolutionFailure);
  }, [channelId, handleResolutionFailure, resolveWebSource]);

  const openExternalPlayer = useCallback((retry = false) => {
    if (anchored) {
      onExternalHandoff?.();
      return;
    }
    if (externalLaunchPendingRef.current) return;
    if (LOCAL_AUTOMATIC_PLAYBACK && externalLaunchRequestedRef.current && !retry) return;
    if (retry || !launchIdRef.current) launchIdRef.current = crypto.randomUUID();
    externalLaunchRequestedRef.current = true;
    resolutionSequenceRef.current += 1;
    resolutionControllerRef.current?.abort();
    stopStartupTimeout();
    hlsRef.current?.destroy();
    hlsRef.current = null;
    videoRef.current?.pause();
    videoRef.current?.removeAttribute('src');
    videoRef.current?.load();
    const active = activeAttemptRef.current;
    if (active) telemetryRef.current?.emit(active, 'stopped', { playerEngine: telemetryEngine(active.engine), sessionEnded: true });
    activeAttemptRef.current = null;
    dispatch({ type: 'EXTERNAL_REQUESTED', userInitiated: true });

    if (LOCAL_AUTOMATIC_PLAYBACK) {
      externalControllerRef.current?.abort();
      const controller = new AbortController();
      externalControllerRef.current = controller;
      externalLaunchPendingRef.current = true;
      const deadline = window.setTimeout(() => controller.abort(), 15_000);
      const body = openVlcRequestSchema.parse({ channelId, launchId: launchIdRef.current });
      void fetch('/api/open-vlc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
        .then(async (response) => {
          await readApiResponse(response, openVlcResponseSchema);
          if (selectedChannelIdRef.current !== channelId) return;
          const previous = activeAttemptRef.current;
          if (previous) {
            telemetryRef.current?.emit(previous, 'stopped', {
              playerEngine: telemetryEngine(previous.engine),
              sessionEnded: true,
            });
            activeAttemptRef.current = null;
          }
          dispatch({ type: 'EXTERNAL_OPENED' });
        })
        .catch((error: unknown) => {
          if (selectedChannelIdRef.current !== channelId) return;
          const failure: PlaybackFailure = {
            category: 'unknown',
            code: 'VLC_LAUNCH_FAILED',
            message: `VLC n’a pas pu être lancé${error instanceof Error ? ` (${error.message})` : ''}.`,
          };
          emitForActiveAttempt('failed', {
            playerEngine: 'vlc',
            errorCode: failure.code,
            errorMessage: failure.message,
          });
          dispatch({ type: 'EXTERNAL_FAILED', failure });
        })
        .finally(() => {
          window.clearTimeout(deadline);
          if (externalControllerRef.current === controller) externalLaunchPendingRef.current = false;
        });
      return;
    }

    const mobilePlatform = detectMobilePlatform(navigator.userAgent);
    const body = playbackResolutionRequestSchema.parse({
      channelId,
      destination: 'vlc-mobile',
    });
    void fetch('/api/playback/resolutions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    })
      .then((response) => readApiResponse(response, playbackResolutionResponseSchema))
      .then((payload) => {
        if (selectedChannelIdRef.current !== channelId) return;

        const parsed = new URL(payload.sourceUrl);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          throw new Error('Protocole non pris en charge');
        }
        const safeStreamUrl = parsed.toString();

        const targetUrl = mobilePlatform
          ? buildMobileVlcUrl(safeStreamUrl, mobilePlatform)
          : `vlc://${safeStreamUrl}`;
        const externalLink = document.createElement('a');
        externalLink.setAttribute('href', targetUrl);
        externalLink.setAttribute('rel', 'noopener noreferrer');
        externalLink.style.display = 'none';
        document.body.appendChild(externalLink);
        externalLink.click();
        document.body.removeChild(externalLink);

        const previous = activeAttemptRef.current;
        if (previous) {
          telemetryRef.current?.emit(previous, 'stopped', {
            playerEngine: telemetryEngine(previous.engine),
            sessionEnded: true,
          });
          activeAttemptRef.current = null;
        }

        const attempt: ActiveAttempt = {
          playbackSessionId: payload.playbackSessionId,
          attemptId: payload.attemptId,
          channelId,
          engine: 'vlc',
          startedAt: performance.now(),
        };
        activeAttemptRef.current = attempt;
        playbackSessionRef.current = {
          id: payload.playbackSessionId,
          channelId,
          attemptId: payload.attemptId,
        };
        telemetryRef.current?.emit(attempt, 'opened', { playerEngine: 'vlc' });
        dispatch({ type: 'EXTERNAL_OPENED' });
      })
      .catch((error: unknown) => {
        if (selectedChannelIdRef.current !== channelId) return;
        const failure: PlaybackFailure = {
          category: 'unknown',
          code: error instanceof ApiRequestError
            ? error.code ?? 'EXTERNAL_STREAM_UNAVAILABLE'
            : 'EXTERNAL_STREAM_UNAVAILABLE',
          message: messageForApiError(error, 'Impossible de lancer VLC pour cette chaîne.'),
        };
        emitForActiveAttempt('failed', {
          playerEngine: 'vlc',
          errorCode: failure.code,
          errorMessage: failure.message,
        });
        dispatch({ type: 'EXTERNAL_FAILED', failure });
      });
  }, [anchored, onExternalHandoff, channelId, emitForActiveAttempt, stopStartupTimeout]);

  useEffect(() => {
    if (anchored) return;
    if (state.channelId !== channelId) return;
    if (state.phase === 'external-required') {
      openExternalPlayer();
    } else if (state.phase === 'exhausted' && state.engine !== 'vlc' && state.attemptId && source && state.failure?.category !== 'autoplay') {
      if (automaticDecisionsRef.current.has(state.attemptId)) return;
      automaticDecisionsRef.current.add(state.attemptId);
      if (webAttemptCountRef.current < MAX_AUTOMATIC_WEB_ATTEMPTS) tryAnotherSource();
      else openExternalPlayer();
    }
  }, [anchored, channelId, openExternalPlayer, source, state.attemptId, state.channelId, state.engine, state.failure?.category, state.phase, tryAnotherSource]);

  if (!channelId) {
    return <EmptyChannelState />;
  }

  const loading = state.phase === 'resolving' || state.phase === 'loading' || state.phase === 'external-opening';
  const waitingForUser = state.phase === 'ready' || state.phase === 'awaiting-user';
  const externalReady = state.phase === 'external-ready';
  const externalOpened = state.phase === 'external-opened';
  const externalSuggested = state.phase === 'external-required' || (
    state.phase === 'exhausted' &&
    state.engine !== 'vlc' &&
    Boolean(source) &&
    state.failure?.category !== 'autoplay'
  );
  const visibleFailure = state.phase === 'exhausted' && !externalSuggested ? state.failure : null;
  const showError = Boolean(visibleFailure);
  const mode = externalSuggested || externalReady || externalOpened
    ? 'Lecteur VLC'
    : state.engine === 'vlc' ? 'VLC'
      : state.engine ? 'Navigateur'
        : source ? 'Préparation' : 'Indisponible';

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-black/60 shadow-2xl backdrop-blur-xl"
    >
      <div className="group/player relative flex aspect-video w-full items-center justify-center bg-black">
        <AnimatePresence>
          <LoadingOverlay key="loading" loading={loading} waitingForUser={waitingForUser} />
          <AwaitingUserOverlay 
            key="awaiting-user"
            waitingForUser={waitingForUser} 
            phase={state.phase} 
            failureCategory={state.failure?.category} 
            onPlay={() => startPlayback(true)} 
          />
          <FailureOverlay 
            key="failure"
            visibleFailure={visibleFailure} 
            attemptId={state.attemptId} 
            engine={state.engine} 
            openExternalPlayer={openExternalPlayer} 
            tryAnotherSource={tryAnotherSource} 
          />
          <ExternalOpeningOverlay key="external-opening" phase={state.phase} />
          <ExternalOpenedOverlay 
            key="external-opened"
            externalOpened={externalOpened} 
            openExternalPlayer={openExternalPlayer} 
          />
          <ExternalSuggestedOverlay 
            key="external-suggested"
            externalSuggested={externalSuggested} 
            externalOpened={externalOpened} 
            phase={state.phase} 
            attemptId={state.attemptId} 
            tryAnotherSource={tryAnotherSource} 
            openExternalPlayer={openExternalPlayer} 
          />
        </AnimatePresence>

        <video
          ref={videoRef}
          controls
          playsInline
          onPlaying={handlePlaying}
          onPlay={() => { if (anchored) hlsRef.current?.startLoad(-1); }}
          onTimeUpdate={handleTimeUpdate}
          onPause={handlePause}
          onWaiting={handleWaiting}
          onVolumeChange={() => {
            const video = videoRef.current;
            if (video) {
              const value = video.muted ? 0 : video.volume;
              setVolume(value);
              onVolumePreference?.(value);
            }
          }}
          className={`h-full w-full object-contain ${loading || waitingForUser || showError || externalSuggested || externalReady || externalOpened ? 'pointer-events-none' : ''}`}
        />
      </div>

      {anchored && (
        <div className="flex flex-wrap items-center gap-3 border-t border-white/10 bg-black p-3 text-xs">
          <button type="button" disabled={!source || loading || externalSuggested || showError}
            onClick={() => {
              if (videoRef.current?.paused) startPlayback(true);
              else { videoRef.current?.pause(); hlsRef.current?.stopLoad(); }
            }}
            className="rounded-lg border border-white/20 px-3 py-2 focus-visible:ring-2 focus-visible:ring-amber-400 disabled:opacity-40">
            {paused ? 'Lire' : 'Pause'}
          </button>
          <label className="flex items-center gap-2">Volume
            <input aria-label="Volume" type="range" min="0" max="1" step="0.05" value={volume}
              className="w-24 accent-amber-400 focus-visible:ring-2 focus-visible:ring-amber-400"
              onChange={event => {
                const video = videoRef.current;
                if (!video) return;
                video.muted = false;
                video.volume = Number(event.target.value);
                setVolume(video.volume);
              }} />
          </label>
          <button type="button" className="rounded-lg border border-white/20 px-3 py-2 focus-visible:ring-2 focus-visible:ring-amber-400"
            onClick={() => {
              setFullscreenError('');
              const action = document.fullscreenElement ? document.exitFullscreen() : containerRef.current?.requestFullscreen?.();
              if (!action) setFullscreenError('Le plein écran est indisponible sur ce navigateur.');
              else void action.catch(() => setFullscreenError('Le plein écran a été refusé par le navigateur.'));
            }}>Plein écran</button>
          {fullscreenError && <p role="status">{fullscreenError}</p>}
        </div>
      )}

      <div className="flex flex-col gap-3.5 border-t border-white/[0.07] bg-white/[0.02] p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-400">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
              DIRECT
            </span>
            <span className="text-[11px] text-zinc-500">•</span>
            <span className="text-xs text-zinc-400 font-medium">Mode : {mode}</span>
          </div>
          <h3 className="truncate text-lg sm:text-xl font-bold tracking-tight text-white">{displayedChannelName}</h3>
          <p className="mt-2 truncate text-xs text-zinc-400">
            {source ? 'Source sélectionnée' : 'Source indisponible'}
          </p>
          <p className="mt-1 text-xs font-semibold text-zinc-300">Mode effectif : {mode}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          {(externalSuggested || externalReady || externalOpened || state.engine === 'vlc') && (
            <button
              type="button"
              onClick={() => openExternalPlayer(true)}
              disabled={state.phase === 'external-opening'}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/40 bg-amber-400/15 hover:bg-amber-400/25 px-4 py-2 text-xs sm:text-sm font-bold text-amber-300 shadow-sm transition disabled:opacity-50"
            >
              {state.phase === 'external-opening' ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              {state.phase === 'external-opening' ? 'Lancement…' : 'Relancer VLC'}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
