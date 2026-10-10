'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import BrandBackdrop from '@/components/brand/BrandBackdrop';
import PageTransition from '@/components/shell/PageTransition';
import { Button } from '@/components/ui';
import FeaturedStories from '@/components/radar/FeaturedStories';
import LiveMarketTicker from '@/components/radar/LiveMarketTicker';
import NewArrivalsPill from '@/components/radar/NewArrivalsPill';
import NewsFeed from '@/components/radar/NewsFeed';
import RadarFeedPanel, { type RadarPanelTab } from '@/components/radar/RadarFeedPanel';
import RadarHeader from '@/components/radar/RadarHeader';
import RadarMapCard from '@/components/radar/RadarMapCard';
import RadarTiles from '@/components/radar/RadarTiles';
import WeatherCard from '@/components/radar/WeatherCard';
import { scrollToSection } from '@/components/radar/scrollToSection';
import { useFreshArticles } from '@/components/radar/useFreshArticles';
import { useLiveWeather } from '@/components/radar/useLiveWeather';
import { useNow } from '@/components/radar/useNow';
import { useRadarCountry } from '@/components/radar/useRadarCountry';
import { useRadarArticles, useRadarData } from '@/components/radar/useRadarData';
import { usePlayerDock } from '@/components/player/PlayerDock';
import { useRadarPlayer } from '@/components/radar/useRadarPlayer';
import { useRadarVisit } from '@/components/radar/useRadarVisit';
import { useStoredToggle } from '@/components/radar/useStoredToggle';
import { featuredKeys, pickFeatured } from '@/lib/radar-featured';
import { AFRICAN_COUNTRIES } from '@/lib/radar-countries';
import { canonicalArticleUrl } from '@/lib/radar-data';
import { countSince, visitIsBeyondWindow } from '@/lib/radar-visit';
import { STORAGE_KEYS } from '@/lib/storage-keys';
import { weatherAlert } from '@/lib/weather-alert';

// Le lecteur (hls.js, animations) ne se charge qu'au premier « Regarder » : le Radar démarre plus léger.

export default function LiveRadarDashboard() {
  return <Suspense fallback={<p className="p-4">Chargement du Radar…</p>}><RadarWorkspace /></Suspense>;
}

