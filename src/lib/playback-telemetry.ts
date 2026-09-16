import type {
  PlaybackEventName,
  PlaybackEventPayload,
} from './playback-events-client';

type Attempt = {
  playbackSessionId: string;
  attemptId: string;
  channelId: string;
};

type EventExtras = Omit<
  PlaybackEventPayload,
  'event' | 'playbackSessionId' | 'attemptId' | 'channelId'
>;

export class PlaybackAttemptTelemetry {
  private readonly sent = new Set<string>();

  constructor(private readonly send: (payload: PlaybackEventPayload) => void) {}

  emit(attempt: Attempt, event: PlaybackEventName, extras: EventExtras = {}) {
    const uniqueKey =
      event === 'failed'
        ? `${attempt.attemptId}:failed:${extras.errorCode ?? 'unknown'}`
        : ['opened', 'started', 'stopped'].includes(event)
          ? `${attempt.attemptId}:${event}`
          : null;
    if (uniqueKey && this.sent.has(uniqueKey)) return false;
    if (uniqueKey) this.sent.add(uniqueKey);

    this.send({ ...attempt, event, ...extras });
    return true;
  }
}
