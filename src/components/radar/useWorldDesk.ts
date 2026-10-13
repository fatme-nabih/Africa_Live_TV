'use client';
import { useEdition } from '@/i18n/client';
import { editionApiUrl } from '@/lib/edition-client';

import { useEffect, useRef, useState } from 'react';
import { LatestRequestController } from '@/lib/latest-request';
import { requestRadarJson } from '@/lib/radar-request';
import { parseWorldSnapshot, WORLD_MAX_STALE_MS, type WorldSnapshot } from '@/lib/world-desk-data';

const INTERVAL_MS = 10 * 60_000;

/** Relevé « Regards sur le monde », chargé seulement quand la rubrique approche de l'écran (`enabled`). */
export function useWorldDesk(enabled: boolean, refreshToken: number) {
  const edition = useEdition();
  const requests = useRef(new LatestRequestController());
  const lastToken = useRef(refreshToken);
  const [data, setData] = useState<WorldSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [dataEdition, setDataEdition] = useState(edition);
  if (dataEdition !== edition) { setDataEdition(edition); setData(null); setError(false); }
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let active = true, lastAttempt = 0;
    const controller = requests.current;
    const force = lastToken.current !== refreshToken;
    lastToken.current = refreshToken;
    const load = async (forceRefresh = false) => {
      const request = controller.begin();
      lastAttempt = Date.now();
      setLoading(true);
      try {
        const snapshot = parseWorldSnapshot(await requestRadarJson(editionApiUrl(`/api/live/world${forceRefresh ? '?refresh=true' : ''}`, edition), request.signal));
        if (!snapshot) throw new Error('Invalid world snapshot');
        if (active && controller.isCurrent(request.id)) { setData(snapshot); setError(false); }
      } catch {
        if (active && controller.isCurrent(request.id)) {
          setData(previous => previous && Date.now() - Date.parse(previous.updatedAt) <= WORLD_MAX_STALE_MS ? previous : null);
          setError(true);
        }
      } finally {
        if (active && controller.isCurrent(request.id)) { setLoading(false); controller.finish(request.id); }
      }
    };
    void load(force);
    const periodic = () => { if (document.visibilityState === 'visible' && Date.now() - lastAttempt >= INTERVAL_MS) void load(); };
    const interval = window.setInterval(periodic, INTERVAL_MS);
    document.addEventListener('visibilitychange', periodic);
    return () => { active = false; controller.abort(); window.clearInterval(interval); document.removeEventListener('visibilitychange', periodic); };
  }, [enabled, refreshToken, retry, edition]);

  return { data, loading: loading || (enabled && !data && !error), error, retry: () => setRetry(value => value + 1) };
}
