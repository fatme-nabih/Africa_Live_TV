// Les flux sont recontrôlés tous les 15 jours depuis le poste local ; 16 jours laissent une journée de marge.
export const STREAM_FRESHNESS_TTL_DAYS = 16;
export const STREAM_FRESHNESS_TTL_HOURS = STREAM_FRESHNESS_TTL_DAYS * 24;
export const STREAM_FRESHNESS_TTL_MS =
  STREAM_FRESHNESS_TTL_HOURS * 60 * 60 * 1_000;
