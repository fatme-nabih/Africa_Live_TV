import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, ExternalLink, LoaderCircle, Play, RefreshCw } from 'lucide-react';
import type { PlaybackFailure } from '@/lib/playback-machine';

export const failureLabels: Record<PlaybackFailure['category'], string> = {
  network: 'Erreur réseau',
  cors: 'Accès CORS refusé',
  codec: 'Codec incompatible',
  geoblocked: 'Flux géobloqué',
  autoplay: 'Action utilisateur requise',
  media: 'Erreur média',
  unsupported: 'Lecture non prise en charge',
  'mixed-content': 'Contenu mixte bloqué',
  unknown: 'Lecture impossible',
};

export function LoadingOverlay({ loading, waitingForUser }: { loading: boolean; waitingForUser: boolean }) {
  if (!loading) return null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/75"
    >
      <LoaderCircle className="mb-3 h-8 w-8 text-al-gold animate-spin" />
      <span className="text-xs sm:text-sm font-semibold tracking-wide text-text/90">
        {waitingForUser ? 'En attente de démarrage.' : 'Veuillez patienter.'}
      </span>
    </motion.div>
  );
}

export function AwaitingUserOverlay({ 
  waitingForUser, 
  phase, 
  failureCategory, 
  onPlay 
}: { 
  waitingForUser: boolean; 
  phase: string; 
  failureCategory?: string; 
  onPlay: () => void; 
}) {
  if (!waitingForUser) return null;
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      onClick={onPlay}
      className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 transition hover:bg-black/40"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-al-yellow hover:brightness-110 text-black shadow-lg shadow-al-gold/20 transition-transform hover:scale-105">
        <Play className="h-6 w-6 fill-current ml-0.5" />
      </span>
      <span className="mt-3.5 text-xs sm:text-sm font-bold text-text">
        {phase === 'awaiting-user' ? 'Touchez pour autoriser la lecture' : 'Lire maintenant'}
      </span>
      {failureCategory === 'autoplay' && (
        <span className="mt-1.5 max-w-md px-4 text-xs text-text-muted">Aucun lecteur externe ne sera lancé sans votre choix.</span>
      )}
    </motion.button>
  );
}

export function FailureOverlay({ 
  visibleFailure, 
  attemptId, 
  engine, 
  openExternalPlayer, 
  tryAnotherSource 
}: { 
  visibleFailure: PlaybackFailure | null; 
  attemptId: string | null; 
  engine: string | null; 
  openExternalPlayer: (force: boolean) => void; 
  tryAnotherSource: () => void; 
}) {
  if (!visibleFailure) return null;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 p-6 text-center"
    >
      <AlertCircle className="mb-3 h-10 w-10 text-al-gold" />
      <h4 className="text-base sm:text-lg font-bold text-text">{failureLabels[visibleFailure.category]}</h4>
      <p className="mt-1.5 max-w-lg text-xs sm:text-sm text-text-muted">{visibleFailure.message}</p>
      {attemptId && (
        <button
          type="button"
          onClick={engine === 'vlc' ? () => openExternalPlayer(true) : tryAnotherSource}
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-line bg-white/[0.04] px-4 py-2 text-xs font-semibold text-text transition hover:border-al-gold/40 hover:bg-white/[0.08] hover:text-text"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>{engine === 'vlc' ? 'Réessayer VLC' : 'Essayer une autre source'}</span>
        </button>
      )}
    </motion.div>
  );
}

export function ExternalOpeningOverlay({ phase }: { phase: string }) {
  if (phase !== 'external-opening') return null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 p-6 text-center"
    >
      <LoaderCircle className="mb-3 h-10 w-10 text-al-gold animate-spin" />
      <h4 className="text-base sm:text-lg font-bold text-text">Ouverture de VLC…</h4>
      <p className="mt-1.5 max-w-lg text-xs sm:text-sm text-text-muted">
        Transmission automatique du flux vers votre lecteur VLC.
      </p>
    </motion.div>
  );
}

export function ExternalOpenedOverlay({ externalOpened, openExternalPlayer }: { externalOpened: boolean; openExternalPlayer: (force: boolean) => void; }) {
  if (!externalOpened) return null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 p-6 text-center"
    >
      <ExternalLink className="mb-3 h-10 w-10 text-al-gold" />
      <h4 className="text-base sm:text-lg font-bold text-text">VLC lancé</h4>
      <p className="mt-1.5 max-w-lg text-xs sm:text-sm text-text-muted">
        Le flux vidéo a été transmis automatiquement à VLC. La lecture démarre dans votre lecteur.
      </p>
      <button
        type="button"
        onClick={() => openExternalPlayer(true)}
        className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-line bg-white/[0.04] px-4 py-2 text-xs font-semibold text-text transition hover:border-al-gold/40 hover:bg-white/[0.08] hover:text-text"
      >
        <RefreshCw className="h-3 w-3" />
        <span>Relancer VLC</span>
      </button>
    </motion.div>
  );
}

export function ExternalSuggestedOverlay({
  externalSuggested,
  externalOpened,
  phase,
  attemptId,
  tryAnotherSource,
  openExternalPlayer
}: {
  externalSuggested: boolean;
  externalOpened: boolean;
  phase: string;
  attemptId: string | null;
  tryAnotherSource: () => void;
  openExternalPlayer: (force: boolean) => void;
}) {
  if (!externalSuggested || externalOpened || phase === 'external-opening') return null;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 p-6 text-center"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-al-gold/15 text-al-gold ring-1 ring-al-gold/30">
        <ExternalLink className="h-6 w-6" />
      </span>
      <h4 className="mt-4 text-base sm:text-lg font-bold text-text">Lecteur VLC requis</h4>
      <p className="mt-1.5 max-w-lg text-xs sm:text-sm leading-relaxed text-text-muted">
        Cette chaîne se lit directement dans le lecteur VLC.
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
        {attemptId && (
          <button
            type="button"
            onClick={tryAnotherSource}
            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white/[0.04] px-4 py-2 text-xs font-semibold text-text transition hover:border-white/20 hover:text-text"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Autre source web</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => openExternalPlayer(true)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-transparent bg-al-yellow hover:brightness-110 px-4 py-2 text-xs sm:text-sm font-bold text-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold shadow-sm"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span>Lancer VLC</span>
        </button>
      </div>
    </motion.div>
  );
}
