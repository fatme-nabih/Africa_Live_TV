import type { Channel } from '@/types/channel';

function rank(channel: Channel): number {
  if (channel.availabilityStatus === 'OFFLINE') return 4;
  const browser = channel.playbackMode === 'BROWSER';
  const ready = channel.availabilityStatus === 'READY';
  if (browser && ready) return 0;
  if (browser) return 1;
  if (ready) return 2;
  return 3;
}

/**
 * Chaîne à lancer pour « Regarder le direct du pays » : d'abord une chaîne qui se lit dans le navigateur
 * et dont la lecture est prête, jamais une chaîne hors ligne tant qu'une autre existe.
 * À rang égal, l'ordre du catalogue est conservé.
 */
export function pickLiveChannel(channels: readonly Channel[]): Channel | null {
  let best: Channel | null = null;
  let bestRank = Infinity;
  for (const channel of channels) {
    const current = rank(channel);
    if (current < bestRank) {
      best = channel;
      bestRank = current;
    }
  }
  return best;
}
