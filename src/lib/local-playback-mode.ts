/** Playback on the development workstation, independent of Clerk authentication. */
export function isLocalPlaybackMode() {
  return process.env.NODE_ENV !== 'production' && (
    process.env.NEXT_PUBLIC_LOCAL_PLAYBACK === 'true' ||
    process.env.NEXT_PUBLIC_LOCAL_DEV_MODE === 'true'
  );
}
