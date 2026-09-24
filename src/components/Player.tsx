'use client';

import React, { useCallback, useEffect, useReducer, useRef } from 'react';
import Hls from 'hls.js';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  Check,
  Copy,
  ExternalLink,
  Info,
  LoaderCircle,
  Play,
  RefreshCw,
  Tv,
} from 'lucide-react';

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
import { copyTextToClipboard } from '@/lib/clipboard';

const LOCAL_AUTOMATIC_PLAYBACK = isLocalPlaybackMode();
const PLAYBACK_START_TIMEOUT_MS = 15_000;

interface PlayerProps {
  channelId: string;
  channelName?: string;
}

type ActiveAttempt = {
  playbackSessionId: string;
  attemptId: string;
  channelId: string;
  engine: PlayerEngine;
  startedAt: number;
};

type PendingMobileVlcOpen = {
  playbackSessionId: string;
  attemptId: string;
  channelId: string;
  sourceUrl: string;
  launchUrl: string | null;
};

const failureLabels: Record<PlaybackFailure['category'], string> = {
  network: 'Erreur réseau',
  cors: 'Accès CORS refusé',
  codec: 'Codec incompatible',
  geoblocked: 'Flux géobloqué',
  autoplay: 'Action utilisateur requise',
  media: 'Erreur média',
  unsupported: 'Lecture non prise en charge',
  'mixed-content': 'Contenu mixte bloqué',
  unknown: 'Lecture impossible',
};

function telemetryEngine(engine: PlayerEngine | null | undefined): TelemetryPlayerEngine | null {
  return engine && engine !== 'browser'
    ? engine as TelemetryPlayerEngine
    : null;
}

