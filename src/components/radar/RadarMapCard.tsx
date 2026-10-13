'use client';
import { editionCountries, countryName } from '@/lib/country-names';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Radar } from 'lucide-react';
import { Button } from '@/components/ui';
import type { LiveChannelsSummarySnapshot } from '@/lib/live-channels-types';
import { commodityFocusLabel, type CommodityFocus } from '@/lib/market-geography';
import { useI18n } from '@/i18n/client';

function MapLoading() {
  const { t } = useI18n();
  return (
    <div className="flex h-[420px] sm:h-[520px] w-full flex-col items-center justify-center rounded-xl border border-line bg-surface-1 p-6 text-center text-text-muted">
      <div className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-al-green border-t-transparent" />
      <p className="text-xs font-bold text-text-muted">{t.radar.map.loading}</p>
    </div>
  );
}

const TacticalVectorMap = dynamic(
  () => import('@/components/radar/TacticalVectorMap'),
  {
    ssr: false,
    loading: () => <MapLoading />,
  },
);

export default function RadarMapCard({
  className = '',
  countryCounts,
  channelsSummary,
  selectedCountry,
  onSelectCountry,
  onSelectCountryForChannels,
  commodityFocus = null,
  onClearCommodity,
}: {
  className?: string;
  countryCounts: Map<string, number>;
  channelsSummary: LiveChannelsSummarySnapshot | null;
  selectedCountry: string | null;
  onSelectCountry: (code: string | null) => void;
  onSelectCountryForChannels: (code: string) => void;
  commodityFocus?: CommodityFocus | null;
  onClearCommodity?: () => void;
}) {
  const { t, edition } = useI18n();
  const labels = t.radar.map;
  // Sur petit écran la carte se charge à la demande : le fil et le choix du pays n'en dépendent pas.
  const [mapRequested, setMapRequested] = useState(false);
  const [desktopMap, setDesktopMap] = useState(false);
  const showMap = desktopMap || mapRequested;
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1280px)');
    const update = () => setDesktopMap(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return (
    <article aria-label={labels.region} className={`relative flex flex-col overflow-hidden rounded-card border border-line bg-surface-1 ${className}`}>
      <div className="h-[2px] w-full bg-tricolor-bar absolute top-0 inset-x-0 opacity-80" />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 border-b border-line px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2 text-sm font-bold text-text">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-al-green/30 bg-al-green/10 text-al-green">
            <Radar aria-hidden="true" className="h-4 w-4" />
          </span>
          {labels.title}
        </div>
        <p className="text-xs text-text-muted">{labels.subtitle}</p>
      </div>

      <div className="flex flex-1 flex-col p-2 sm:p-3">
        {/* Produit choisi dans le panier du bandeau : la liste reste lisible sans la carte (mobile, lecteur d'écran). */}
        <div id="radar-commodity" role="status" aria-live="polite">
          {commodityFocus && (
            <div className="mb-2 flex flex-wrap items-center gap-2 rounded-control border border-al-green/40 bg-al-green/10 px-3 py-2 text-xs">
              <p className="font-semibold text-text">{commodityFocusLabel(commodityFocus, t.markets.focus)}<span className="font-normal text-text-muted">{labels.indicative}</span></p>
              <ul aria-label={commodityFocusLabel(commodityFocus, t.markets.focus)} className="flex flex-wrap gap-1">
                {commodityFocus.codes.map(code => (
                  <li key={code}>
                    <button type="button" onClick={() => onSelectCountry(code)} className="min-h-8 rounded-pill border border-line bg-black/30 px-2.5 text-text hover:border-al-green">
                      {countryName(code, edition)}
                    </button>
                  </li>
                ))}
              </ul>
              {onClearCommodity && <button type="button" onClick={onClearCommodity} className="ms-auto min-h-8 px-2 font-semibold text-al-green hover:text-text">{labels.clear}</button>}
            </div>
          )}
        </div>
        {!desktopMap && (
          <Button
            variant="secondary"
            size="sm"
            aria-expanded={mapRequested}
            aria-controls="radar-map"
            onClick={() => setMapRequested(value => !value)}
            className="mb-2 xl:hidden"
          >
            {mapRequested ? labels.hide : labels.show}
          </Button>
        )}
        {/* Sur grand écran, la place de la carte (barre d'outils, carte, légende : 614 px mesurés) est réservée dès le rendu serveur :
            plus de saut quand la carte remplace le bouton « Afficher la carte » après hydratation (CLS mesuré par Lighthouse). */}
        <div id="radar-map" className="flex flex-1 flex-col xl:min-h-[614px]">
          {showMap ? (
            <TacticalVectorMap
              countries={editionCountries(edition)}
              countryCounts={countryCounts}
              channelsSummary={channelsSummary}
              selectedCountry={selectedCountry}
              onSelectCountry={onSelectCountry}
              onSelectCountryForChannels={onSelectCountryForChannels}
              commodityFocus={commodityFocus}
            />
          ) : (
            <p className="p-3 text-xs text-text-muted xl:hidden">{labels.onDemand}</p>
          )}
        </div>
      </div>
    </article>
  );
}
