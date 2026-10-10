'use client';

import { useCallback, useState } from 'react';
import { recordRecentChannel } from '@/components/tv/hooks';
import { pickLiveChannel } from '@/lib/country-live';
import { launchPlayer } from '@/lib/player-window';
import { saveZapList } from '@/lib/zap-list';
import type { Channel } from '@/types/channel';

/**
 * Lecteur du Radar : la modale et le zapping de la TV, sans quitter la page.
 * « Regarder le direct du pays » choisit le pays (dans l'URL), attend ses chaînes, puis lance la plus adaptée.
 */
export function useRadarPlayer({
  selectedCountry,
  selectCountry,
  playlist,
  playlistCountry,
  playlistLoading,
  playlistError,
}: {
  selectedCountry: string | null;
  selectCountry: (code: string | null) => void;
  playlist: Channel[];
  /** Pays auquel appartient `playlist` (null pendant un chargement). */
  playlistCountry: string | null;
  playlistLoading: boolean;
  playlistError: string | null;
}) {
  const [channel, setChannel] = useState<Channel | null>(null);
  const [wanted, setWanted] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [lastCountry, setLastCountry] = useState(selectedCountry);

  // États ajustés pendant le rendu (aucun effet) : le lancement suit l'arrivée des chaînes du pays demandé.
  if (lastCountry !== selectedCountry) {
    setLastCountry(selectedCountry);
    // L'utilisateur est allé ailleurs avant la fin du chargement : la demande est oubliée.
    if (wanted !== null && selectedCountry !== wanted) setWanted(null);
  }
  if (wanted !== null && selectedCountry === wanted) {
    if (playlistError) {
      setWanted(null);
      setFailed(wanted);
    } else if (!playlistLoading && playlistCountry === wanted) {
      const best = pickLiveChannel(playlist);
      setWanted(null);
      if (best) setChannel(best);
      else setFailed(wanted);
    }
  }

  const watchCountry = useCallback((code: string) => {
    setFailed(null);
    setWanted(code);
    if (code !== selectedCountry) selectCountry(code);
  }, [selectedCountry, selectCountry]);

  const close = useCallback(() => { setWanted(null); setChannel(null); }, []);
  const dismissFailure = useCallback(() => setFailed(null), []);

  /** Fenêtre séparée (depuis la modale ou la liste des chaînes) : la liste sert au zapping, la chaîne rejoint « Reprendre ». */
  const popout = useCallback((target: Channel) => {
    try { saveZapList(playlist, window.localStorage); } catch { /* optional device storage */ }
    recordRecentChannel(target);
    const result = launchPlayer({
      channelId: target.id,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      maxTouchPoints: navigator.maxTouchPoints,
      openWindow: (url, windowTarget, features) => window.open(url, windowTarget, features),
      navigateCurrentTab: (url) => window.location.assign(url),
    });
    if (result.mode !== 'blocked') setChannel(null);
    return result;
  }, [playlist]);

  return { channel, open: setChannel, zap: setChannel, watchCountry, close, popout, failedCountry: failed, dismissFailure };
}
