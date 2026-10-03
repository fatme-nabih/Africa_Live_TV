import { channelSchema } from './api-contracts';
import { STORAGE_KEYS } from './storage-keys';
import type { Channel } from '@/types/channel';

// Zapping : la liste de chaînes parmi lesquelles l'utilisateur a choisi, transmise à la fenêtre ou à la page de lecteur.
// Seuls les champs publics du catalogue sont conservés (jamais d'URL de flux).
const MAX_ENTRIES = 60;
const TTL_MS = 6 * 60 * 60 * 1_000;

type StorageRead = Pick<Storage, 'getItem'>;
type StorageWrite = Pick<Storage, 'setItem'>;

function publicFields(channel: Channel): Channel | null {
  const parsed = channelSchema.safeParse({
    id: channel.id,
    name: channel.name,
    logoUrl: channel.logoUrl,
    groupTitle: channel.groupTitle,
    countryCode: channel.countryCode,
    playbackMode: channel.playbackMode,
    availabilityStatus: channel.availabilityStatus,
  });
  return parsed.success ? parsed.data : null;
}

export function saveZapList(list: readonly Channel[], storage: StorageWrite, now = Date.now()) {
  const entries: Channel[] = [];
  for (const channel of list) {
    const entry = publicFields(channel);
    if (entry) entries.push(entry);
    if (entries.length >= MAX_ENTRIES) break;
  }
  try {
    storage.setItem(STORAGE_KEYS.zapList, JSON.stringify({ savedAt: now, entries }));
  } catch {
    // Stockage indisponible : le lecteur s'ouvre sans zapping.
  }
}

export function readZapList(storage: StorageRead, now = Date.now()): Channel[] {
  try {
    const raw = storage.getItem(STORAGE_KEYS.zapList);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return [];
    const { savedAt, entries } = parsed as { savedAt?: unknown; entries?: unknown };
    if (typeof savedAt !== 'number' || now - savedAt > TTL_MS || !Array.isArray(entries)) return [];
    const seen = new Set<string>();
    const result: Channel[] = [];
    for (const entry of entries) {
      const channel = channelSchema.safeParse(entry);
      if (!channel.success || seen.has(channel.data.id)) continue;
      seen.add(channel.data.id);
      result.push(channel.data);
    }
    return result.slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

/** Chaînes voisines dans la liste ; aucune des deux si la chaîne courante n'en fait pas partie. */
export function zapNeighbors<T extends { id: string }>(list: readonly T[], currentId: string): { previous: T | null; next: T | null } {
  const index = list.findIndex(item => item.id === currentId);
  if (index < 0) return { previous: null, next: null };
  return { previous: list[index - 1] ?? null, next: list[index + 1] ?? null };
}
