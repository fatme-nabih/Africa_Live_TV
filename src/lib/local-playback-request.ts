import { isLocalDevMode, isLocalDevRequest } from './local-dev';
import { isLocalPlaybackMode } from './local-playback-mode';
export function usesLocalPlaybackPolicy(request?:Request) {
  return (process.env.DEPLOYMENT_ENV ?? (process.env.NODE_ENV==='production'?'production':'local'))==='local' && process.env.NODE_ENV!=='production' &&
    (isLocalDevMode()||isLocalPlaybackMode()) && !!request && isLocalDevRequest(request);
}
