import type { PlaybackDestination } from './playback-resolution-policy';

export const MAX_AUTOMATIC_WEB_ATTEMPTS = 3;

type LocalSource = {
  url: string;
  status: string;
  corsAllowed: boolean;
};

export function isLocalPlaybackCandidate(source: LocalSource, destination: PlaybackDestination) {
  try {
    const url = new URL(source.url);
    if (destination === 'web') {
      // Historical failures and expired checks are hints, not a local playback gate.
      return ['http:', 'https:'].includes(url.protocol) &&
        !(source.status === 'VLC_ONLY' && !source.corsAllowed);
    }
    return ['http:', 'https:', 'rtsp:', 'rtmp:', 'rtp:', 'udp:'].includes(url.protocol);
  } catch {
    return false;
  }
}
