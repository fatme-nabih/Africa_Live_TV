'use client';

import { useEffect, useRef, useState } from 'react';
import type { RadarSourceState } from '@/lib/radar-data';

type LayerMetadata = { metadata: { updatedAt: string; stale: boolean; availability?: RadarSourceState[] } };
export function useRadarLayer<T extends LayerMetadata>(enabled: boolean, url: string,
  normalize: (value: unknown) => { data: T; rejected: number }, ttl: number) {
  const [data, setData] = useState<T | null>(null);
  const [rejected, setRejected] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const cached = useRef<{ until: number; revision: number } | null>(null);
  useEffect(() => {
    if (!enabled) return;
    if (cached.current && cached.current.until > Date.now() && cached.current.revision === revision) return;
    let active = true;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 15_000);
    const load = async () => {
      setLoading(true); setError(null);
      try {
        const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error('Couche indisponible. Les médias et le fil restent utilisables.');
        const result = normalize(await response.json());
        if (!active) return;
        setData(result.data); setRejected(result.rejected);
        const expiries = result.data.metadata.availability?.flatMap(source => source.cacheExpiresAt ? [Date.parse(source.cacheExpiresAt)] : []) ?? [];
        cached.current = { until: result.data.metadata.stale ? Date.now() : expiries.length ? Math.min(...expiries) : Date.now() + ttl, revision };
      } catch (failure) {
        if (active) { setError(controller.signal.aborted ? 'Délai de chargement de la couche dépassé.' : failure instanceof Error ? failure.message : 'Couche indisponible.'); setData(null); cached.current = null; }
      } finally { window.clearTimeout(timer); if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; controller.abort(); window.clearTimeout(timer); };
  }, [enabled, url, normalize, ttl, revision]);
  return { data, rejected, loading, error, retry: () => setRevision(value => value + 1) };
}
