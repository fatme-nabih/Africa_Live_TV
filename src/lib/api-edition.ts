import { BadRequestError } from './api-errors';
import { enabledEditions, isEdition, type Edition } from './editions';

/** Les anciens onglets restent en français ; le contrôle intervient après l'autorisation et le quota. */
export function apiEdition(url: URL, enabled: readonly Edition[] = enabledEditions()): Edition {
  const value = url.searchParams.get('edition');
  if (value === null) return 'fr';
  if (!isEdition(value) || !enabled.includes(value)) {
    throw new BadRequestError('Cette édition est indisponible.', 'EDITION_UNAVAILABLE', { 'Cache-Control': 'private, no-store' });
  }
  return value;
}
