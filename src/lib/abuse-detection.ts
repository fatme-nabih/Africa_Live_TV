export const ABUSE_SIGNAL_CODES = [
  'CHANNEL_ENUMERATION',
  'NON_HUMAN_RATE',
  'NETWORK_ROTATION',
] as const;

export type AbuseSignalCode = (typeof ABUSE_SIGNAL_CODES)[number];

export type AbuseObservation = Readonly<{
  occurredAtMs: number;
  channelOrdinal?: number | null;
  /**
   * Opaque, one-way fingerprint produced outside this module.
   * Callers must never pass an IP address directly.
   */
  networkFingerprint: string;
}>;

export type AbuseDetectionThresholds = Readonly<{
  retentionWindowMs: number;
  maxRetainedObservations: number;
  sequentialWindowMs: number;
  sequentialMinimumRun: number;
  rapidWindowMs: number;
  rapidMinimumObservations: number;
  rapidMaximumMedianIntervalMs: number;
  networkRotationWindowMs: number;
  networkRotationMinimumObservations: number;
  networkRotationMinimumDistinctFingerprints: number;
}>;

export const DEFAULT_ABUSE_DETECTION_THRESHOLDS: AbuseDetectionThresholds =
  Object.freeze({
    retentionWindowMs: 10 * 60_000,
    maxRetainedObservations: 512,
    sequentialWindowMs: 2 * 60_000,
    sequentialMinimumRun: 10,
    rapidWindowMs: 30_000,
    rapidMinimumObservations: 20,
    rapidMaximumMedianIntervalMs: 750,
    networkRotationWindowMs: 10 * 60_000,
    networkRotationMinimumObservations: 8,
    networkRotationMinimumDistinctFingerprints: 5,
  });

export type AbuseSignal = Readonly<{
  code: AbuseSignalCode;
  observed: number;
  threshold: number;
  windowMs: number;
}>;

export type AbuseDetectionResult = Readonly<{
  decision: 'ALLOW' | 'ALERT_REVIEW';
  requiresHumanReview: boolean;
  signals: readonly AbuseSignal[];
  aggregate: Readonly<{
    evaluatedObservations: number;
    distinctChannels: number;
    distinctNetworks: number;
  }>;
}>;

type IndexedObservation = {
  observation: AbuseObservation;
  inputIndex: number;
};

