'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { temporalWindow } from '@/lib/radar-data';
import {
  countByCountry,
  filterByCountry,
  filterByScope,
  mergeRadarArticles,
  radarArticlesFromRss,
  scopeCounts,
  type ScopeTab,
} from '@/lib/radar-articles';
import type { RadarArticle } from '@/lib/live-osint-types';
import type { RadarRssSnapshot } from '@/lib/rss-collector-types';
import type { LiveChannelsSummarySnapshot } from '@/lib/live-channels-types';
import type { Channel } from '@/types/channel';

const REFRESH_INTERVAL_MS = 5 * 60_000;
const NEWS_UNAVAILABLE = 'Les dépêches sont momentanément indisponibles.';

/** Données du Radar : dépêches, résumé du catalogue TV et chaînes du pays choisi. */
export function useRadarData(selectedCountry: string | null) {
  const [refreshToken, setRefreshToken] = useState(0);
  const refresh = useCallback(() => setRefreshToken((value) => value + 1), []);

  const [newsError, setNewsError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [asOf, setAsOf] = useState(0);
  const [rss, setRss] = useState<RadarRssSnapshot | null>(null);

  const [summaryError, setSummaryError] = useState(false);
  const [channelsSummary, setChannelsSummary] = useState<LiveChannelsSummarySnapshot | null>(null);

  const [countryChannels, setCountryChannels] = useState<Channel[]>([]);
  const [countryChannelsLoading, setCountryChannelsLoading] = useState(false);
  const [countryChannelsError, setCountryChannelsError] = useState<string | null>(null);
  // Pays auquel appartient la liste chargée : évite de lancer la chaîne d'un pays précédent pendant un changement.
  const [countryChannelsCountry, setCountryChannelsCountry] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const load = async () => {
      setRefreshing(true);
      try {
        const response = await fetch('/api/live/rss', { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error(NEWS_UNAVAILABLE);
        const body: unknown = await response.json();
        if (!body || typeof body !== 'object' || !Array.isArray((body as RadarRssSnapshot).articles)) throw new Error(NEWS_UNAVAILABLE);
        if (!Array.isArray((body as RadarRssSnapshot).sources) || typeof (body as RadarRssSnapshot).updatedAt !== 'string') throw new Error(NEWS_UNAVAILABLE);
        if (!active) return;
        setAsOf(Date.now());
        setRss(body as RadarRssSnapshot);
        setNewsError(null);
      } catch {
        if (active && !controller.signal.aborted) {
          setRss(previous => previous && Date.now() - Date.parse(previous.updatedAt) <= 45 * 60_000 ? { ...previous, stale: true } : null);
          setNewsError(NEWS_UNAVAILABLE);
        }
      } finally {
        if (active) setRefreshing(false);
      }
    };

    void load();
    const interval = window.setInterval(() => void load(), REFRESH_INTERVAL_MS);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(interval);
    };
  }, [refreshToken]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const loadChannelsSummary = async () => {
      try {
        const response = await fetch('/api/live/channels?summary=true', {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!response.ok) throw new Error('Catalogue indisponible');
        const body: unknown = await response.json();
        if (!active) return;
        if (body && typeof body === 'object' && 'countries' in body) {
          setChannelsSummary(body as LiveChannelsSummarySnapshot);
          setSummaryError(false);
        }
      } catch {
        if (active && !controller.signal.aborted) setSummaryError(true);
      }
    };

    void loadChannelsSummary();
    const interval = window.setInterval(() => void loadChannelsSummary(), 10 * 60_000);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(interval);
    };
  }, [refreshToken]);

  useEffect(() => {
    if (!selectedCountry) return;

    let active = true;
    const controller = new AbortController();

    const loadCountryChannels = async () => {
      setCountryChannels([]);
      setCountryChannelsCountry(null);
      setCountryChannelsLoading(true);
      setCountryChannelsError(null);
      try {
        const response = await fetch(
          `/api/live/channels?country=${encodeURIComponent(selectedCountry)}`,
          {
            signal: controller.signal,
            cache: 'no-store',
          },
        );
        if (!response.ok) {
          throw new Error('Impossible de charger les chaînes de ce pays.');
        }
        const body = (await response.json()) as { channels?: Channel[] };
        if (!active) return;
        if (Array.isArray(body.channels)) {
          setCountryChannels(body.channels);
          setCountryChannelsCountry(selectedCountry);
        }
      } catch (error) {
        if (active && !controller.signal.aborted) {
          setCountryChannelsError(
            error instanceof Error ? error.message : 'Erreur de chargement des chaînes.',
          );
        }
      } finally {
        if (active) setCountryChannelsLoading(false);
      }
    };

    void loadCountryChannels();
    return () => {
      active = false;
      controller.abort();
    };
  }, [selectedCountry, refreshToken]);

  const merged = useMemo<RadarArticle[]>(() => mergeRadarArticles(radarArticlesFromRss(rss)), [rss]);
  const windowed = useMemo(() => temporalWindow(merged, (article) => article.indexedAt, asOf), [merged, asOf]);
  const countryCounts = useMemo(() => countByCountry(windowed.recent), [windowed]);

  return {
    refreshToken,
    refresh,
    refreshing,
    rss,
    newsError,
    asOf,
    windowed,
    countryCounts,
    channelsSummary,
    summaryError,
    countryChannels,
    countryChannelsLoading,
    countryChannelsError,
    countryChannelsCountry,
  };
}

/** Dépêches du pays choisi, filtrées par rubrique (Toutes / Afrique / International). */
export function useRadarArticles(windowed: { recent: RadarArticle[]; undated: RadarArticle[] }, selectedCountry: string | null) {
  const [scopeTab, setScopeTab] = useState<ScopeTab>('all');
  const countryArticles = useMemo(() => filterByCountry(windowed.recent, selectedCountry), [windowed.recent, selectedCountry]);
  const visibleArticles = useMemo(() => filterByScope(countryArticles, scopeTab), [countryArticles, scopeTab]);
  const visibleUnknownArticles = useMemo(
    () => filterByScope(filterByCountry(windowed.undated, selectedCountry), scopeTab),
    [windowed.undated, selectedCountry, scopeTab],
  );
  const tabCounts = useMemo(() => scopeCounts(countryArticles), [countryArticles]);
  return { scopeTab, setScopeTab, countryArticles, visibleArticles, visibleUnknownArticles, tabCounts };
}
