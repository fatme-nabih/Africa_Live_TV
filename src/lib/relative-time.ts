/** « il y a 12 min », « il y a 3 h », « hier » : l'âge d'une dépêche en langage courant. Vide si la date est inconnue. */
export function formatAgo(iso: string | null | undefined, now: number): string {
  const time = Date.parse(iso ?? '');
  if (!Number.isFinite(time) || !Number.isFinite(now) || now <= 0) return '';
  const minutes = Math.floor(Math.max(0, now - time) / 60_000);
  if (minutes < 1) return 'à l’instant';
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'hier' : `il y a ${days} j`;
}
