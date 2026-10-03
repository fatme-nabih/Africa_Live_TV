// Horloge de l'en-tête : heure locale de l'appareil, Dakar en information secondaire.
export const DAKAR_TIME_ZONE = 'Africa/Dakar';

function isValidTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat('fr-FR', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Fuseau détecté sur l'appareil ; Dakar si le navigateur ne le fournit pas. */
export function detectTimeZone(): string {
  try {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return detected && isValidTimeZone(detected) ? detected : DAKAR_TIME_ZONE;
  } catch {
    return DAKAR_TIME_ZONE;
  }
}

/** « 20:37 » en 24 h, sans secondes (minuit = 00:05, jamais 24:05). */
export function formatClockTime(date: Date, timeZone: string): string {
  const zone = isValidTimeZone(timeZone) ? timeZone : DAKAR_TIME_ZONE;
  return new Intl.DateTimeFormat('fr-FR', { timeZone: zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
}

/** Nom de ville du fuseau : « Europe/Paris » → « Paris », « America/Port-au-Prince » → « Port-au-Prince ». */
export function zoneLabel(timeZone: string): string {
  if (!timeZone.includes('/')) return timeZone;
  return timeZone.split('/').pop()!.replaceAll('_', ' ');
}

export type ClockReading = { time: string; zone: string; tooltip: string; isDakar: boolean };

export function buildClock(date: Date, timeZone: string): ClockReading {
  const zone = isValidTimeZone(timeZone) ? timeZone : DAKAR_TIME_ZONE;
  const isDakar = zone === DAKAR_TIME_ZONE;
  return {
    time: formatClockTime(date, zone),
    zone: zoneLabel(zone),
    isDakar,
    tooltip: isDakar ? 'Heure de Dakar' : `Dakar : ${formatClockTime(date, DAKAR_TIME_ZONE)} (GMT)`,
  };
}
