import { acknowledgeFavoriteIntents } from './favorite-sync';
import { FAVORITE_MUTATION_LIMIT, retryAfterDeadline } from './preference-contracts';
import { displayCountries, serializePreferences, updatePreferences, type PreferenceOperation, type PreferenceStore } from './preference-store';
import { AFRICAN_COUNTRIES } from './radar-countries';
const codes = new Set(AFRICAN_COUNTRIES.map(country => country.code));
class SyncError extends Error {
  constructor(readonly status: number, readonly code: string, readonly retryAfter: string|null) { super('PREFERENCE_SYNC_FAILED'); }
}
function canonical(body: Record<string,unknown>, owner: string, operation: PreferenceOperation) {
  const list = body[operation];
  if (body.owner !== owner || !Array.isArray(list) || list.some(id => typeof id !== 'string' || !id || id.length > 200) ||
    (operation === 'countries' && (list.length > 5 || list.some(code => !codes.has(String(code))) || typeof body.version !== 'string' || !body.version))) throw new SyncError(409,'INVALID_PREFERENCE_RESPONSE',null);
  return [...new Set(list as string[])];
}
export function pendingSignature(store: PreferenceStore, operation: PreferenceOperation) {
  return JSON.stringify(operation === 'favorites' ? store.snapshot.favoriteIntents : [store.snapshot.countryIntents,store.snapshot.primary]);
}
export function hasPending(store: PreferenceStore, operation: PreferenceOperation) {
  return operation === 'favorites' ? Object.keys(store.snapshot.favoriteIntents).length > 0 : Object.keys(store.snapshot.countryIntents).length > 0 || store.snapshot.primary !== null;
}
const activeTasks = new WeakMap<PreferenceStore,Map<PreferenceOperation,{ users: number; task: { retry: () => void; stop: () => void } }>>();
export function startPreferenceSync(store: PreferenceStore, operation: PreferenceOperation) {
  let map = activeTasks.get(store); if (!map) { map = new Map(); activeTasks.set(store,map); }
  let entry = map.get(operation);
  if (!entry) { entry = { users: 0, task: createPreferenceSync(store,operation) }; map.set(operation,entry); }
  entry.users++;
  let stopped = false;
  return { retry: entry.task.retry, stop: () => { if (stopped) return; stopped = true; if (--entry.users === 0) { entry.task.stop(); map.delete(operation); } } };
}
function createPreferenceSync(store: PreferenceStore, operation: PreferenceOperation) {
  let stopped = false, busy = false, retries = 0, quotaAttempts = 0;
  let timer: ReturnType<typeof setTimeout>|undefined;
  const controller = new AbortController();
  let signature = pendingSignature(store,operation);
  const schedule = (delay = 200) => {
    clearTimeout(timer);
    if (!stopped && !store.blocked.has(operation)) timer = setTimeout(() => void synchronize(), Math.min(2_000_000_000, Math.max(delay,store.snapshot.cooldown[operation]-Date.now())));
  };
  async function request(method: string, payload?: unknown) {
    if (stopped) throw new DOMException('stopped','AbortError');
    const scoped = new AbortController(), abort = () => scoped.abort();
    controller.signal.addEventListener('abort',abort,{ once: true });
    const deadline = setTimeout(abort,15_000);
    try {
      const response = await fetch('/api/' + (operation === 'countries' ? 'followed-countries' : 'favorites'), { method, cache: 'no-store', headers: { 'Content-Type': 'application/json', 'X-Preference-Owner': store.owner }, ...(payload ? { body: JSON.stringify(payload) } : {}), signal: scoped.signal });
      if ([401,403,429].includes(response.status)) throw new SyncError(response.status,'',response.headers.get('retry-after'));
      const raw: unknown = await response.json();
      if (stopped) throw new DOMException('stopped','AbortError');
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new SyncError(response.status,'INVALID_PREFERENCE_RESPONSE',response.headers.get('retry-after'));
      const body = raw as Record<string,unknown>;
      if (!response.ok && !(operation === 'countries' && response.status === 409 && body.code === 'PREFERENCE_VERSION_CONFLICT')) throw new SyncError(response.status,typeof body.code === 'string' ? body.code : '',response.headers.get('retry-after'));
      return { body, conflict: response.status === 409 };
    } finally { clearTimeout(deadline); controller.signal.removeEventListener('abort',abort); }
  }
  const accept = (body: Record<string,unknown>) => {
    const list = canonical(body,store.owner,operation);
    updatePreferences(store,state => operation === 'favorites' ? { ...state, favorites: list } : { ...state, countries: list, countryVersion: body.version as string });
  };
  async function synchronize() {
    if (stopped || busy || store.blocked.has(operation)) return;
    if (store.snapshot.cooldown[operation] > Date.now()) { schedule(0); return; }
    busy = true;
    try {
      await serializePreferences(store,async () => {
        if (stopped) return;
        accept((await request('GET')).body);
        let conflicts = 0;
        for (let batch = 0; batch < 20 && !stopped && hasPending(store,operation); batch++) {
          if (operation === 'favorites') {
            const entries = Object.entries(store.snapshot.favoriteIntents);
            const add = entries.filter(([,intent]) => intent.desired).slice(0,FAVORITE_MUTATION_LIMIT).map(([id])=>id);
            const remove = entries.filter(([,intent]) => !intent.desired).slice(0,FAVORITE_MUTATION_LIMIT).map(([id])=>id);
            const sent = Object.fromEntries([...add,...remove].map(id => [id,store.snapshot.favoriteIntents[id]]));
            const reply = await request('PATCH',{ owner: store.owner, add, remove });
            const list = canonical(reply.body,store.owner,operation);
            updatePreferences(store,state => ({ ...state, favorites: list, favoriteIntents: acknowledgeFavoriteIntents(state.favoriteIntents,sent) }));
          } else {
            const sent = { ...store.snapshot.countryIntents }, primary = store.snapshot.primary;
            const countries = displayCountries(store.snapshot);
            if (countries.length > 5) throw new SyncError(400,'COUNTRY_LIMIT',null);
            const reply = await request('PUT',{ owner: store.owner, countries, baseVersion: store.snapshot.countryVersion });
            const list = canonical(reply.body,store.owner,operation);
            if (reply.conflict) { accept(reply.body); if (++conflicts >= 3) throw new SyncError(409,'CONFLICT_BUDGET',null); continue; }
            updatePreferences(store,state => ({ ...state, countries: list, countryVersion: reply.body.version as string, countryIntents: acknowledgeFavoriteIntents(state.countryIntents,sent), primary: state.primary?.revision === primary?.revision ? null : state.primary }));
          }
        }
        if (!stopped) updatePreferences(store,state => ({ ...state, cooldown: { ...state.cooldown, [operation]: 0 }, errors: { ...state.errors, [operation]: null } }));
      });
      retries = 0;
      quotaAttempts = 0;
      if (hasPending(store,operation)) schedule();
    } catch (error) {
      if (stopped) return;
      const failure = error instanceof SyncError ? error : new SyncError(0,'NETWORK',null);
      if ([401,403].includes(failure.status) || ['PREFERENCE_OWNER_CHANGED','INVALID_PREFERENCE_RESPONSE','PREFERENCE_VERSION_REQUIRED'].includes(failure.code)) store.blocked.add(operation);
      const persistence = store.snapshot.persisted ? 'Le choix reste conservé sur cet appareil.' : 'Le choix reste conservé pour cette page.';
      const message = failure.status === 429 ? 'Synchronisation différée par le quota.' : failure.code === 'COUNTRY_LIMIT' ? 'La limite de cinq pays est atteinte. Retirez un pays puis réessayez.' : store.blocked.has(operation) ? 'Reconnectez-vous ou rechargez la page pour synchroniser.' : 'La synchronisation a échoué. Réessayez.';
      updatePreferences(store,state => ({ ...state, errors: { ...state.errors, [operation]: message + ' ' + persistence }, ...(failure.status === 429 ? { cooldown: { ...state.cooldown, [operation]: retryAfterDeadline(failure.retryAfter) } } : {}) }));
      if (failure.status === 429) { if (++quotaAttempts < 3) schedule(250); }
      else if (!store.blocked.has(operation) && failure.status !== 400 && failure.status !== 409 && ++retries <= 3) schedule(1000 * 2 ** (retries-1));
    } finally { busy = false; }
  }
  const changed = () => {
    const next = pendingSignature(store,operation);
    if (signature !== next) { signature = next; if (!busy && hasPending(store,operation)) { retries = 0; schedule(); } }
  };
  const online = () => { retries = 0; schedule(0); };
  store.listeners.add(changed); window.addEventListener('online',online); schedule(0);
  return { retry: online, stop: () => { stopped = true; clearTimeout(timer); controller.abort(); store.listeners.delete(changed); window.removeEventListener('online',online); } };
}
