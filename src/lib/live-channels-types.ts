import type { Channel } from '@/types/channel';

export interface CountryChannelCount {
  countryCode: string;
  channelCount: number;
  directWebCount: number;
  directVlcCount?: number;
}

export interface LiveChannelsSummarySnapshot {
  updatedAt: string;
  countries: Record<string, CountryChannelCount>;
  totalChannels: number;
  totalDirectWeb: number;
  totalDirectVlc?: number;
  stale?: boolean;
}

export interface LiveCountryChannelsSnapshot {
  countryCode: string;
  countryName: string;
  channels: Channel[];
  total: number;
  canPlay: boolean;
}
