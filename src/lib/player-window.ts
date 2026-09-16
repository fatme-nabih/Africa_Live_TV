export const PLAYER_WINDOW_NAME = 'africa-live-player';
export const PLAYER_WINDOW_FEATURES = [
  'popup=yes',
  'width=1180',
  'height=720',
  'resizable=yes',
  'scrollbars=yes',
].join(',');

export type PlayerWindowHandle = {
  readonly closed: boolean;
  focus: () => void;
};

type LaunchPlayerOptions = {
  channelId: string;
  userAgent: string;
  platform?: string;
  maxTouchPoints?: number;
  openWindow: (url: string, target: string, features: string) => PlayerWindowHandle | null;
  navigateCurrentTab: (url: string) => void;
};

export type PlayerLaunchResult =
  | { mode: 'separate-window'; handle: PlayerWindowHandle; url: string }
  | { mode: 'same-tab'; url: string }
  | { mode: 'blocked'; url: string };

export function buildPlayerPath(channelId: string) {
  return `/player/${encodeURIComponent(channelId)}`;
}

export function isMobilePlayerDevice(userAgent: string, platform = '', maxTouchPoints = 0) {
  if (/android|iphone|ipad|ipod|mobile/i.test(userAgent)) return true;
  return platform === 'MacIntel' && maxTouchPoints > 1;
}

export function launchPlayer({
  channelId,
  userAgent,
  platform,
  maxTouchPoints,
  openWindow,
  navigateCurrentTab,
}: LaunchPlayerOptions): PlayerLaunchResult {
  const url = buildPlayerPath(channelId);
  if (isMobilePlayerDevice(userAgent, platform, maxTouchPoints)) {
    navigateCurrentTab(url);
    return { mode: 'same-tab', url };
  }

  let handle: PlayerWindowHandle | null;
  try {
    handle = openWindow(url, PLAYER_WINDOW_NAME, PLAYER_WINDOW_FEATURES);
  } catch {
    return { mode: 'blocked', url };
  }
  if (!handle) return { mode: 'blocked', url };
  try {
    handle.focus();
  } catch {
    // Some browsers open the window but prevent scripts from focusing it.
  }
  return { mode: 'separate-window', handle, url };
}