export default function Player({ channelId, channelName = '' }: PlayerProps) {
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
  const hlsRef = useRef<Hls | null>(null);
  const activeAttemptRef = useRef<ActiveAttempt | null>(null);
  const pendingMobileVlcRef = useRef<PendingMobileVlcOpen | null>(null);
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

  const [externalStreamInfo, setExternalStreamInfo] = React.useState<{
    channelId: string;
    sourceUrl: string;
    mobileLaunchUrl: string | null;
    attemptId: string;
    playbackSessionId: string;
  } | null>(null);
  const activeExternalStream = externalStreamInfo?.channelId === channelId ? externalStreamInfo : null;
  const [copied, setCopied] = React.useState(false);
  const [copyError, setCopyError] = React.useState(false);

  useEffect(() => {
    selectedChannelIdRef.current = channelId;
    pendingMobileVlcRef.current = null;
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
      };
    }

    if (directFile || video.canPlayType('application/vnd.apple.mpegurl')) {
      updateAttemptEngine('native-hls');
      dispatch({ type: 'ENGINE_SELECTED', engine: 'native-hls' });
      let readyDispatched = false;
      const ready = () => {
        if (!readyDispatched && isCurrent()) {
          readyDispatched = true;
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
      };
    }

    failCurrentAttempt({
      category: 'unsupported',
      code: 'HLS_UNSUPPORTED',
      message: 'Ce navigateur ne prend pas en charge la lecture HLS.',
    });
  }, [channelId, failCurrentAttempt, source, state.attemptId, stopStartupTimeout, updateAttemptEngine]);

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
    if (state.phase !== 'ready' || !state.attemptId) return;
    if (autoPlayAttemptIdsRef.current.has(state.attemptId)) return;
    autoPlayAttemptIdsRef.current.add(state.attemptId);
    startPlayback(false);
  }, [startPlayback, state.attemptId, state.phase]);

  const handlePlaying = useCallback(() => {
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
    const attempt = activeAttemptRef.current;
    if (state.phase === 'playing' && attempt && playbackStartedAttemptIdsRef.current.has(attempt.attemptId)) {
      stopStartupTimeout();
      emitForActiveAttempt('paused');
    }
  }, [emitForActiveAttempt, state.phase, stopStartupTimeout]);

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
    if (externalLaunchPendingRef.current) return;
    if (LOCAL_AUTOMATIC_PLAYBACK && externalLaunchRequestedRef.current && !retry) return;
    setCopied(false);
    setCopyError(false);
    if (retry || !launchIdRef.current) launchIdRef.current = crypto.randomUUID();
    externalLaunchRequestedRef.current = true;
    resolutionSequenceRef.current += 1;
    resolutionControllerRef.current?.abort();
    stopStartupTimeout();
    hlsRef.current?.destroy();
    hlsRef.current = null;
    videoRef.current?.pause();
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
        const mobileLaunchUrl = mobilePlatform ? buildMobileVlcUrl(payload.sourceUrl, mobilePlatform) : null;
        pendingMobileVlcRef.current = {
          playbackSessionId: payload.playbackSessionId,
          attemptId: payload.attemptId,
          channelId,
          sourceUrl: payload.sourceUrl,
          launchUrl: mobileLaunchUrl,
        };
        setExternalStreamInfo({
          channelId,
          sourceUrl: payload.sourceUrl,
          mobileLaunchUrl,
          attemptId: payload.attemptId,
          playbackSessionId: payload.playbackSessionId,
        });
        dispatch({ type: 'EXTERNAL_READY' });
      })
      .catch((error: unknown) => {
        pendingMobileVlcRef.current = null;
        setExternalStreamInfo(null);
        dispatch({
          type: 'EXTERNAL_FAILED',
          failure: {
            category: 'unknown',
            code: error instanceof ApiRequestError
              ? error.code ?? 'EXTERNAL_STREAM_UNAVAILABLE'
              : 'EXTERNAL_STREAM_UNAVAILABLE',
            message: messageForApiError(error, 'Impossible de préparer le flux pour lecteur externe.'),
          },
        });
      });
  }, [channelId, emitForActiveAttempt, stopStartupTimeout]);

  const confirmMobileExternalPlayer = useCallback(() => {
    const pending = pendingMobileVlcRef.current;
    if (!pending || pending.channelId !== selectedChannelIdRef.current || !pending.launchUrl) return;

    const previous = activeAttemptRef.current;
    if (previous) {
      telemetryRef.current?.emit(previous, 'stopped', {
        playerEngine: telemetryEngine(previous.engine),
        sessionEnded: true,
      });
    }
    const attempt: ActiveAttempt = {
      playbackSessionId: pending.playbackSessionId,
      attemptId: pending.attemptId,
      channelId: pending.channelId,
      engine: 'vlc',
      startedAt: performance.now(),
    };
    activeAttemptRef.current = attempt;
    playbackSessionRef.current = {
      id: attempt.playbackSessionId,
      channelId: attempt.channelId,
      attemptId: attempt.attemptId,
    };
    telemetryRef.current?.emit(attempt, 'opened', { playerEngine: 'vlc' });
    dispatch({ type: 'EXTERNAL_OPENED' });
    window.location.assign(pending.launchUrl);
  }, []);

  const handleCopyStreamUrl = useCallback(async () => {
    const url = activeExternalStream?.sourceUrl || pendingMobileVlcRef.current?.sourceUrl;
    if (!url) return;
    const ok = await copyTextToClipboard(url);
    if (ok) {
      setCopied(true);
      setCopyError(false);
      window.setTimeout(() => setCopied(false), 3000);
      const pending = pendingMobileVlcRef.current;
      if (pending && !activeAttemptRef.current) {
        const attempt: ActiveAttempt = {
          playbackSessionId: pending.playbackSessionId,
          attemptId: pending.attemptId,
          channelId: pending.channelId,
          engine: 'vlc',
          startedAt: performance.now(),
        };
        telemetryRef.current?.emit(attempt, 'opened', { playerEngine: 'vlc' });
      }
    } else {
      setCopied(false);
      setCopyError(true);
    }
  }, [activeExternalStream]);

  useEffect(() => {
    if (state.channelId !== channelId) return;
    if (LOCAL_AUTOMATIC_PLAYBACK) {
      if (state.phase === 'external-required') {
        openExternalPlayer();
      } else if (state.phase === 'exhausted' && state.engine !== 'vlc' && state.attemptId && source && state.failure?.category !== 'autoplay') {
        if (automaticDecisionsRef.current.has(state.attemptId)) return;
        automaticDecisionsRef.current.add(state.attemptId);
        if (webAttemptCountRef.current < MAX_AUTOMATIC_WEB_ATTEMPTS) tryAnotherSource();
        else openExternalPlayer();
      }
    } else {
      if (state.phase === 'external-required' && !externalLaunchRequestedRef.current) {
        openExternalPlayer();
      }
    }
  }, [channelId, openExternalPlayer, source, state.attemptId, state.channelId, state.engine, state.failure?.category, state.phase, tryAnotherSource]);

  if (!channelId) {
    return (
      <div className="flex aspect-video h-full flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 text-zinc-400">
        <Tv className="mb-4 h-16 w-16 text-yellow-500/50" />
        <p className="text-lg font-medium text-zinc-200">Aucune chaîne sélectionnée</p>
        <p className="mt-1 text-center text-sm text-zinc-500">Choisissez une chaîne dans la grille pour démarrer la lecture.</p>
      </div>
    );
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
  const mode = externalSuggested || externalReady
    ? (activeExternalStream?.mobileLaunchUrl ? 'VLC mobile' : 'Lecteur externe')
    : state.engine === 'vlc' ? 'VLC'
      : state.engine ? 'Navigateur'
        : source ? 'Préparation' : 'Indisponible';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl"
    >
      <div className="group/player relative flex aspect-video w-full items-center justify-center bg-black">
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/70 text-zinc-200"
            >
              <LoaderCircle className="h-10 w-10 animate-spin text-amber-400" />
              <span className="mt-3 text-sm font-bold">
                {state.phase === 'resolving'
                  ? 'Connexion au direct…'
                  : state.phase === 'external-opening'
                    ? (LOCAL_AUTOMATIC_PLAYBACK ? 'Ouverture de VLC…' : 'Préparation du flux externe…')
                    : 'Mise en mémoire tampon du flux…'}
              </span>
              <span className="mt-1 text-xs text-zinc-400">
                {state.phase === 'loading'
                  ? 'Chargement des segments vidéo…'
                  : 'Veuillez patienter…'}
              </span>
            </motion.div>
          )}

          {waitingForUser && (
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => startPlayback(true)}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/70 text-white transition hover:bg-black/60"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 text-black shadow-lg shadow-amber-500/30">
                <Play className="h-7 w-7 fill-current" />
              </span>
              <span className="mt-4 text-sm font-bold">
                {state.phase === 'awaiting-user' ? 'Touchez pour autoriser la lecture' : 'Lire maintenant'}
              </span>
              {state.failure?.category === 'autoplay' && (
                <span className="mt-2 max-w-md px-4 text-xs text-zinc-300">Aucun lecteur externe ne sera lancé sans votre choix.</span>
              )}
            </motion.button>
          )}

          {visibleFailure && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/85 p-6 text-center"
            >
              <AlertCircle className="mb-4 h-14 w-14 text-amber-400" />
              <h4 className="text-xl font-bold text-zinc-100">{failureLabels[visibleFailure.category]}</h4>
              <p className="mt-2 max-w-lg text-sm text-zinc-300">{visibleFailure.message}</p>
              {state.attemptId && (
                <button
                  type="button"
                  onClick={state.engine === 'vlc' ? () => openExternalPlayer(true) : tryAnotherSource}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-5 py-3 text-sm font-bold text-zinc-100 transition hover:border-amber-400/60"
                >
                  <RefreshCw className="h-4 w-4" />
                  {state.engine === 'vlc' ? 'Réessayer VLC' : 'Essayer une autre source'}
                </button>
              )}
            </motion.div>
          )}

          {(externalReady || (externalSuggested && activeExternalStream)) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/90 p-4 sm:p-6 text-center overflow-y-auto"
            >
              <span className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/30">
                <ExternalLink className="h-6 w-6 sm:h-7 sm:w-7" />
              </span>
              <h4 className="mt-3 text-lg sm:text-xl font-bold text-zinc-100">
                {activeExternalStream?.mobileLaunchUrl ? 'Ouvrir dans VLC ou lecteur externe' : 'Flux pour lecteur externe (VLC)'}
              </h4>
              <p className="mt-1.5 max-w-lg text-xs sm:text-sm text-zinc-300">
                Ce flux vidéo nécessite un lecteur externe compatible (VLC, application IPTV ou lecteur multimédia).
              </p>

              {activeExternalStream?.sourceUrl && (
                <div className="mt-3 w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900/90 p-3 text-left">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Adresse directe du flux (M3U8)
                  </span>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={activeExternalStream.sourceUrl}
                      className="w-full truncate rounded-lg border border-zinc-700/60 bg-black/60 px-2.5 py-1.5 font-mono text-xs text-amber-200/90 focus:outline-none select-all"
                    />
                    <button
                      type="button"
                      onClick={handleCopyStreamUrl}
                      aria-label="Copier l'adresse du flux"
                      title="Copier l'adresse du flux"
                      className={`inline-flex items-center gap-1.5 shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        copied
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-zinc-800 text-zinc-200 border border-zinc-700 hover:bg-zinc-700 hover:text-white'
                      }`}
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copied ? 'Copié !' : 'Copier'}</span>
                    </button>
                  </div>
                  {copyError && (
                    <p className="mt-2 text-xs text-amber-300" role="status">
                      Copie automatique impossible. Sélectionnez l’adresse ci-dessus puis copiez-la manuellement.
                    </p>
                  )}
                </div>
              )}

              <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2.5">
                {activeExternalStream?.mobileLaunchUrl && (
                  <button
                    type="button"
                    onClick={confirmMobileExternalPlayer}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 px-4 py-2.5 text-xs sm:text-sm font-extrabold text-black shadow-lg shadow-amber-500/25 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Ouvrir dans l’app VLC
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCopyStreamUrl}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-extrabold transition shadow-lg ${
                    copied
                      ? 'bg-emerald-500 text-black shadow-emerald-500/25'
                      : activeExternalStream?.mobileLaunchUrl
                        ? 'border border-zinc-700 bg-zinc-800 text-zinc-100 hover:bg-zinc-700'
                        : 'bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 text-black shadow-amber-500/25 hover:brightness-110'
                  }`}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  <span>{copied ? 'Adresse M3U8 copiée !' : 'Copier l’adresse du flux (M3U8)'}</span>
                </button>
                {state.attemptId && (
                  <button
                    type="button"
                    onClick={tryAnotherSource}
                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-xs sm:text-sm font-bold text-zinc-200 transition hover:border-amber-400/60 hover:text-white"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Autre source web
                  </button>
                )}
              </div>

              <div className="mt-3.5 max-w-md rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-2.5 text-left text-[11px] sm:text-xs text-zinc-400">
                <p className="font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  Comment lire ce flux ?
                </p>
                <ul className="mt-1 space-y-0.5 list-disc list-inside text-zinc-400">
                  <li><strong className="text-zinc-300">Sur PC / Mac :</strong> Dans VLC, ouvrez <em>Média &gt; Ouvrir un flux réseau</em> (Ctrl+N / Cmd+N) et collez l’adresse.</li>
                  <li><strong className="text-zinc-300">Sur Mobile / TV :</strong> Dans votre lecteur (VLC Mobile, IPTV), ouvrez un <em>flux réseau</em> et collez l’adresse.</li>
                </ul>
              </div>
            </motion.div>
          )}

          {externalSuggested && !activeExternalStream && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/85 p-6 text-center"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/30">
                <ExternalLink className="h-8 w-8" />
              </span>
              <h4 className="mt-5 text-xl font-bold text-zinc-100">Lecteur externe requis</h4>
              <p className="mt-2 max-w-lg text-sm leading-6 text-zinc-300">
                Ce flux vidéo nécessite un lecteur externe ou VLC. Cliquez ci-dessous pour préparer le lien direct.
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                {state.attemptId && (
                  <button
                    type="button"
                    onClick={tryAnotherSource}
                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-5 py-3 text-sm font-bold text-zinc-100 transition hover:border-amber-400/60"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Autre source web
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => openExternalPlayer(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 px-5 py-3 text-sm font-extrabold text-black shadow-lg shadow-amber-500/25 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <ExternalLink className="h-4 w-4" />
                  {LOCAL_AUTOMATIC_PLAYBACK ? 'Ouvrir dans VLC' : 'Obtenir le lien direct (M3U8)'}
                </button>
              </div>
            </motion.div>
          )}

          {externalOpened && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/85 p-6 text-center"
            >
              <ExternalLink className="mb-4 h-14 w-14 text-amber-400" />
              <h4 className="text-xl font-bold text-zinc-100">VLC lancé</h4>
              <p className="mt-2 max-w-lg text-sm text-zinc-300">
                Le lien a été transmis à VLC. La disponibilité de la vidéo dépend de la source ; vous pouvez revenir au catalogue.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <video
          ref={videoRef}
          controls
          playsInline
          onPlaying={handlePlaying}
          onTimeUpdate={handleTimeUpdate}
          onPause={handlePause}
          onWaiting={handleWaiting}
          className={`h-full w-full object-contain ${loading || waitingForUser || showError || externalSuggested || externalReady || externalOpened ? 'pointer-events-none' : ''}`}
        />
      </div>

      <div className="flex flex-col gap-4 bg-zinc-950/80 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">En direct</span>
          <h3 className="truncate text-xl font-extrabold tracking-tight text-zinc-100">{displayedChannelName}</h3>
          <p className="mt-2 truncate text-xs text-zinc-400">
            {source ? 'Source sélectionnée' : 'Source indisponible'}
          </p>
          <p className="mt-1 text-xs font-semibold text-zinc-300">Mode effectif : {mode}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <button
            type="button"
            onClick={
              activeExternalStream?.mobileLaunchUrl
                ? confirmMobileExternalPlayer
                : activeExternalStream
                  ? handleCopyStreamUrl
                  : () => openExternalPlayer(true)
            }
            disabled={state.phase === 'external-opening'}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 px-5 py-2.5 text-sm font-extrabold text-black shadow-lg shadow-amber-500/20 transition hover:brightness-110 disabled:opacity-50"
          >
            {state.phase === 'external-opening' ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <ExternalLink className="h-4 w-4" />
            )}
            {copied
              ? 'Copié !'
              : activeExternalStream?.mobileLaunchUrl
                ? 'Ouvrir VLC'
                : activeExternalStream
                  ? 'Copier M3U8'
                  : LOCAL_AUTOMATIC_PLAYBACK
                    ? 'VLC'
                    : 'VLC / M3U8'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
