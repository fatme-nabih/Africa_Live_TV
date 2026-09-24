import type { PlaybackFailure } from './playback-machine';

type HlsFailureInput = {
  type: string;
  details?: string | null;
  httpStatus?: number | null;
  corsAllowed?: boolean;
};

function failure(category: PlaybackFailure['category'], code: string, message: string) {
  return { category, code, message } satisfies PlaybackFailure;
}

export function classifyPlayRejection(error: unknown): PlaybackFailure {
  const name = error instanceof DOMException || error instanceof Error ? error.name : '';
  const message = error instanceof Error ? error.message : 'Lecture refusée par le navigateur.';

  if (name === 'NotAllowedError') {
    return failure(
      'autoplay',
      'AUTOPLAY_BLOCKED',
      'Le navigateur demande une action utilisateur pour démarrer la lecture.',
    );
  }
  if (name === 'NotSupportedError') {
    return failure('codec', 'MEDIA_NOT_SUPPORTED', `Codec ou format non pris en charge : ${message}`);
  }
  if (name === 'SecurityError') {
    return failure('cors', 'MEDIA_SECURITY_ERROR', `Accès au flux refusé : ${message}`);
  }
  return failure('media', 'PLAY_REJECTED', `La lecture a échoué : ${message}`);
}

export function classifyHlsFailure({
  type,
  details = '',
  httpStatus,
  corsAllowed = true,
}: HlsFailureInput): PlaybackFailure {
  const normalizedType = type.toLowerCase();
  const normalizedDetails = (details ?? '').toLowerCase();

  if (httpStatus === 401 || httpStatus === 403 || httpStatus === 451) {
    return failure(
      'geoblocked',
      `HLS_HTTP_${httpStatus}`,
      'Le fournisseur refuse ce flux pour cette zone ou cette autorisation.',
    );
  }
  if (
    normalizedDetails.includes('codec') ||
    normalizedDetails.includes('bufferincompatible') ||
    normalizedDetails.includes('manifestincompatible')
  ) {
    return failure('codec', 'HLS_CODEC_ERROR', 'Le navigateur ne prend pas en charge le codec de ce flux.');
  }
  if (normalizedType.includes('network')) {
    if (!corsAllowed && (!httpStatus || httpStatus === 0)) {
      return failure('cors', 'HLS_CORS_ERROR', 'Le serveur du flux refuse l’accès depuis ce navigateur.');
    }
    return failure('network', 'HLS_NETWORK_ERROR', 'Le flux ne répond pas ou la connexion a été interrompue.');
  }
  if (normalizedType.includes('media')) {
    return failure('media', 'HLS_MEDIA_ERROR', 'Les données média HLS sont invalides ou interrompues.');
  }
  return failure('unknown', 'HLS_FATAL_ERROR', 'Une erreur HLS fatale empêche la lecture.');
}

export type MediaRecoveryAction = 'recover' | 'swap-and-recover' | 'fail';
export type NetworkRecoveryAction = 'retry' | 'fail';

export function nextNetworkRecoveryAction(recoveryCount: number): NetworkRecoveryAction {
  return recoveryCount < 2 ? 'retry' : 'fail';
}

export function nextMediaRecoveryAction(recoveryCount: number): MediaRecoveryAction {
  if (recoveryCount === 0) return 'recover';
  if (recoveryCount === 1) return 'swap-and-recover';
  return 'fail';
}
