'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Info, Radar } from 'lucide-react';
import { Button } from '@/components/ui';
import { AFRICAN_COUNTRIES } from '@/lib/radar-countries';
import type { LiveChannelsSummarySnapshot } from '@/lib/live-channels-types';

const TacticalVectorMap = dynamic(
  () => import('@/components/radar/TacticalVectorMap'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[420px] sm:h-[520px] w-full flex-col items-center justify-center rounded-xl border border-line bg-surface-1 p-6 text-center text-text-muted">
        <div className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-al-green border-t-transparent" />
        <p className="text-xs font-bold text-text-muted">Chargement de la carte…</p>
      </div>
    ),
  },
);

export default function RadarMapCard({
  className = '',
  countryCounts,
  channelsSummary,
  selectedCountry,
  onSelectCountry,
  onSelectCountryForChannels,
}: {
  className?: string;
  countryCounts: Map<string, number>;
  channelsSummary: LiveChannelsSummarySnapshot | null;
  selectedCountry: string | null;
  onSelectCountry: (code: string | null) => void;
  onSelectCountryForChannels: (code: string) => void;
}) {
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
    <article aria-label="Carte du Radar" className={`relative overflow-hidden rounded-card border border-line bg-surface-1 ${className}`}>
      <div className="h-[2px] w-full bg-tricolor-bar absolute top-0 left-0 right-0 opacity-80" />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 border-b border-line px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2 text-sm font-bold text-text">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-al-green/30 bg-al-green/10 text-al-green">
            <Radar aria-hidden="true" className="h-4 w-4" />
          </span>
          Carte des pays
        </div>
        <p className="text-xs text-text-muted">Où ça se passe, pays par pays.</p>
      </div>

      <div className="p-2 sm:p-3">
        {!desktopMap && (
          <Button
            variant="secondary"
            size="sm"
            aria-expanded={mapRequested}
            aria-controls="radar-map"
            onClick={() => setMapRequested(value => !value)}
            className="mb-2"
          >
            {mapRequested ? 'Masquer la carte' : 'Afficher la carte'}
          </Button>
        )}
        <div id="radar-map">
          {showMap ? (
            <TacticalVectorMap
              countries={AFRICAN_COUNTRIES}
              countryCounts={countryCounts}
              channelsSummary={channelsSummary}
              selectedCountry={selectedCountry}
              onSelectCountry={onSelectCountry}
              onSelectCountryForChannels={onSelectCountryForChannels}
            />
          ) : (
            <p className="p-3 text-xs text-text-muted">Carte à la demande, pour économiser vos données. Le choix du pays et les dépêches fonctionnent sans elle.</p>
          )}
        </div>
      </div>

      <div className="border-t border-line bg-black/40 px-4 py-3 text-xs leading-5 text-text-muted sm:px-5">
        <Info aria-hidden="true" className="mr-1.5 inline h-3.5 w-3.5 align-[-2px] text-al-gold/80" />
        Contours des pays : Natural Earth (domaine public). Imagerie satellite (option) © Esri, Maxar, Earthstar Geographics. Les repères situent les rédactions et les télévisions référencées.
      </div>
    </article>
  );
}
