'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { LatestRequestController } from '@/lib/latest-request';
import { requestRadarJson } from '@/lib/radar-request';

const REFRESH_INTERVAL_MS = 5 * 60_000;
const NEWS_UNAVAILABLE = 'Les dépêches sont momentanément indisponibles.';

/** Données du Radar : dépêches, résumé du catalogue TV et chaînes du pays choisi. */
export function useRadarData(selectedCountry: string | null) {
  const rssRequests = useRef(new LatestRequestController());
  const summaryRequests = useRef(new LatestRequestController());
  const countryController = useRef<AbortController|null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const refresh = useCallback(() => { rssRequests.current.abort(); summaryRequests.current.abort(); countryController.current?.abort(); setRefreshToken((value) => value + 1); }, []);

  const [newsError, setNewsError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [asOf, setAsOf] = useState(0);
  const [rss, setRss] = useState<RadarRssSnapshot | null>(null);

  const [summaryError, setSummaryError] = useState(false);
  const [channelsSummary, setChannelsSummary] = useState<LiveChannelsSummarySnapshot | null>(null);

  const [selection,setSelection] = useState({ country:selectedCountry,epoch:0 });
  if (selection.country !== selectedCountry) setSelection({ country:selectedCountry,epoch:selection.epoch+1 });
  const [countryResource,setCountryResource] = useState<{ key:string|null; token:number; epoch:number; channels:Channel[]; loading:boolean; error:string|null }>({ key:null,token:-1,epoch:-1,channels:[],loading:false,error:null });
  const applies = selection.country === selectedCountry && countryResource.epoch === selection.epoch && countryResource.key === selectedCountry && countryResource.token === refreshToken;
  const countryChannels = applies ? countryResource.channels : [];
  const countryChannelsLoading = Boolean(selectedCountry) && (!applies || countryResource.loading);
  const countryChannelsError = applies ? countryResource.error : null;
  const countryChannelsCountry = applies ? countryResource.key : null;

  useEffect(() => {
    let active = true;
    const requests = rssRequests.current;

    const load = async () => {
      const request = requests.begin();
      setRefreshing(true);
      try {
        const body = await requestRadarJson('/api/live/rss',request.signal);
        if (!body || typeof body !== 'object' || !Array.isArray((body as RadarRssSnapshot).articles)) throw new Error(NEWS_UNAVAILABLE);
        if (!Array.isArray((body as RadarRssSnapshot).sources) || typeof (body as RadarRssSnapshot).updatedAt !== 'string') throw new Error(NEWS_UNAVAILABLE);
        if (!active || !requests.isCurrent(request.id)) return;
        const snapshot = body as RadarRssSnapshot;
        const collectedAt = Date.parse(snapshot.window?.asOf ?? snapshot.updatedAt);
        if (!Number.isFinite(collectedAt)) throw new Error(NEWS_UNAVAILABLE);
        setAsOf(Math.min(collectedAt,Date.now()));
        setRss(body as RadarRssSnapshot);
        setNewsError(null);
      } catch {
        if (active && requests.isCurrent(request.id)) {
          setRss(previous => previous && Date.now() - Date.parse(previous.updatedAt) <= 45 * 60_000 ? { ...previous, stale: true } : null);
          setNewsError(NEWS_UNAVAILABLE);
        }
      } finally {
        if (active && requests.isCurrent(request.id)) { setRefreshing(false); requests.finish(request.id); }
      }
    };

    void load();
    const interval = window.setInterval(() => void load(), REFRESH_INTERVAL_MS);
    return () => {
      active = false;
      requests.abort();
      window.clearInterval(interval);
    };
  }, [refreshToken]);

  useEffect(() => {
    let active = true;
    const requests = summaryRequests.current;

    const loadChannelsSummary = async () => {
      const request = requests.begin();
      try {
        const body = await requestRadarJson('/api/live/channels?summary=true',request.signal);
        if (!active || !requests.isCurrent(request.id)) return;
        if (body && typeof body === 'object' && 'countries' in body) {
          setChannelsSummary(body as LiveChannelsSummarySnapshot);
          setSummaryError(false);
        }
      } catch {
        if (active && requests.isCurrent(request.id)) setSummaryError(true);
      } finally {
        if (requests.isCurrent(request.id)) requests.finish(request.id);
      }
    };

    void loadChannelsSummary();
    const interval = window.setInterval(() => void loadChannelsSummary(), 10 * 60_000);
    return () => {
      active = false;
      requests.abort();
      window.clearInterval(interval);
    };
  }, [refreshToken]);

  useEffect(() => {
    if (!selectedCountry) return;

    let active = true;
    const controller = new AbortController();
    countryController.current = controller;

    const loadCountryChannels = async () => {
      setCountryResource({ key:selectedCountry,token:refreshToken,epoch:selection.epoch,channels:[],loading:true,error:null });
      try {
        const body = await requestRadarJson(`/api/live/channels?country=${encodeURIComponent(selectedCountry)}`,controller.signal) as { channels?:Channel[] };
        if (!active || controller.signal.aborted) return;
        if (Array.isArray(body.channels)) {
          setCountryResource({ key:selectedCountry,token:refreshToken,epoch:selection.epoch,channels:body.channels,loading:false,error:null });
        } else throw new Error('INVALID_COUNTRY_CHANNELS');
      } catch {
        if (active && !controller.signal.aborted) {
          setCountryResource({ key:selectedCountry,token:refreshToken,epoch:selection.epoch,channels:[],loading:false,error:'Impossible de charger les chaînes de ce pays.' });
        }
      } finally {
        if (active && !controller.signal.aborted) setCountryResource(previous => ({ ...previous,loading:false }));
      }
    };

    void loadCountryChannels();
    return () => {
      active = false;
      controller.abort();
      if (countryController.current === controller) countryController.current = null;
    };
  }, [selectedCountry, refreshToken,selection.epoch]);

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
