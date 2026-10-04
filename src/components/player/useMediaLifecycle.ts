'use client';
import {useEffect,type RefObject,type Dispatch} from 'react';
import Hls from 'hls.js';
import {classifyHlsFailure,nextMediaRecoveryAction,nextNetworkRecoveryAction} from '@/lib/playback-errors';
import type {PlaybackEvent,PlaybackFailure} from '@/lib/playback-machine';
import type {PlayerEngine} from '@/lib/playback-events-client';
import {isLocalPlaybackMode} from '@/lib/local-playback-mode';
const LOCAL_AUTOMATIC_PLAYBACK=isLocalPlaybackMode();
type Options={anchored:boolean;channelId:string;source:{url:string}|null;attemptId:string|null;
 videoRef:RefObject<HTMLVideoElement|null>;hlsRef:RefObject<Hls|null>;
 activeAttemptRef:RefObject<{attemptId:string}|null>;selectedChannelIdRef:RefObject<string>;
 startupTimeoutRef:RefObject<number|null>;networkRecoveryCountRef:RefObject<number>;mediaRecoveryCountRef:RefObject<number>;
 stopStartupTimeout:()=>void;failCurrentAttempt:(failure:PlaybackFailure,engine?:PlayerEngine)=>void;
 updateAttemptEngine:(engine:PlayerEngine)=>void;dispatch:Dispatch<PlaybackEvent>;
};
export function useMediaLifecycle({anchored,channelId,source,attemptId,videoRef,hlsRef,activeAttemptRef,selectedChannelIdRef,
 startupTimeoutRef,networkRecoveryCountRef,mediaRecoveryCountRef,stopStartupTimeout,failCurrentAttempt,updateAttemptEngine,dispatch}:Options){
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !source || !attemptId) return;

    hlsRef.current?.destroy();
    hlsRef.current = null;
    stopStartupTimeout();
    video.pause();
    video.removeAttribute('src');
    video.load();

    const playbackUrl = source.url;
    const currentAttemptId = attemptId;
    const isCurrent = () => activeAttemptRef.current?.attemptId === currentAttemptId && selectedChannelIdRef.current === channelId;
    const directFile = /\.(mp4|m4v|webm|og[gv])$/i.test(new URL(playbackUrl).pathname);
    if (LOCAL_AUTOMATIC_PLAYBACK) {
      startupTimeoutRef.current = window.setTimeout(() => {
        if (isCurrent()) failCurrentAttempt({ category: 'network', code: 'MANIFEST_START_TIMEOUT', message: 'Le flux ne répond pas dans le délai attendu.' });
      }, 12_000);
    }

    if (!directFile && Hls.isSupported()) {
      updateAttemptEngine('hls.js');
      dispatch({ type: 'ENGINE_SELECTED', engine: 'hls.js' });
      const hls = new Hls({
        autoStartLoad: false,
        // Le contrôleur d'interstitiels de hls.js relance startLoad() après le manifeste et contourne autoStartLoad:false ;
        // les flux IPTV n'en utilisent pas, et sans lui aucun segment n'est téléchargé avant « Lire maintenant ».
        enableInterstitialPlayback: false,
        maxBufferLength: 30,
        liveSyncDurationCount: 3,
        backBufferLength: 30,
        enableWorker: true,
        lowLatencyMode: false,
      });
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (!isCurrent()) return;
        if (anchored) stopStartupTimeout();
        dispatch({ type: 'STREAM_READY', engine: 'hls.js' });
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal || !isCurrent()) return;
        const httpStatus = data.response?.code ?? null;
        const failure = classifyHlsFailure({
          type: data.type,
          details: data.details,
          httpStatus,
          corsAllowed: true,
        });

        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          if (nextNetworkRecoveryAction(networkRecoveryCountRef.current) === 'retry') {
            networkRecoveryCountRef.current += 1;
            hls.startLoad();
            return;
          }
        }

        if (data.type === Hls.ErrorTypes.MEDIA_ERROR && failure.category === 'media') {
          const action = nextMediaRecoveryAction(mediaRecoveryCountRef.current);
          if (action !== 'fail') {
            mediaRecoveryCountRef.current += 1;
            dispatch({ type: 'MEDIA_RECOVERING' });
            if (action === 'swap-and-recover') hls.swapAudioCodec();
            hls.recoverMediaError();
            if (LOCAL_AUTOMATIC_PLAYBACK) {
              stopStartupTimeout();
              startupTimeoutRef.current = window.setTimeout(() => {
                if (isCurrent()) failCurrentAttempt({ category: 'media', code: 'MEDIA_RECOVERY_TIMEOUT', message: 'Le lecteur ne parvient pas à reprendre le flux.' });
              }, 12_000);
            }
            return;
          }
        }
        failCurrentAttempt(failure, 'hls.js');
      });

      const handleVideoError = () => {
        if (!isCurrent()) return;
        failCurrentAttempt(
          {
            category: 'media',
            code: 'VIDEO_ELEMENT_ERROR',
            message: 'L’élément vidéo a interrompu la lecture.',
          },
          'hls.js',
        );
      };
      video.addEventListener('error', handleVideoError);
      hls.loadSource(playbackUrl);
      hls.attachMedia(video);

      return () => {
        stopStartupTimeout();
        video.removeEventListener('error', handleVideoError);
        hls.destroy();
        if (hlsRef.current === hls) hlsRef.current = null;
        video.pause();
        video.removeAttribute('src');
        video.load();
      };
    }

    if (directFile || video.canPlayType('application/vnd.apple.mpegurl')) {
      updateAttemptEngine('native-hls');
      dispatch({ type: 'ENGINE_SELECTED', engine: 'native-hls' });
      let readyDispatched = false;
      const ready = () => {
        if (!readyDispatched && isCurrent()) {
          readyDispatched = true;
          if (anchored) stopStartupTimeout();
          dispatch({ type: 'STREAM_READY', engine: 'native-hls' });
        }
      };
      const failed = () => {
        if (!isCurrent()) return;
        const code = video.error?.code;
        failCurrentAttempt(
          code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
            ? {
                category: 'codec',
                code: 'NATIVE_CODEC_UNSUPPORTED',
                message: 'Le navigateur ne prend pas en charge le codec de ce flux.',
              }
            : {
                category: code === MediaError.MEDIA_ERR_NETWORK ? 'network' : 'media',
                code: 'NATIVE_HLS_ERROR',
                message: 'La lecture HLS native a échoué.',
              },
          'native-hls',
        );
      };
      video.addEventListener('loadedmetadata', ready);
      video.addEventListener('canplay', ready);
      video.addEventListener('error', failed);
      video.src = playbackUrl;
      video.load();
      return () => {
        stopStartupTimeout();
        video.removeEventListener('loadedmetadata', ready);
        video.removeEventListener('canplay', ready);
        video.removeEventListener('error', failed);
        video.pause();
        video.removeAttribute('src');
        video.load();
      };
    }

    failCurrentAttempt({
      category: 'unsupported',
      code: 'HLS_UNSUPPORTED',
      message: 'Ce navigateur ne prend pas en charge la lecture HLS.',
    });
  }, [anchored, channelId, failCurrentAttempt, source, attemptId, stopStartupTimeout, updateAttemptEngine,
    videoRef,hlsRef,activeAttemptRef,selectedChannelIdRef,startupTimeoutRef,networkRecoveryCountRef,mediaRecoveryCountRef,dispatch]);

}
