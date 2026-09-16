export const STREAM_STATUSES = ['BROWSER_OK', 'VLC_ONLY', 'OFFLINE', 'UNTESTED'] as const;
export const PLAYBACK_MODES = ['BROWSER', 'EXTERNAL', 'UNVERIFIED'] as const;
export const CHANNEL_AVAILABILITY_STATUSES = [
  'READY',
  'TEMPORARY_FAILURE',
  'REVIEW_REQUIRED',
  'OFFLINE',
] as const;

export type StreamStatus = (typeof STREAM_STATUSES)[number];
export type PlaybackMode = (typeof PLAYBACK_MODES)[number];
export type ChannelAvailabilityStatus =
  (typeof CHANNEL_AVAILABILITY_STATUSES)[number];

export interface ChannelFilters {
  search: string;
  country: string;
  group: string;
  language: string;
  status: StreamStatus | '';
}

export interface CatalogChannel {
  id: string;
  name: string;
  logoUrl: string | null;
  groupTitle: string | null;
  countryCode: string | null;
  playbackMode: PlaybackMode;
  availabilityStatus: ChannelAvailabilityStatus;
}

export type Channel = CatalogChannel;
