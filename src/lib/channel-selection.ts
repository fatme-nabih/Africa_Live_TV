import { channels, streams } from '@/db/schema';
import type {
  ChannelAvailabilityStatus,
  PlaybackMode,
} from '@/types/channel';

export type ChannelRecord = typeof channels.$inferSelect;
export type StreamRecord = typeof streams.$inferSelect;

export type EnrichedChannel = ChannelRecord & {
  playbackMode: PlaybackMode;
  streams: StreamRecord[];
};

function getStreamPriority(directEligibility: string) {
  switch (directEligibility) {
    case 'PUBLIC_DIRECT_WEB':
      return 0;
    case 'PUBLIC_DIRECT_VLC':
      return 1;
    case 'REVIEW_REQUIRED':
      return 2;
    case 'OFFLINE':
    default:
      return 3;
  }
}

function scoreStream(stream: StreamRecord) {
  let score = 0;

  if (stream.corsAllowed) {
    score += 2;
  }

  if (!stream.mixedContent) {
    score += 1;
  }

  if (typeof stream.httpStatus === 'number') {
    if (stream.httpStatus >= 200 && stream.httpStatus < 300) {
      score += 1;
    }

    if (stream.httpStatus >= 400) {
      score -= 1;
    }
  }

  if (stream.failureReason) {
    score -= 1;
  }

  return score;
}

export function sortStreamsByPriority(streamList: StreamRecord[]) {
  return [...streamList].sort((left, right) => {
    const statusDelta =
      getStreamPriority(left.directEligibility) -
      getStreamPriority(right.directEligibility);
    if (statusDelta !== 0) {
      return statusDelta;
    }

    const scoreDelta = scoreStream(right) - scoreStream(left);
    if (scoreDelta !== 0) {
      return scoreDelta;
    }

    return left.id.localeCompare(right.id);
  });
}

export function resolvePlaybackMode(
  streamList: Array<Pick<StreamRecord, 'directEligibility'>>,
): PlaybackMode {
  if (streamList.some((stream) => stream.directEligibility === 'PUBLIC_DIRECT_WEB')) {
    return 'BROWSER';
  }

  if (streamList.some((stream) => stream.directEligibility === 'PUBLIC_DIRECT_VLC')) {
    return 'EXTERNAL';
  }

  return 'UNVERIFIED';
}

type ChannelAvailabilityInput = Pick<
  StreamRecord,
  | 'status'
  | 'verificationState'
  | 'directEligibility'
  | 'lastSuccessAt'
>;

export function resolveChannelAvailability(
  streamList: ChannelAvailabilityInput[],
  freshnessCutoff: Date,
): ChannelAvailabilityStatus {
  const cutoffMs = freshnessCutoff.getTime();
  const freshDirectStreams = streamList.filter((stream) => {
    const lastSuccessAt = stream.lastSuccessAt
      ? new Date(stream.lastSuccessAt).getTime()
      : Number.NaN;
    return (
      Number.isFinite(lastSuccessAt) &&
      lastSuccessAt >= cutoffMs &&
      (stream.status === 'BROWSER_OK' || stream.status === 'VLC_ONLY') &&
      (
        stream.directEligibility === 'PUBLIC_DIRECT_WEB' ||
        stream.directEligibility === 'PUBLIC_DIRECT_VLC'
      )
    );
  });

  if (
    freshDirectStreams.some(
      (stream) => stream.verificationState === 'HEALTHY',
    )
  ) {
    return 'READY';
  }
  if (
    freshDirectStreams.some(
      (stream) => stream.verificationState === 'TEMPORARY_FAILURE',
    )
  ) {
    return 'TEMPORARY_FAILURE';
  }
  if (
    streamList.some(
      (stream) => stream.directEligibility === 'REVIEW_REQUIRED',
    )
  ) {
    return 'REVIEW_REQUIRED';
  }
  if (
    streamList.some((stream) => stream.directEligibility === 'OFFLINE')
  ) {
    return 'OFFLINE';
  }
  return 'REVIEW_REQUIRED';
}

export function selectBestStream(streamList: StreamRecord[]): StreamRecord | null {
  return sortStreamsByPriority(streamList)[0] ?? null;
}

export function buildEnrichedChannel(
  channel: ChannelRecord,
  channelStreams: StreamRecord[],
): EnrichedChannel {
  const sortedStreams = sortStreamsByPriority(channelStreams);

  return {
    ...channel,
    playbackMode: resolvePlaybackMode(sortedStreams),
    streams: sortedStreams,
  };
}
