import { localJsonStorage } from './safe-storage';
import { AFRICAN_COUNTRIES } from './radar-countries';
import { mergeFavoriteIntents, type FavoriteIntent } from './favorite-sync';
import { legacyChoicesReady, missingLegacyChoices, settleLegacyImport, type LegacyImport } from './legacy-preferences';
const codes = new Set(AFRICAN_COUNTRIES.map(country => country.code));
export type PreferenceOperation = 'countries'|'favorites';
export type PreferenceSnapshot = {
  countries: string[]; countryVersion: string|null; countryIntents: Record<string,FavoriteIntent>;
  primary: { code: string; revision: string }|null; favorites: string[]; favoriteIntents: Record<string,FavoriteIntent>;
  cooldown: Record<PreferenceOperation,number>; errors: Record<PreferenceOperation,string|null>;
  persisted: boolean; legacyHandled: boolean;
  loaded: Record<PreferenceOperation, boolean>;
  legacyImport: LegacyImport|null;
  rejectedFavorites: string[];
  favoriteRevision: number;
};
export const EMPTY_PREFERENCES: PreferenceSnapshot = { countries: [], countryVersion: null, countryIntents: {}, primary: null, favorites: [], favoriteIntents: {}, cooldown: { countries: 0, favorites: 0 }, errors: { countries: null, favorites: null }, persisted: true, legacyHandled: false, loaded: { countries: false, favorites: false }, legacyImport: null, rejectedFavorites: [], favoriteRevision: 0 };
export type PreferenceStore = { owner: string; key: string; snapshot: PreferenceSnapshot; listeners: Set<()=>void>; queue: Promise<unknown>; blocked: Set<PreferenceOperation> };
const stores = new Map<string,PreferenceStore>();
export const preferenceStorageKey = (owner: string) => 'al_preferences_v2_' + encodeURIComponent(owner);
const validId = (id: string) => id.trim().length > 0 && id.length <= 200 && !['__proto__','prototype','constructor'].includes(id);
function strings(value: unknown, validate: (value: string) => boolean) { return Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === 'string' && validate(item)))] : []; }
function intents(value: unknown, validate: (value: string) => boolean) {
  const result: Record<string,FavoriteIntent> = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return result;
  for (const [id, intent] of Object.entries(value)) {
    if (!validate(id) || !intent || typeof intent !== 'object' || !('desired' in intent) || typeof intent.desired !== 'boolean' || !('revision' in intent) || typeof intent.revision !== 'string') continue;
    result[id] = { desired: intent.desired, revision: intent.revision };
  }
  return result;
}
function decode(value: unknown, owner: string): PreferenceSnapshot|null {
  if (!value || typeof value !== 'object' || !('owner' in value) || value.owner !== owner || !('data' in value) || !value.data || typeof value.data !== 'object') return null;
  const raw = value.data as Record<string, unknown>;
  const primary = raw.primary as { code?: unknown; revision?: unknown }|null;
  const cooldown = raw.cooldown as Record<string, unknown>|undefined;
  const imported = raw.legacyImport as Partial<LegacyImport>|null;
  const legacyImport: LegacyImport|null = imported && ['pending','complete','partial'].includes(imported.status ?? '') ? {
    status: imported.status as LegacyImport['status'], countries: strings(imported.countries, code => codes.has(code)).slice(0,5), favorites: strings(imported.favorites, validId),
    remainingCountries: strings(imported.remainingCountries, code => codes.has(code)).slice(0,5), remainingFavorites: strings(imported.remainingFavorites, validId),
  } : null;
  return { ...EMPTY_PREFERENCES, countries: strings(raw.countries, code => codes.has(code)).slice(0,5), countryVersion: typeof raw.countryVersion === 'string' ? raw.countryVersion : null, countryIntents: intents(raw.countryIntents, code => codes.has(code)), favorites: strings(raw.favorites, validId), favoriteIntents: intents(raw.favoriteIntents, validId), primary: primary && typeof primary.code === 'string' && codes.has(primary.code) && typeof primary.revision === 'string' ? { code: primary.code, revision: primary.revision } : null, cooldown: { countries: typeof cooldown?.countries === 'number' && Number.isFinite(cooldown.countries) ? cooldown.countries : 0, favorites: typeof cooldown?.favorites === 'number' && Number.isFinite(cooldown.favorites) ? cooldown.favorites : 0 }, legacyHandled: raw.legacyHandled === true, legacyImport, rejectedFavorites: strings(raw.rejectedFavorites,validId) };
}
export function preferenceStore(owner: string): PreferenceStore {
  const existing = stores.get(owner); if (existing) return existing;
  const key = preferenceStorageKey(owner);
  const raw = localJsonStorage.read(key);
  if (raw.value !== null) {
    let known = false;
    try { known = decode(JSON.parse(raw.value),owner) !== null; } catch { /* preserve malformed payload too */ }
    if (!known) localJsonStorage.write('al_preferences_unowned_' + crypto.randomUUID(),raw.value);
  }
  const loaded = localJsonStorage.readJson(key, value => decode(value, owner), EMPTY_PREFERENCES);
  const store: PreferenceStore = { owner, key, snapshot: { ...loaded.value, persisted: loaded.persisted }, listeners: new Set(), queue: Promise.resolve(), blocked: new Set() };
  stores.set(owner,store); return store;
}
export function updatePreferences(store: PreferenceStore, update: (state: PreferenceSnapshot) => PreferenceSnapshot) {
  const next = settleLegacyImport(update(store.snapshot));
  const favoritesChanged = JSON.stringify(displayFavorites(next)) !== JSON.stringify(displayFavorites(store.snapshot)) || JSON.stringify(next.favorites) !== JSON.stringify(store.snapshot.favorites);
  next.favoriteRevision = store.snapshot.favoriteRevision + (favoritesChanged ? 1 : 0);
  next.persisted = localJsonStorage.writeJson(store.key, { owner: store.owner, data: next });
  next.errors = Object.fromEntries(Object.entries(next.errors).map(([operation,error]) => [operation,error?.replace(/Le choix reste conservé (?:sur cet appareil|pour cette page)\./, next.persisted ? 'Le choix reste conservé sur cet appareil.' : 'Le choix reste conservé pour cette page.') ?? null])) as PreferenceSnapshot['errors'];
  store.snapshot = next; for (const listener of store.listeners) listener();
}
export function reloadPreferences(store: PreferenceStore) {
  const loaded = localJsonStorage.readJson(store.key, value => decode(value,store.owner), store.snapshot);
  if (!loaded.persisted) return; // Failed writes retain their real in-memory intentions.
  store.snapshot = { ...loaded.value, loaded: store.snapshot.loaded, errors: store.snapshot.errors, favoriteRevision: store.snapshot.favoriteRevision + (JSON.stringify(displayFavorites(loaded.value)) === JSON.stringify(displayFavorites(store.snapshot)) ? 0 : 1) }; for (const listener of store.listeners) listener();
}
export function displayCountries(state: PreferenceSnapshot) {
  const countries = mergeFavoriteIntents(state.countries,state.countryIntents);
  const primary = state.primary?.code;
  return primary && countries.includes(primary) ? [primary,...countries.filter(code => code !== primary)] : countries;
}
export const displayFavorites = (state: PreferenceSnapshot) => mergeFavoriteIntents(state.favorites,state.favoriteIntents);
export function chooseCountries(owner: string|null, requested: readonly string[]) {
  if (!owner) return;
  const store = preferenceStore(owner), before = displayCountries(store.snapshot);
  const list = [...new Set(requested)].filter(code => codes.has(code));
  if (list.length > 5) return;
  const pending = { ...store.snapshot.countryIntents };
  for (const code of new Set([...before,...list])) if (before.includes(code) !== list.includes(code)) pending[code] = { desired: list.includes(code), revision: crypto.randomUUID() };
  updatePreferences(store, state => ({ ...state, countryIntents: pending, primary: list[0] && list[0] !== before[0] ? { code: list[0], revision: crypto.randomUUID() } : state.primary, errors: { ...state.errors, countries: null } }));
}
export function toggleFavoriteIntent(owner: string|null, id: string) {
  if (!owner) return;
  const store = preferenceStore(owner);
  if (!validId(id)) { updatePreferences(store,state => ({ ...state, errors: { ...state.errors, favorites: 'Cet identifiant de favori est invalide.' } })); return; }
  const desired = !displayFavorites(store.snapshot).includes(id);
  updatePreferences(store,state => ({ ...state, favoriteIntents: { ...state.favoriteIntents, [id]: { desired, revision: crypto.randomUUID() } }, rejectedFavorites: state.rejectedFavorites.filter(rejected => rejected !== id), errors: { ...state.errors, favorites: null } }));
}
export function serializePreferences<T>(store: PreferenceStore, action: () => Promise<T>) {
  const next = store.queue.catch(() => {}).then(action); store.queue = next.catch(() => {}); return next;
}
export function legacyChoices() {
  const countries = strings(localJsonStorage.readJson('al_followed_countries', value => value, []).value, code => codes.has(code)).slice(0,5);
  const favorites = [...new Set(['al_favorites','iptv_favorites'].flatMap(key => strings(localJsonStorage.readJson(key, value => value, []).value, validId)))];
  const selected = new Set(favorites);
  for (const key of ['iptv_favorites_pending','al_favorites_pending']) {
    const pending = localJsonStorage.readJson(key,value => value,{}).value;
    if (pending && typeof pending === 'object' && !Array.isArray(pending)) for (const [id,desired] of Object.entries(pending)) if (validId(id) && typeof desired === 'boolean') { if (desired) selected.add(id); else selected.delete(id); }
  }
  return { countries, favorites: [...selected] };
}
export function importLegacyChoices(owner: string) {
  const legacy = legacyChoices(), store = preferenceStore(owner);
  if (!legacyChoicesReady(legacy,store.snapshot) || store.snapshot.legacyImport?.status === 'pending') return;
  const missing = missingLegacyChoices(legacy,store.snapshot);
  const merged = [...new Set([...displayCountries(store.snapshot), ...missing.countries])].slice(0,5);
  chooseCountries(owner, merged);
  updatePreferences(store,state => ({ ...state,
    favoriteIntents: { ...state.favoriteIntents, ...Object.fromEntries(missing.favorites.map(id => [id, { desired: true, revision: crypto.randomUUID() }])) },
    rejectedFavorites: state.rejectedFavorites.filter(id => !missing.favorites.includes(id)), errors: { ...state.errors, favorites: null }, legacyHandled: false,
    legacyImport: { ...missing, status: 'pending', remainingCountries: [], remainingFavorites: [] },
  }));
}

export function retryRejectedFavorites(store: PreferenceStore) {
  if (!store.snapshot.rejectedFavorites.length) return;
  updatePreferences(store,state => ({ ...state, favoriteIntents: {
    ...state.favoriteIntents,
    ...Object.fromEntries(state.rejectedFavorites.filter(id => !state.favorites.includes(id)).map(id => [id,{ desired: true, revision: crypto.randomUUID() }])),
  }, rejectedFavorites: [], errors: { ...state.errors, favorites: null } }));
}
