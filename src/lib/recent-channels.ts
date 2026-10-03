import { channelSchema } from './api-contracts';
import type { Channel } from '@/types/channel';

// « Reprendre » : les dernières chaînes regardées, gardées sur l'appareil (localStorage), sans compte ni migration.
export const MAX_RECENT_CHANNELS = 10;

function isSafeLogo(channel: Channel) {
  if (!channel.logoUrl) return true;
  try {
    const url = new URL(channel.logoUrl);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Lit la valeur stockée : ignore le bruit, les doublons et toute entrée qui n'est pas une chaîne valide. */
export function parseRecentChannels(raw: string | null, max = MAX_RECENT_CHANNELS): Channel[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const result: Channel[] = [];
    for (const item of parsed) {
      const channel = channelSchema.safeParse(item);
      if (!channel.success || seen.has(channel.data.id) || !isSafeLogo(channel.data)) continue;
      seen.add(channel.data.id);
      result.push(channel.data);
    }
    return result.slice(0, max);
  } catch {
    return [];
  }
}

/** Place la chaîne en tête, sans doublon, borné. Seuls les champs publics du catalogue sont conservés. */
export function pushRecentChannel(recents: readonly Channel[], channel: Channel, max = MAX_RECENT_CHANNELS): Channel[] {
  const entry = channelSchema.parse({
    id: channel.id,
    name: channel.name,
    logoUrl: channel.logoUrl,
    groupTitle: channel.groupTitle,
    countryCode: channel.countryCode,
    playbackMode: channel.playbackMode,
    availabilityStatus: channel.availabilityStatus,
  });
  return [entry, ...recents.filter(item => item.id !== entry.id)].slice(0, max);
}

export function removeRecentChannel(recents: readonly Channel[], id: string): Channel[] {
  return recents.filter(item => item.id !== id);
}