function assertPositiveInteger(value: number, field: string) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${field} must be a positive safe integer`);
  }
}

function validateThresholds(thresholds: AbuseDetectionThresholds) {
  for (const [field, value] of Object.entries(thresholds)) {
    assertPositiveInteger(value, field);
  }

  if (thresholds.sequentialWindowMs > thresholds.retentionWindowMs) {
    throw new TypeError('sequentialWindowMs cannot exceed retentionWindowMs');
  }
  if (thresholds.rapidWindowMs > thresholds.retentionWindowMs) {
    throw new TypeError('rapidWindowMs cannot exceed retentionWindowMs');
  }
  if (thresholds.networkRotationWindowMs > thresholds.retentionWindowMs) {
    throw new TypeError(
      'networkRotationWindowMs cannot exceed retentionWindowMs',
    );
  }
}

function validObservation(
  observation: AbuseObservation,
  evaluatedAtMs: number,
  oldestAllowedAtMs: number,
) {
  return (
    Number.isSafeInteger(observation.occurredAtMs) &&
    observation.occurredAtMs >= oldestAllowedAtMs &&
    observation.occurredAtMs <= evaluatedAtMs &&
    typeof observation.networkFingerprint === 'string' &&
    observation.networkFingerprint.length > 0 &&
    (observation.channelOrdinal == null ||
      (Number.isSafeInteger(observation.channelOrdinal) &&
        observation.channelOrdinal >= 0))
  );
}

/**
 * Returns the only observation set the detector will inspect. The returned
 * records are chronologically ordered and bounded by both age and count.
 */
export function retainBoundedAbuseObservations(
  observations: readonly AbuseObservation[],
  evaluatedAtMs: number,
  thresholds: AbuseDetectionThresholds =
    DEFAULT_ABUSE_DETECTION_THRESHOLDS,
): readonly AbuseObservation[] {
  assertPositiveInteger(evaluatedAtMs, 'evaluatedAtMs');
  validateThresholds(thresholds);

  const oldestAllowedAtMs = evaluatedAtMs - thresholds.retentionWindowMs;
  const retained: IndexedObservation[] = [];

  for (let inputIndex = 0; inputIndex < observations.length; inputIndex += 1) {
    const observation = observations[inputIndex];
    if (validObservation(observation, evaluatedAtMs, oldestAllowedAtMs)) {
      retained.push({ observation, inputIndex });
    }
  }

  retained.sort(
    (left, right) =>
      left.observation.occurredAtMs - right.observation.occurredAtMs ||
      left.inputIndex - right.inputIndex,
  );

  return retained
    .slice(-thresholds.maxRetainedObservations)
    .map(({ observation }) => observation);
}

function observationsSince(
  observations: readonly AbuseObservation[],
  evaluatedAtMs: number,
  windowMs: number,
) {
  const minimumTimestamp = evaluatedAtMs - windowMs;
  return observations.filter(
    (observation) => observation.occurredAtMs >= minimumTimestamp,
  );
}

function longestSequentialChannelRun(
  observations: readonly AbuseObservation[],
) {
  let longestRun = 0;
  let currentRun = 0;
  let previousOrdinal: number | null = null;
  let direction = 0;

  for (const observation of observations) {
    const ordinal = observation.channelOrdinal;
    if (ordinal == null) {
      currentRun = 0;
      previousOrdinal = null;
      direction = 0;
      continue;
    }

    if (previousOrdinal == null) {
      currentRun = 1;
      longestRun = Math.max(longestRun, currentRun);
      previousOrdinal = ordinal;
      continue;
    }

    const step = ordinal - previousOrdinal;
    const nextDirection = Math.sign(step);
    if (
      Math.abs(step) === 1 &&
      (direction === 0 || direction === nextDirection)
    ) {
      currentRun += 1;
      direction = nextDirection;
    } else {
      currentRun = 1;
      direction = 0;
    }

    longestRun = Math.max(longestRun, currentRun);
    previousOrdinal = ordinal;
  }

  return longestRun;
}

function medianIntervalMs(observations: readonly AbuseObservation[]) {
  const intervals: number[] = [];
  for (let index = 1; index < observations.length; index += 1) {
    intervals.push(
      observations[index].occurredAtMs -
        observations[index - 1].occurredAtMs,
    );
  }

  intervals.sort((left, right) => left - right);
  const middle = Math.floor(intervals.length / 2);
  if (intervals.length % 2 === 0) {
    return (intervals[middle - 1] + intervals[middle]) / 2;
  }
  return intervals[middle];
}

/**
 * Evaluates already pseudonymized observations for one user/session subject.
 * It never returns identifiers and never recommends automatic suspension.
 */
export function detectAbuse(
  observations: readonly AbuseObservation[],
  evaluatedAtMs: number,
  thresholds: AbuseDetectionThresholds =
    DEFAULT_ABUSE_DETECTION_THRESHOLDS,
): AbuseDetectionResult {
  const bounded = retainBoundedAbuseObservations(
    observations,
    evaluatedAtMs,
    thresholds,
  );
  const signals: AbuseSignal[] = [];

  const sequentialObservations = observationsSince(
    bounded,
    evaluatedAtMs,
    thresholds.sequentialWindowMs,
  );
  const sequentialRun = longestSequentialChannelRun(sequentialObservations);
  if (sequentialRun >= thresholds.sequentialMinimumRun) {
    signals.push({
      code: 'CHANNEL_ENUMERATION',
      observed: sequentialRun,
      threshold: thresholds.sequentialMinimumRun,
      windowMs: thresholds.sequentialWindowMs,
    });
  }

  const rapidObservations = observationsSince(
    bounded,
    evaluatedAtMs,
    thresholds.rapidWindowMs,
  );
  if (rapidObservations.length >= thresholds.rapidMinimumObservations) {
    const medianMs = medianIntervalMs(rapidObservations);
    if (medianMs <= thresholds.rapidMaximumMedianIntervalMs) {
      signals.push({
        code: 'NON_HUMAN_RATE',
        observed: medianMs,
        threshold: thresholds.rapidMaximumMedianIntervalMs,
        windowMs: thresholds.rapidWindowMs,
      });
    }
  }

  const rotationObservations = observationsSince(
    bounded,
    evaluatedAtMs,
    thresholds.networkRotationWindowMs,
  );
  const distinctNetworks = new Set(
    rotationObservations.map((observation) => observation.networkFingerprint),
  ).size;
  if (
    rotationObservations.length >=
      thresholds.networkRotationMinimumObservations &&
    distinctNetworks >= thresholds.networkRotationMinimumDistinctFingerprints
  ) {
    signals.push({
      code: 'NETWORK_ROTATION',
      observed: distinctNetworks,
      threshold: thresholds.networkRotationMinimumDistinctFingerprints,
      windowMs: thresholds.networkRotationWindowMs,
    });
  }

  const distinctChannels = new Set(
    bounded.flatMap((observation) =>
      observation.channelOrdinal == null ? [] : [observation.channelOrdinal],
    ),
  ).size;
  const aggregateDistinctNetworks = new Set(
    bounded.map((observation) => observation.networkFingerprint),
  ).size;
  const requiresHumanReview = signals.length > 0;

  return {
    decision: requiresHumanReview ? 'ALERT_REVIEW' : 'ALLOW',
    requiresHumanReview,
    signals,
    aggregate: {
      evaluatedObservations: bounded.length,
      distinctChannels,
      distinctNetworks: aggregateDistinctNetworks,
    },
  };
}
