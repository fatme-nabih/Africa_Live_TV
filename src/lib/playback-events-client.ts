'use client';

import {
  playbackEventRequestSchema,
  type PlaybackEventName,
  type TelemetryPlayerEngine,
} from './api-contracts';

export type { PlaybackEventName, PlayerEngine, TelemetryPlayerEngine } from './api-contracts';

export type PlaybackEventPayload = {
  event: PlaybackEventName;
  playbackSessionId: string;
  attemptId: string;
  channelId: string;
  startupTimeMs?: number | null;
  playerEngine?: TelemetryPlayerEngine | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  sessionEnded?: boolean;
};

function getDevicePlatform() {
  if (typeof navigator === 'undefined') {
    return 'server';
  }

  const userAgent = navigator.userAgent.toLowerCase();
  if (/android/.test(userAgent)) return 'android';
  if (/iphone|ipad|ipod/.test(userAgent)) return 'ios';
  if (/windows/.test(userAgent)) return 'windows';
  if (/mac os|macintosh/.test(userAgent)) return 'macos';
  if (/linux/.test(userAgent)) return 'linux';

  return navigator.platform || 'browser';
}

function getDeviceModel() {
  if (typeof navigator === 'undefined') {
    return null;
  }

  return navigator.platform || null;
}

export function sendPlaybackEvent(payload: PlaybackEventPayload) {
  if (typeof window === 'undefined') {
    return;
  }

  const parsed = playbackEventRequestSchema.safeParse({
    ...payload,
    schemaVersion: 1,
    timestamp: new Date().toISOString(),
    devicePlatform: getDevicePlatform(),
    deviceModel: getDeviceModel(),
  });
  if (!parsed.success) return;
  const body = JSON.stringify(parsed.data);

  fetch('/api/playback-events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: body.length < 60_000,
  }).catch(() => {
    // Telemetry must never affect playback.
  });
}
