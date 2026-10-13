import { fr } from '@/i18n/fr';
import { format } from '@/i18n/message';
import type { Dictionary } from '@/i18n/dictionary';

/** « il y a 12 min », « il y a 3 h », « hier » : l'âge d'une dépêche en langage courant. Vide si la date est inconnue. */
export function formatAgo(iso: string | null | undefined, now: number, labels: Dictionary['time']['ago'] = fr.time.ago): string {
  const time = Date.parse(iso ?? '');
  if (!Number.isFinite(time) || !Number.isFinite(now) || now <= 0) return '';
  const minutes = Math.floor(Math.max(0, now - time) / 60_000);
  if (minutes < 1) return labels.now;
  if (minutes < 60) return format(labels.minutes, { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return format(labels.hours, { count: hours });
  const days = Math.floor(hours / 24);
  return days === 1 ? labels.yesterday : format(labels.days, { count: days });
}
