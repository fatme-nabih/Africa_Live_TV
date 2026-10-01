import { isPlaybackSourceEligible, type PlaybackSourcePolicyInput } from './playback-resolution-policy';
import type { LiveChannelsSummarySnapshot } from './live-channels-types';

export type SummarySourceRow = { channelId: string; countryCode: string | null } & {
  [K in keyof PlaybackSourcePolicyInput]: PlaybackSourcePolicyInput[K] | null
};

export function summarizeChannelCandidates(rows: SummarySourceRow[], now: Date): LiveChannelsSummarySnapshot {
  const counts = new Map<string, { references: Set<string>; web: Set<string>; vlc: Set<string> }>();
  for (const row of rows) {
    if (!row.countryCode) continue;
    const code = row.countryCode.toUpperCase();
    const sets = counts.get(code) ?? { references: new Set<string>(), web: new Set<string>(), vlc: new Set<string>() };
    counts.set(code, sets);
    sets.references.add(row.channelId);
    if (!row.url) continue;
    const source: PlaybackSourcePolicyInput = { url: row.url, status: row.status ?? '', corsAllowed: row.corsAllowed ?? false,
      mixedContent: row.mixedContent ?? true, lastSuccessAt: row.lastSuccessAt, directEligibility: row.directEligibility ?? '', eligibilityReason: row.eligibilityReason ?? '' };
    if (isPlaybackSourceEligible(source, 'web', now)) sets.web.add(row.channelId);
    if (isPlaybackSourceEligible(source, 'vlc-mobile', now)) sets.vlc.add(row.channelId);
  }
  const countries = Object.fromEntries([...counts].map(([code, sets]) => [code, { countryCode: code,
    channelCount: sets.references.size, directWebCount: sets.web.size, directVlcCount: sets.vlc.size }]));
  return { updatedAt: now.toISOString(), countries, totalChannels: [...counts.values()].reduce((n, s) => n + s.references.size, 0),
    totalDirectWeb: [...counts.values()].reduce((n, s) => n + s.web.size, 0), totalDirectVlc: [...counts.values()].reduce((n, s) => n + s.vlc.size, 0) };
}
