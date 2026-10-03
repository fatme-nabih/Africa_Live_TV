import { formatCountryName } from './format';
import type { Channel } from '@/types/channel';

/**
 * Noms accessibles uniques dans une liste : deux chaînes de même nom (ex. « 2M Monde » deux fois) se distinguent
 * par leur pays, puis par un numéro. Les noms déjà uniques restent inchangés.
 */
export function uniqueChannelLabels(channels: readonly Pick<Channel, 'id' | 'name' | 'countryCode'>[]): Map<string, string> {
  const byName = new Map<string, Array<(typeof channels)[number]>>();
  for (const channel of channels) {
    const group = byName.get(channel.name) ?? [];
    group.push(channel);
    byName.set(channel.name, group);
  }
  const labels = new Map<string, string>();
  for (const [name, group] of byName) {
    if (group.length === 1) {
      labels.set(group[0].id, name);
      continue;
    }
    const withCountry = group.map(channel => ({ channel, label: `${name}, ${formatCountryName(channel.countryCode, 'International')}` }));
    const counts = new Map<string, number>();
    for (const { label } of withCountry) counts.set(label, (counts.get(label) ?? 0) + 1);
    const seen = new Map<string, number>();
    for (const { channel, label } of withCountry) {
      if (counts.get(label) === 1) {
        labels.set(channel.id, label);
      } else {
        const rank = (seen.get(label) ?? 0) + 1;
        seen.set(label, rank);
        labels.set(channel.id, `${label} n° ${rank}`);
      }
    }
  }
  return labels;
}
