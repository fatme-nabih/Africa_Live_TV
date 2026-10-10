import React from 'react';
import { createRoot } from 'react-dom/client';
import Pricing from '../../src/app/(clerk)/pricing/page';
import Success from '../../src/app/(clerk)/pricing/success/SuccessClient';
import Player from '../../src/components/Player';
import { PlayerDockProvider, usePlayerDock } from '../../src/components/player/PlayerDock';
import type { Channel } from '../../src/types/channel';
import Countries from '../../src/components/shell/FollowedCountriesSync';
import { useFavorites } from '../../src/components/tv/useFavorites';
import { PreferenceOwnerProvider } from '../../src/components/shell/PreferenceOwnerContext';
import { useFollowedCountries, useWriteFollowedCountries } from '../../src/components/tv/hooks';
import { useRadarData } from '../../src/components/radar/useRadarData';
import { useRadarPlayer } from '../../src/components/radar/useRadarPlayer';
import { saveCheckoutAttempt } from '../../src/lib/checkout-attempt';
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
function TestPreferences({ kind }: { kind: string }) {
  const [owner,setOwner] = React.useState<string|null>(new URLSearchParams(location.search).get('owner') === 'unknown' ? null : 'account:A');
  return <><button onClick={() => setOwner('account:A')}>Account A</button><button onClick={() => setOwner('account:B')}>Account B</button><button onClick={() => setOwner(null)}>Sign out</button><PreferenceOwnerProvider owner={owner}>{kind === 'countries' ? <TestCountries/> : <TestFavorites/>}</PreferenceOwnerProvider></>;
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
createRoot(document.getElementById('root')!).render(
  kind === 'pricing' ? <TestPricing /> : kind === 'success' ? <Success /> : kind === 'radar' ? <TestRadar /> : kind === 'countries' || kind === 'favorites' ? <TestPreferences kind={kind}/> : kind === 'dock' ? <PlayerDockProvider><DockActions /></PlayerDockProvider> : <TestPlayer />,
);
