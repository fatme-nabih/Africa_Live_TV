// Repli de logo : aucune tuile n'est vide. Initiales + teinte tirée du pays, avec les couleurs de la marque.

/** Une ou deux initiales : « Radio Télévision Sénégalaise » → « RT », « &TV International » → « TI », « 2STV » → « 2S ». */
export function channelInitials(name: string): string {
  const words = name
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .split(/[\s\-_/.]+/)
    .map(word => word.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(Boolean);
  if (words.length === 0) return 'TV';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export const FALLBACK_TONES = [
  'from-al-green/30 via-surface-2 to-surface-1',
  'from-al-gold/30 via-surface-2 to-surface-1',
  'from-al-red/25 via-surface-2 to-surface-1',
  'from-al-yellow/20 via-surface-2 to-surface-1',
] as const;

/** Teinte stable par pays (mêmes chaînes du même pays = même ambiance) ; sans pays, un fond neutre. */
export function fallbackTone(countryCode: string | null | undefined): string {
  if (!countryCode) return 'from-surface-3 via-surface-2 to-surface-1';
  let hash = 0;
  for (const letter of countryCode.toUpperCase()) hash = (hash * 31 + letter.charCodeAt(0)) % 997;
  return FALLBACK_TONES[hash % FALLBACK_TONES.length];
}
