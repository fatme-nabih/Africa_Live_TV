import type { PlayerEngine } from './playback-events-client';

export type PlaybackFailureCategory =
  | 'network'
  | 'cors'
  | 'codec'
  | 'geoblocked'
  | 'autoplay'
  | 'media'
  | 'unsupported'
  | 'mixed-content'
  | 'unknown';

export type PlaybackFailure = {
  category: PlaybackFailureCategory;
  code: string;
  message: string;
};

export type PlaybackSource = {
  url: string;
};

export type PlaybackPhase =
  | 'idle'
  | 'resolving'
  | 'loading'
  | 'ready'
  | 'playing'
  | 'awaiting-user'
  | 'external-required'
  | 'exhausted'
  | 'external-opening'
  | 'external-ready'
  | 'external-opened';

export type PlaybackState = {
  phase: PlaybackPhase;
  channelId: string | null;
  source: PlaybackSource | null;
  attemptId: string | null;
  engine: PlayerEngine | null;
  failure: PlaybackFailure | null;
  mediaRecoveryCount: number;
};

export type PlaybackEvent =
  | { type: 'SELECT_CHANNEL'; channelId: string | null }
  | { type: 'RESOLVED'; source: PlaybackSource | null; attemptId: string | null }
  | { type: 'RESOLVE_FAILED'; failure: PlaybackFailure }
  | { type: 'ENGINE_SELECTED'; engine: PlayerEngine }
  | { type: 'STREAM_READY'; engine: PlayerEngine }
  | { type: 'PLAY_REQUESTED' }
  | { type: 'PLAYING' }
  | { type: 'AUTOPLAY_BLOCKED'; failure: PlaybackFailure }
  | { type: 'EXTERNAL_REQUIRED' }
  | { type: 'MEDIA_RECOVERING' }
  | { type: 'STREAM_FAILED'; failure: PlaybackFailure }
  | { type: 'EXTERNAL_REQUESTED'; userInitiated: boolean }
  | { type: 'EXTERNAL_READY' }
  | { type: 'EXTERNAL_OPENED' }
  | { type: 'EXTERNAL_FAILED'; failure: PlaybackFailure };

export const initialPlaybackState: PlaybackState = {
  phase: 'idle',
  channelId: null,
  source: null,
  attemptId: null,
  engine: null,
  failure: null,
  mediaRecoveryCount: 0,
};

function startAttempt(state: PlaybackState, attemptId: string) {
  return {
    ...state,
    phase: 'loading' as const,
    attemptId,
    engine: 'browser' as const,
    failure: null,
    mediaRecoveryCount: 0,
  };
}

export function playbackReducer(state: PlaybackState, event: PlaybackEvent): PlaybackState {
  switch (event.type) {
    case 'SELECT_CHANNEL':
      return event.channelId
        ? { ...initialPlaybackState, phase: 'resolving', channelId: event.channelId }
        : initialPlaybackState;
    case 'RESOLVED':
      if (!event.source || !event.attemptId) {
        return {
          ...state,
          phase: 'exhausted',
          source: null,
          attemptId: null,
          failure: {
            category: 'network',
            code: 'NO_ACTIVE_STREAM',
            message: 'Aucun flux actif n’est disponible pour cette chaîne.',
          },
        };
      }
      return startAttempt({ ...state, source: event.source }, event.attemptId);
    case 'RESOLVE_FAILED':
      return { ...state, phase: 'exhausted', attemptId: null, failure: event.failure };
    case 'ENGINE_SELECTED':
      return { ...state, engine: event.engine };
    case 'STREAM_READY':
      return { ...state, phase: 'ready', engine: event.engine, failure: null };
    case 'PLAY_REQUESTED':
      return { ...state, phase: 'loading', failure: null };
    case 'PLAYING':
      return { ...state, phase: 'playing', failure: null };
    case 'AUTOPLAY_BLOCKED':
      return { ...state, phase: 'awaiting-user', failure: event.failure };
    case 'EXTERNAL_REQUIRED':
      return { ...state, phase: 'external-required', failure: null };
    case 'MEDIA_RECOVERING':
      return {
        ...state,
        phase: 'loading',
        mediaRecoveryCount: state.mediaRecoveryCount + 1,
      };
    case 'STREAM_FAILED':
      return { ...state, phase: 'exhausted', failure: event.failure };
    case 'EXTERNAL_REQUESTED':
      return state.failure?.category === 'autoplay' && !event.userInitiated
        ? state
        : { ...state, phase: 'external-opening', engine: 'vlc' };
    case 'EXTERNAL_READY':
      return { ...state, phase: 'external-ready', engine: 'vlc', failure: null };
    case 'EXTERNAL_OPENED':
      return { ...state, phase: 'external-opened', engine: 'vlc', failure: null };
    case 'EXTERNAL_FAILED':
      return { ...state, phase: 'exhausted', failure: event.failure };
  }
}
