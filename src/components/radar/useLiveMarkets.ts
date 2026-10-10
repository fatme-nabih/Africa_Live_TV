'use client';

import { useEffect, useRef, useState } from 'react';
import type { LiveMarketsSnapshot } from '@/lib/live-markets-types';
import { LatestRequestController } from '@/lib/latest-request';
import { requestRadarJson } from '@/lib/radar-request';
import { MARKET_MAX_STALE_MS, parseMarketsSnapshot } from '@/lib/market-ticker';

const INTERVAL_MS = 5 * 60_000;

export function useLiveMarkets(refreshToken: number) {
  const requests = useRef(new LatestRequestController());
  const lastToken = useRef(refreshToken);
  const [data, setData] = useState<LiveMarketsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true, lastAttempt = 0;
    const controller = requests.current;
    const force = lastToken.current !== refreshToken;
    lastToken.current = refreshToken;
    const load = async (forceRefresh = false) => {
      const request = controller.begin();
      lastAttempt = Date.now();
      setLoading(true);
      try {
        const raw = await requestRadarJson(`/api/live/markets${forceRefresh ? '?refresh=true' : ''}`, request.signal);
        const snapshot = parseMarketsSnapshot(raw);
        if (!snapshot) throw new Error('Invalid markets snapshot');
        if (active && controller.isCurrent(request.id)) { setData(snapshot); setError(false); }
      } catch {
        if (active && controller.isCurrent(request.id)) {
          setData(previous => previous && Date.now() - Date.parse(previous.updatedAt) <= MARKET_MAX_STALE_MS ? previous : null);
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
  }, [refreshToken]);

  return { data, loading, error };
}
