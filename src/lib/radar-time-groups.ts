/**
 * Séparateurs horaires du fil des dépêches (lot R2) : le fil se lit comme une dépêche d'agence,
 * « Dernière heure », puis « Il y a 1 à 3 h », « Plus tôt aujourd'hui » et « Hier ».
 * Le jour calendaire est celui du fuseau du lecteur ; `now` vaut 0 avant l'hydratation : aucun groupe n'est alors calculé.
 */
export type RadarTimeGroup = 'hour' | 'recent' | 'today' | 'yesterday' | 'older';

export const RADAR_TIME_GROUP_LABELS: Record<RadarTimeGroup, string> = {
  hour: 'Dernière heure',
  recent: 'Il y a 1 à 3 h',
  today: 'Plus tôt aujourd’hui',
  yesterday: 'Hier',
  older: 'Plus ancien',
};

const HOUR = 3_600_000;

function startOfDay(time: number) {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** Groupe d'une dépêche, ou `null` si sa date ou l'horloge sont inconnues. */
export function radarTimeGroup(iso: string | null | undefined, now: number): RadarTimeGroup | null {
  const time = Date.parse(iso ?? '');
  if (!Number.isFinite(time) || !Number.isFinite(now) || now <= 0) return null;
  const age = Math.max(0, now - time);
  if (age < HOUR) return 'hour';
  if (age < 3 * HOUR) return 'recent';
  const today = startOfDay(now);
  if (time >= today) return 'today';
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  return time >= yesterday.getTime() ? 'yesterday' : 'older';
}

/**
 * Découpe une liste déjà triée (plus récente d'abord) en sections consécutives.
 * Sans horloge, une seule section sans titre : le premier rendu serveur reste identique au client.
 */
export function groupByTime<T>(items: T[], dateOf: (item: T) => string | null | undefined, now: number) {
  const sections: { group: RadarTimeGroup | null; items: T[] }[] = [];
  for (const item of items) {
    const group = radarTimeGroup(dateOf(item), now);
    const last = sections.at(-1);
    if (last && last.group === group) last.items.push(item);
    else sections.push({ group, items: [item] });
  }
  return sections;
}

/** Heure d'une dépêche (« 19:05 ») dans le fuseau du lecteur ; vide avant l'hydratation ou si la date est inconnue. */
export function formatRadarClock(iso: string | null | undefined, now: number): string {
  const time = Date.parse(iso ?? '');
  if (!Number.isFinite(time) || now <= 0) return '';
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(time);
}
