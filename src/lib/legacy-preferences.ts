import type { PreferenceSnapshot } from './preference-store';

export type LegacyChoices = { countries: string[]; favorites: string[] };
export type LegacyImport = LegacyChoices & {
  status: 'pending' | 'complete' | 'partial';
  remainingCountries: string[];
  remainingFavorites: string[];
};

/** Compare with server-confirmed choices, never with an optimistic local intention. */
export function missingLegacyChoices(legacy: LegacyChoices, state: PreferenceSnapshot): LegacyChoices {
  return {
    countries: legacy.countries.filter(code => !state.countries.includes(code)),
    favorites: legacy.favorites.filter(id => !state.favorites.includes(id)),
  };
}

export function legacyChoicesReady(legacy: LegacyChoices, state: PreferenceSnapshot) {
  return (!legacy.countries.length || state.loaded.countries) && (!legacy.favorites.length || state.loaded.favorites);
}

/** An import ends only after its intentions have been answered by the current account. */
export function settleLegacyImport(state: PreferenceSnapshot): PreferenceSnapshot {
  const imported = state.legacyImport;
  if (!imported || imported.status === 'complete' || !legacyChoicesReady(imported, state)) return state;
  if (imported.countries.some(code => Object.hasOwn(state.countryIntents,code)) || imported.favorites.some(id => Object.hasOwn(state.favoriteIntents,id))) {
    return imported.status === 'partial' ? { ...state, legacyImport: { ...imported,status: 'pending' } } : state;
  }
  if ((imported.countries.length && state.errors.countries) || (imported.favorites.length && state.errors.favorites)) return state;
  const remaining = missingLegacyChoices(imported, state);
  const complete = !remaining.countries.length && !remaining.favorites.length;
  return {
    ...state,
    legacyHandled: complete,
    legacyImport: { ...imported, status: complete ? 'complete' : 'partial', remainingCountries: remaining.countries, remainingFavorites: remaining.favorites },
  };
}

export function rejectedFavoritesMessage(count: number) {
  return count === 1
    ? 'Une chaîne n’a pas pu être ajoutée aux favoris. Son choix est conservé pour réessayer.'
    : `${count} chaînes n’ont pas pu être ajoutées aux favoris. Leurs choix sont conservés pour réessayer.`;
}
