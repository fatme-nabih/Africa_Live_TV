import React from 'react';
import { I18nProvider } from '../../src/i18n/client';
import { en } from '../../src/i18n/en';
import { createRoot } from 'react-dom/client';
// Composant client de la page des tarifs (la page elle-même est devenue serveur pour ses métadonnées, EDI-501).
import Pricing from '../../src/app/[edition]/(clerk)/pricing/PricingClient';
import Success from '../../src/app/[edition]/(clerk)/pricing/success/SuccessClient';
import Player from '../../src/components/Player';
import { PlayerDockProvider, usePlayerDock } from '../../src/components/player/PlayerDock';
import type { Channel } from '../../src/types/channel';
import Countries, { LegacyPreferencesRecovery } from '../../src/components/shell/FollowedCountriesSync';
import { usePreferences } from '../../src/components/shell/usePreferences';
import { useFavorites } from '../../src/components/tv/useFavorites';
import { PreferenceOwnerProvider } from '../../src/components/shell/PreferenceOwnerContext';
import { useFollowedCountries, useWriteFollowedCountries } from '../../src/components/tv/hooks';
import { useRadarData } from '../../src/components/radar/useRadarData';
import { useRadarPlayer } from '../../src/components/radar/useRadarPlayer';
import { saveCheckoutAttempt } from '../../src/lib/checkout-attempt';
import LiveMarketTicker from '../../src/components/radar/LiveMarketTicker';
import RadarMapCard from '../../src/components/radar/RadarMapCard';
import WorldDesk from '../../src/components/radar/WorldDesk';
import type { CommodityFocus } from '../../src/lib/market-geography';
import CountryChannels from '../../src/components/radar/CountryChannels';
import { AFRICAN_COUNTRIES } from '../../src/lib/radar-countries';
import { ShareArticleLink } from '../../src/components/tv/ChannelTile';
import type { LiveChannelsSummarySnapshot } from '../../src/lib/live-channels-types';
function TestWorld() {
  const [token, setToken] = React.useState(0);
  const [country, setCountry] = React.useState('');
  // `far=1` : la rubrique commence loin sous l'écran, pour vérifier qu'elle ne charge rien avant d'en approcher.
  const far = new URLSearchParams(location.search).get('far') === '1';
  return <main className="bg-black p-3 text-text"><button onClick={() => setToken(value => value + 1)}>Refresh world</button><p data-testid="world-country">{country}</p>
    {far && <div data-testid="spacer" style={{ height: 4000 }} />}<WorldDesk refreshToken={token} onSelectCountry={setCountry} /></main>;
}
function TestTicker() {
  const [token, setToken] = React.useState(0);
  const [country, setCountry] = React.useState('');
  const [commodity, setCommodity] = React.useState<CommodityFocus | null>(null);
  // `map=1` : la carte du Radar à côté du bandeau (panneau texte du produit choisi ; la carte WebGL reste à la demande sous 1280 px).
  const withMap = new URLSearchParams(location.search).get('map') === '1';
  return <main className="p-3"><button onClick={() => setToken(value => value + 1)}>Refresh ticker</button><button onClick={() => { document.documentElement.dataset.eco = document.documentElement.dataset.eco === 'true' ? 'false' : 'true'; }}>Toggle test eco</button><LiveMarketTicker refreshToken={token} onSelectCountry={setCountry} onSelectCommodity={withMap ? setCommodity : undefined} activeCommodity={commodity?.symbol ?? null}/><p data-testid="ticker-country">{country}</p>
    {withMap && <RadarMapCard countryCounts={new Map()} channelsSummary={null} selectedCountry={country || null} onSelectCountry={code => setCountry(code ?? '')} onSelectCountryForChannels={setCountry} commodityFocus={commodity} onClearCommodity={() => setCommodity(null)} />}</main>;
}
const gridSummary: LiveChannelsSummarySnapshot = { updatedAt: '2026-10-10T12:00:00Z', totalChannels: 103, totalDirectWeb: 52, countries: Object.fromEntries(
  ([['NG',50,25],['SN',19,6],['CI',25,14],['CD',21,4],['SO',7,0],['ML',1,1]] as const).map(([code,channelCount,directWebCount]) => [code,{ countryCode:code,channelCount,directWebCount }])) };