function RadarWorkspace() {
  const { selectedCountry, selectCountry, unknownCountry } = useRadarCountry();
  const data = useRadarData(selectedCountry);
  const articles = useRadarArticles(data.windowed, selectedCountry);
  const now = useNow();
  const visit = useRadarVisit(Boolean(data.rss));
  const [panelTab, setPanelTab] = useState<RadarPanelTab>('news');
  const [weatherOpen, setWeatherOpen] = useStoredToggle(STORAGE_KEYS.radarWeatherOpen, true);

  const activeWeatherCode = selectedCountry ?? 'SN';
  const { weather, weatherError, weatherLoading, retryBlocked } = useLiveWeather(activeWeatherCode, data.refreshToken);
  const activeCountry = AFRICAN_COUNTRIES.find(country => country.code === selectedCountry) ?? null;
  const summary = data.channelsSummary;

  // Dépêches : les arrivées automatiques attendent derrière la pastille ; « À la une » = les plus récentes de la vue.
  const fresh = useFreshArticles(articles.visibleArticles, {
    localKey: `${selectedCountry ?? ''}|${articles.scopeTab}`,
    refreshToken: data.refreshToken,
    dataVersion: data.asOf,
  });
  const featured = useMemo(() => pickFeatured(fresh.shown), [fresh.shown]);
  const rows = useMemo(() => {
    const keys = featuredKeys(featured);
    return fresh.shown.filter(article => !keys.has(canonicalArticleUrl(article.url)));
  }, [fresh.shown, featured]);

  const showChannels = useCallback(() => setPanelTab('channels'), []);
  const player = useRadarPlayer({
    selectedCountry,
    selectCountry,
    playlist: data.countryChannels,
    playlistCountry: data.countryChannelsCountry,
    playlistLoading: data.countryChannelsLoading,
    playlistError: data.countryChannelsError,
  });
  // La chaîne choisie par le Radar part dans le lecteur unique de l'espace /app (UX-501) : elle continue si l'on va sur la TV.
  const dock = usePlayerDock();
  const { channel: requested, close: clearRequest, popout } = player;
  useEffect(() => {
    if (!requested) return;
    dock.open({ channel: requested, playlist: data.countryChannels, onPopout: popout });
    clearRequest();
  }, [requested, data.countryChannels, dock, popout, clearRequest]);
  const popoutFromList = useCallback((channel: Parameters<typeof popout>[0]) => {
    dock.close();
    popout(channel);
  }, [dock, popout]);
  const openPanel = (tab: RadarPanelTab) => {
    setPanelTab(tab);
    scrollToSection('radar-fil');
  };
  const showArrivals = () => {
    fresh.release();
    scrollToSection('radar-haut');
  };

  const info = selectedCountry ? summary?.countries[selectedCountry] : null;
  const newCount = countSince(articles.countryArticles, visit.since);

  return (
    <PageTransition>
    <main className="relative flex-1 bg-black text-text flex flex-col selection:bg-al-gold/25 selection:text-text">
      <BrandBackdrop variant="app" />

      <div className="mx-auto max-w-7xl w-full flex-1 px-3 pb-8 pt-3 sm:px-6 sm:pt-4 md:px-6">
        <RadarHeader refreshing={data.refreshing} onRefresh={data.refresh} unknownCountry={unknownCountry}
          country={selectedCountry}
          ticker={<LiveMarketTicker onSelectCountry={selectCountry} refreshToken={data.refreshToken} />}
        />

        <RadarTiles
          countryName={activeCountry?.name ?? null}
          news={{
            ready: Boolean(data.rss) && visit.ready,
            count: newCount,
            total: articles.countryArticles.length,
            // Le Radar ne couvre que 24 h : une visite plus ancienne est comptée sur cette seule fenêtre.
            sinceLabel: !visit.since || !now ? null : visitIsBeyondWindow(visit.since, data.asOf) ? 'sur les dernières 24 h' : `depuis ${new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(visit.since)}`,
          }}
          channels={summary ? { ready: true, count: selectedCountry ? (info?.channelCount ?? 0) : summary.totalChannels, inBrowser: selectedCountry ? (info?.directWebCount ?? 0) : summary.totalDirectWeb } : null}
          weather={{
            state: weather ? 'ok' : weatherError ? 'error' : 'loading',
            alert: weather ? weatherAlert(weather.current) : null,
            place: weather?.current.locationName ?? activeCountry?.name ?? 'Dakar',
            summary: weather ? `${weather.current.temperatureC} °C, ${weather.current.weatherDescription.toLowerCase()}` : '',
          }}
          onOpenNews={() => openPanel('news')}
          onOpenChannels={() => openPanel('channels')}
          onOpenWeather={() => {
            setWeatherOpen(true);
            scrollToSection('radar-meteo');
          }}
        />

        {player.failedCountry && (
          <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-control border border-line-gold bg-surface-1 px-3 py-2 text-xs text-text">
            <span>Aucune chaîne à lancer pour {AFRICAN_COUNTRIES.find(country => country.code === player.failedCountry)?.name ?? 'ce pays'} pour le moment.</span>
            <span className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => { player.dismissFailure(); openPanel('channels'); }}>Voir les chaînes</Button>
              <Button variant="ghost" size="sm" onClick={player.dismissFailure}>Fermer</Button>
            </span>
          </div>
        )}

        {/* Ordre mobile : à la une, fil, carte, météo ; bureau (xl) : à la une | carte, puis fil | météo. Le bandeau des marchés défile dans l'en-tête. */}
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-12 xl:gap-5">
          <FeaturedStories
            className="xl:col-span-5 xl:col-start-1 xl:row-start-1"
            loading={!data.rss && !data.newsError}
            stories={featured}
            countryName={activeCountry?.name ?? null}
            countries={AFRICAN_COUNTRIES}
            now={now}
            since={visit.since}
          />
          <RadarFeedPanel
            className="xl:col-span-7 xl:col-start-1 xl:row-start-2"
            tab={panelTab}
            onTabChange={setPanelTab}
            articleCount={articles.tabCounts.all}
            selectedCountry={selectedCountry}
            activeCountry={activeCountry}
            channelsSummary={summary}
            countryChannels={data.countryChannels}
            channelsLoading={data.countryChannelsLoading}
            channelsError={data.countryChannelsError}
            playingChannelId={dock.channel?.id ?? null}
            onSelectCountry={selectCountry}
            onPlayChannel={player.open}
            onOpenPopout={popoutFromList}
            onRetry={data.refresh}
            news={
              <NewsFeed
                key={`${selectedCountry ?? ''}|${articles.scopeTab}`}
                rss={data.rss}
                newsError={data.newsError}
                activeCountry={activeCountry}
                channelsSummary={summary}
                scopeTab={articles.scopeTab}
                tabCounts={articles.tabCounts}
                total={fresh.shown.length}
                shown={fresh.shown}
                rows={rows}
                unknownDate={articles.visibleUnknownArticles}
                now={now}
                since={visit.since}
                onScopeChange={articles.setScopeTab}
                onSelectCountry={selectCountry}
                onWatchCountry={player.watchCountry}
                onRetry={data.refresh}
              />
            }
          />
          <RadarMapCard
            className="xl:col-span-7 xl:col-start-6 xl:row-start-1"
            countryCounts={data.countryCounts}
            channelsSummary={summary}
            selectedCountry={selectedCountry}
            onSelectCountry={selectCountry}
            onSelectCountryForChannels={code => {
              selectCountry(code);
              showChannels();
            }}
          />
          <div className="flex flex-col gap-4 xl:col-span-5 xl:col-start-8 xl:row-start-2 xl:self-start">
            <WeatherCard
              weather={weather}
              weatherError={weatherError}
              weatherLoading={weatherLoading}
              retryBlocked={retryBlocked}
              activeWeatherCode={activeWeatherCode}
              open={weatherOpen}
              onOpenChange={setWeatherOpen}
              onSelectCountry={selectCountry}
              onRetry={data.refresh}
            />
          </div>
        </section>

        <footer className="mt-7 flex flex-col gap-2 border-t border-line pt-4 text-xs leading-5 text-text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>Les titres renvoient aux articles des rédactions africaines et internationales.</span>
          <span>Africa Live ne confirme pas les faits rapportés.</span>
        </footer>
      </div>

      <NewArrivalsPill count={fresh.pendingCount} onShow={showArrivals} />
    </main>
    </PageTransition>
  );
}
