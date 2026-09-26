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
      className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80"
    >
      <LoaderCircle className="mb-3 h-10 w-10 text-amber-400 animate-spin" />
      <span className="text-sm font-semibold tracking-wide text-amber-200/90">
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
      className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm transition hover:bg-black/40"
    >
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 text-black shadow-lg shadow-amber-500/30">
        <Play className="h-7 w-7 fill-current" />
      </span>
      <span className="mt-4 text-sm font-bold">
        {phase === 'awaiting-user' ? 'Touchez pour autoriser la lecture' : 'Lire maintenant'}
      </span>
      {failureCategory === 'autoplay' && (
        <span className="mt-2 max-w-md px-4 text-xs text-zinc-300">Aucun lecteur externe ne sera lancé sans votre choix.</span>
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
      className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/85 p-6 text-center"
    >
      <AlertCircle className="mb-4 h-14 w-14 text-amber-400" />
      <h4 className="text-xl font-bold text-zinc-100">{failureLabels[visibleFailure.category]}</h4>
      <p className="mt-2 max-w-lg text-sm text-zinc-300">{visibleFailure.message}</p>
      {attemptId && (
        <button
          type="button"
          onClick={engine === 'vlc' ? () => openExternalPlayer(true) : tryAnotherSource}
          className="mt-5 inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-5 py-3 text-sm font-bold text-zinc-100 transition hover:border-amber-400/60"
        >
          <RefreshCw className="h-4 w-4" />
          {engine === 'vlc' ? 'Réessayer VLC' : 'Essayer une autre source'}
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
      className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/85 p-6 text-center"
    >
      <LoaderCircle className="mb-4 h-12 w-12 text-amber-400 animate-spin" />
      <h4 className="text-xl font-bold text-zinc-100">Ouverture de VLC.</h4>
      <p className="mt-2 max-w-lg text-sm text-zinc-300">
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
      className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/85 p-6 text-center"
    >
      <ExternalLink className="mb-4 h-14 w-14 text-amber-400" />
      <h4 className="text-xl font-bold text-zinc-100">VLC lancé</h4>
      <p className="mt-2 max-w-lg text-sm text-zinc-300">
        Le flux vidéo a été transmis automatiquement à VLC. La lecture démarre dans votre lecteur.
      </p>
      <button
        type="button"
        onClick={() => openExternalPlayer(true)}
        className="mt-5 inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/80 px-5 py-2.5 text-xs sm:text-sm font-bold text-zinc-200 transition hover:border-amber-400/60 hover:text-white"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Relancer VLC
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
      className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/85 p-6 text-center"
    >
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/30">
        <ExternalLink className="h-8 w-8" />
      </span>
      <h4 className="mt-5 text-xl font-bold text-zinc-100">Lecteur VLC requis</h4>
      <p className="mt-2 max-w-lg text-sm leading-6 text-zinc-300">
        Cette chaîne se lit directement dans le lecteur VLC.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        {attemptId && (
          <button
            type="button"
            onClick={tryAnotherSource}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-5 py-3 text-sm font-bold text-zinc-100 transition hover:border-amber-400/60"
          >
            <RefreshCw className="h-4 w-4" />
            Autre source web
          </button>
        )}
        <button
          type="button"
          onClick={() => openExternalPlayer(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 px-5 py-3 text-sm font-extrabold text-black shadow-lg shadow-amber-500/25 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          <ExternalLink className="h-4 w-4" />
          Lancer VLC
        </button>
      </div>
    </motion.div>
  );
}