// `many=1` : tout le catalogue africain, pour vérifier la hauteur bornée de la grille sur ordinateur.
const fullSummary: LiveChannelsSummarySnapshot = { ...gridSummary, countries: Object.fromEntries(AFRICAN_COUNTRIES.map((country, index) => [country.code, { countryCode: country.code, channelCount: 60 - index, directWebCount: index % 3 }])) };
function TestCountryGrid() {
  const summary = new URLSearchParams(location.search).get('many') ? fullSummary : gridSummary;
  const followed = (new URLSearchParams(location.search).get('followed') ?? '').split(',').filter(Boolean);
  const [chosen,setChosen] = React.useState<string|null>(null);
  return <main className="max-w-3xl bg-black p-3 text-text"><CountryChannels selectedCountry={null} activeCountry={null} countryChannels={[]} loading={false} error={null} channelsSummary={summary} activePlayChannelId={null} followedCountries={followed} onSelectCountry={setChosen} onPlayChannel={() => {}} onOpenPopout={() => {}} onRetry={() => {}}/><p data-testid="grid-choice">{chosen}</p></main>;
}
function TestShare() {
  const [cardClicks,setCardClicks] = React.useState(0);
  const [escapes,setEscapes] = React.useState(0);
  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !event.defaultPrevented) setEscapes(value => value + 1); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  // Carte rognée (overflow hidden) collée en bas à droite : le menu doit quand même rester entier et visible.
  return <main className="min-h-screen bg-black p-3 text-text">
    <div onClick={() => setCardClicks(value => value + 1)} className="fixed bottom-2 right-2 flex h-12 w-40 items-center justify-end overflow-hidden rounded-card border border-line">
      <ShareArticleLink compact title="Dépêche test" sourceName="APS" url="https://aps.sn/article?id=7"/>
    </div>
    {/* Rangée qui défile, comme les rangées de chaînes de la TV : le bouton est en partie hors de la zone visible. */}
    <section aria-label="Rangée" className="mt-24 w-72"><div role="list" data-testid="share-row" className="flex snap-x snap-proximity gap-3 overflow-x-auto">
      <div role="listitem" className="flex h-12 w-[26rem] shrink-0 snap-start items-center justify-end border border-line"><ShareArticleLink compact title="Dépêche rangée" url="https://aps.sn/rangee"/></div>
    </div></section>
    <button>Après</button>
    <p data-testid="share-state">{JSON.stringify({ cardClicks, escapes })}</p>
  </main>;
}
function TestPricing() {
  return <><button onClick={() => saveCheckoutAttempt('lumina_all_access_monthly',{ key:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',attemptId:'B' })}>Replace attempt</button><Pricing/></>;
}
function TestRadar() {
  const [country,setCountry] = React.useState<string|null>('SN');
  const data = useRadarData(country);
  const player = useRadarPlayer({ selectedCountry: country, selectCountry: setCountry, playlist: data.countryChannels, playlistCountry: data.countryChannelsCountry, playlistLoading: data.countryChannelsLoading, playlistError: data.countryChannelsError });
  return <><button onClick={data.refresh}>Refresh news</button><button onClick={() => player.watchCountry('CI')}>Watch CI</button><button onClick={player.close}>Abandon</button><pre data-testid="radar-state">{JSON.stringify({ titles:data.rss?.articles.map(article => article.title), summary:data.channelsSummary?.countries,summaryError:data.summaryError,refreshing:data.refreshing, loaded:data.countryChannelsCountry,error:data.countryChannelsError,channel:player.channel?.id,failed:player.failedCountry })}</pre></>;
}

function TestFavorites() {
  const favorites = useFavorites();
  const count = Number(new URLSearchParams(location.search).get('count') ?? 250);
  return <><button onClick={() => { for (let i = 0; i < count; i++) favorites.toggleFavorite('fixture-' + i); }}>Add favorites</button><button onClick={() => favorites.favorites.forEach(favorites.toggleFavorite)}>Remove all</button><button onClick={() => favorites.toggleFavorite('fixture-0')}>Toggle first</button><button onClick={favorites.synchronizeFavorites}>Retry favorites</button><pre data-testid="favorites-state">{JSON.stringify(favorites.favorites)}</pre>{favorites.favoriteError && <p role="alert">{favorites.favoriteError}</p>}</>;
}
function TestCountries() {
  const countries = useFollowedCountries(), write = useWriteFollowedCountries();
  return <><Countries/><button onClick={() => write([...new Set([...countries,'SN'])])}>Add SN</button><button onClick={() => write(countries.filter(code => code !== 'SN'))}>Remove SN</button><pre data-testid="countries-state">{JSON.stringify(countries)}</pre></>;
}
function TestLegacyPreferences() {
  const { snapshot } = usePreferences();
  const television = new URLSearchParams(location.search).get('tv') === '1';
  return <main className="min-h-screen bg-black p-4 text-text"><Countries/>{television && <TestFavorites/>}<LegacyPreferencesRecovery/><pre hidden data-testid="legacy-state">{JSON.stringify(snapshot)}</pre></main>;
}
function TestPreferences({ kind }: { kind: string }) {
  const [owner,setOwner] = React.useState<string|null>(new URLSearchParams(location.search).get('owner') === 'unknown' ? null : 'account:A');
  return <><button onClick={() => setOwner('account:A')}>Account A</button><button onClick={() => setOwner('account:B')}>Account B</button><button onClick={() => setOwner(null)}>Sign out</button><PreferenceOwnerProvider owner={owner}>{kind === 'legacy' ? <TestLegacyPreferences/> : kind === 'countries' ? <TestCountries/> : <TestFavorites/>}</PreferenceOwnerProvider></>;
}

const channel: Channel = { id: 'fixture-channel', name: 'Fixture', logoUrl: null, groupTitle: 'News', countryCode: 'SN', playbackMode: 'BROWSER', availabilityStatus: 'READY' };
function DockActions() {
  const dock = usePlayerDock();
  return <button onClick={() => dock.open({ channel, playlist: [channel] })}>Open dock</button>;
}
function TestPlayer() {
  const [id, setId] = React.useState('fixture-channel');
  return <><button onClick={() => setId('next-channel')}>Next channel</button><Player channelId={id}/></>;
}

const kind = new URLSearchParams(location.search).get('kind');
const screen = (
  kind === 'ticker' ? <TestTicker /> : kind === 'world' ? <TestWorld /> : kind === 'country-grid' ? <TestCountryGrid /> : kind === 'share' ? <TestShare /> : kind === 'pricing' ? <TestPricing /> : kind === 'success' ? <Success /> : kind === 'radar' ? <TestRadar /> : kind === 'countries' || kind === 'favorites' || kind === 'legacy' ? <TestPreferences kind={kind}/> : kind === 'dock' ? <PlayerDockProvider><DockActions /></PlayerDockProvider> : <TestPlayer />
);
createRoot(document.getElementById('root')!).render(new URLSearchParams(location.search).get('edition') === 'en'
  ? <I18nProvider edition="en" messages={en}>{screen}</I18nProvider> : screen);
