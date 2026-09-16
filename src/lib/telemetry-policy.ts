export const TELEMETRY_SCHEMA_VERSION = 1 as const;
export const TELEMETRY_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1_000;
export const TELEMETRY_MAX_FUTURE_MS = 5 * 60 * 1_000;
export const PLAYBACK_SESSION_TTL_MS = 6 * 60 * 60 * 1_000;

export type TelemetryTimestampError = 'EVENT_TOO_OLD' | 'EVENT_IN_FUTURE' | null;

export function validateTelemetryTimestamp(
  value: string | Date,
  now = new Date(),
): TelemetryTimestampError {
  const timestamp = new Date(value).getTime();
  const reference = now.getTime();
  if (timestamp < reference - TELEMETRY_MAX_AGE_MS) return 'EVENT_TOO_OLD';
  if (timestamp > reference + TELEMETRY_MAX_FUTURE_MS) return 'EVENT_IN_FUTURE';
  return null;
}

const requestIdPattern = /^[A-Za-z0-9._:-]{1,100}$/;

export function validRequestId(value: string | null) {
  return value && requestIdPattern.test(value) ? value : null;
}
