'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  setWorkerUrl,
  type StyleSpecification,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { effectiveEco, readEcoRaw, readSaveData } from '@/lib/eco-mode';
import { checkMapWorker, MAP_WORKER_URL } from '@/lib/map-worker';
import type { RadarCountry } from '@/lib/live-osint-types';
import { AFRICAN_COUNTRIES } from '@/lib/live-osint';
import type { LiveChannelsSummarySnapshot } from '@/lib/live-channels-types';
import type { RadarSourceRow } from '@/lib/radar-workspace';
import { Compass, Globe2, RotateCcw } from 'lucide-react';

function isWebGLSupported(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')),
    );
  } catch {
    return false;
  }
}

const AFRICA_CENTER: [number, number] = [17.5, 3.5];
const AFRICA_DEFAULT_ZOOM = 3.1;
const AFRICA_BOUNDS: [[number, number], [number, number]] = [
  [-38.0, -40.0],
  [68.0, 42.0],
];

export type BasemapMode = 'satellite' | 'liberty' | 'dark';

const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'esri-satellite': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics',
      maxzoom: 19,
    },
    'esri-boundaries': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: 'esri-satellite-layer',
      type: 'raster',
      source: 'esri-satellite',
      minzoom: 0,
      maxzoom: 19,
    },
    {
      id: 'esri-boundaries-layer',
      type: 'raster',
      source: 'esri-boundaries',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

const BASEMAP_STYLES: Record<BasemapMode, StyleSpecification | string> = {
  satellite: SATELLITE_STYLE,
  liberty: 'https://tiles.openfreemap.org/styles/liberty',
  dark: 'https://tiles.openfreemap.org/styles/dark',
};

export interface TacticalVectorMapProps {
  countries: RadarCountry[];
  countryCounts: Map<string, number>;
  channelsSummary: LiveChannelsSummarySnapshot | null;
  selectedCountry: string | null;
  onSelectCountry: (countryCode: string | null) => void;
  onSelectCountryForChannels?: (countryCode: string) => void;
  onSourcesChange?: (sources: RadarSourceRow[]) => void;
}

export default function TacticalVectorMap({
  countries,
  countryCounts,
  channelsSummary,
  selectedCountry,
  onSelectCountry,
  onSelectCountryForChannels,
  onSourcesChange,
}: TacticalVectorMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const [isSupported] = useState(() => isWebGLSupported());
  const [isLoaded, setIsLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  // Éco data : fond vectoriel sombre (léger) au lieu des tuiles satellite, qui restent un choix explicite.
  const [basemapMode, setBasemapMode] = useState<BasemapMode>(() => (effectiveEco(readEcoRaw(), readSaveData()) ? 'dark' : 'satellite'));
  const initialBasemapRef = useRef(basemapMode);

  const handleSwitchBasemap = (mode: BasemapMode) => {
    if (mode === basemapMode || !mapRef.current) return;
    setBasemapMode(mode);
    const map = mapRef.current;
    map.setStyle(BASEMAP_STYLES[mode]);
  };

  useEffect(() => {
    onSourcesChange?.([]);
  }, [onSourcesChange]);

  const [isGlobeMode, setIsGlobeMode] = useState(false);

  const handleToggleGlobe = () => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const next = !isGlobeMode;
    setIsGlobeMode(next);
    try {
      if (next) {
        // Bascule vers le Globe 3D immersif
        map.setMaxBounds(null);
        map.setProjection({ type: 'globe' });
        map.setMaxPitch(85);
        map.dragRotate?.enable();
        map.touchZoomRotate?.enable();
        map.easeTo({
          center: AFRICA_CENTER,
          zoom: 2.2,
          pitch: 35,
          bearing: 0,
          duration: 1500,
        });
      } else {
        // Retour vers la projection 2D Mercator
        map.setProjection({ type: 'mercator' });
        map.setMaxPitch(0);
        map.setBearing(0);
        map.setPitch(0);
        map.dragRotate?.disable();
        map.easeTo({
          center: AFRICA_CENTER,
          zoom: AFRICA_DEFAULT_ZOOM,
          pitch: 0,
          bearing: 0,
          duration: 1200,
        });
        setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.setMaxBounds(AFRICA_BOUNDS);
          }
        }, 1300);
      }
    } catch { setMapError('Carte indisponible. Le fil et le choix du pays restent accessibles.'); }
  };

  // Initialize MapLibre GL
  useEffect(() => {
    if (!mapContainerRef.current || !isSupported || mapError) return;

    let disposed = false;
    const initialize = async () => {
      try {
        await checkMapWorker();
        if (disposed || !mapContainerRef.current) return;
        setWorkerUrl(MAP_WORKER_URL);

        const map = new MapLibreMap({
          container: mapContainerRef.current,
          style: BASEMAP_STYLES[initialBasemapRef.current],
          center: AFRICA_CENTER,
          zoom: AFRICA_DEFAULT_ZOOM,
          minZoom: 1.5,
          maxZoom: 12,
          maxBounds: AFRICA_BOUNDS,
          attributionControl: false,
          renderWorldCopies: true,
          dragRotate: true,
          pitchWithRotate: true,
        });

        map.addControl(
          new NavigationControl({
            showCompass: true,
            showZoom: true,
            visualizePitch: true,
          }),
          'top-right',
        );

        map.on('load', () => {
          setIsLoaded(true);
        });

        map.on('error', () => {
          if (!disposed) setMapError('Carte indisponible. Le fil et le choix du pays restent accessibles.');
        });

        map.on('style.load', () => {
          setIsLoaded(true);
        });

        mapRef.current = map;
      } catch {
        if (!disposed) setMapError('Carte indisponible. Le fil et le choix du pays restent accessibles.');
      }
    };
    void initialize();
    const markers = markersRef.current;

    return () => {
      markers.forEach((marker) => marker.remove());
      markers.clear();
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [isSupported, mapError]);

  // Sync Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;

    const existingMarkers = markersRef.current;
    const currentCountryCodes = new Set<string>();

    for (const country of countries) {
      const count = countryCounts.get(country.code) ?? 0;
      const channelInfo = channelsSummary?.countries[country.code];
      const channelCount = channelInfo?.channelCount ?? 0;

      if (!count && !channelCount) continue;
      currentCountryCodes.add(country.code);

      const isSelected = selectedCountry === country.code;
      const hasChannels = channelCount > 0;

      let marker = existingMarkers.get(country.code);

      if (!marker) {
        // Create custom tactical marker element
        const el = document.createElement('div');
        el.className = 'tactical-radar-marker cursor-pointer group relative';
        el.setAttribute('role', 'button');
        el.setAttribute('tabindex', '0');

        marker = new Marker({
          element: el,
          anchor: 'center',
        })
          .setLngLat([country.longitude, country.latitude])
          .addTo(map);

        existingMarkers.set(country.code, marker);
      }

      const el = marker.getElement();

      // Update marker content and classes
      el.setAttribute(
        'aria-label',
        `${country.name} : ${count} dépêches, ${channelCount} chaînes TV. ${
          isSelected ? 'Désélectionner' : 'Sélectionner'
        }`,
      );

      el.onclick = (e: MouseEvent) => {
        e.stopPropagation();
        onSelectCountry(isSelected ? null : country.code);
      };

      el.onkeydown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelectCountry(isSelected ? null : country.code);
        }
      };

      const size = Math.min(36, Math.max(22, 18 + count * 1.2));
      const badgeBorder = isSelected
        ? 'border-al-gold bg-al-yellow text-black shadow-[0_0_15px_rgba(252,209,22,0.8)]'
        : hasChannels
        ? 'border-al-green bg-surface-1 text-al-green ring-2 ring-al-gold/40'
        : 'border-al-green/80 bg-surface-1 text-text';

      el.innerHTML = `
        <div class="relative flex items-center justify-center transition-transform duration-200 group-hover:scale-110 ${
          isSelected ? 'scale-110 z-30' : 'z-10'
        }">
          ${
            isSelected
              ? '<span class="absolute -inset-2 rounded-full bg-al-gold/30 animate-ping"></span>'
              : hasChannels
              ? '<span class="absolute -inset-1.5 rounded-full border border-dashed border-al-gold/60 animate-[spin_12s_linear_infinite]"></span>'
              : ''
          }
          <div style="width: ${size}px; height: ${size}px;" class="relative flex items-center justify-center rounded-full border-2 text-xs font-black transition-all ${badgeBorder}">
            <span>${count > 0 ? count : ''}</span>
            ${
              hasChannels && count === 0
                ? '<span class="text-xs">📺</span>'
                : ''
            }
          </div>
          ${
            hasChannels && count > 0
              ? '<span class="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-al-yellow text-xs font-black text-black ring-1 ring-black">📺</span>'
              : ''
          }
          <div class="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 ${
            isSelected ? 'block' : 'hidden group-hover:block'
          } whitespace-nowrap rounded-lg border ${
            isSelected
              ? 'border-al-gold/60 bg-black/95 shadow-[0_0_20px_rgba(212,167,44,0.35)] ring-1 ring-al-gold/30'
              : 'border-line bg-black/90 shadow-xl'
          } px-2.5 py-1.5 text-xs font-bold text-text z-50">
            <div class="flex items-center gap-1.5">
              <span class="${isSelected ? 'text-al-gold' : 'text-text'}">${country.name}</span>
              ${
                channelCount > 0
                  ? `<span class="rounded bg-al-gold/20 px-1 py-0.2 text-xs font-black text-al-gold">📺 ${channelCount}</span>`
                  : ''
              }
            </div>
            <div class="text-xs font-normal text-text-muted mt-0.5">${count} dépêche(s)${
              channelCount > 0 ? ` · ${channelCount} TV référencées` : ''
            }</div>
          </div>
        </div>
      `;
    }

    // Clean up markers that are no longer active
    for (const [code, marker] of existingMarkers.entries()) {
      if (!currentCountryCodes.has(code)) {
        marker.remove();
        existingMarkers.delete(code);
      }
    }
  }, [
    countries,
    countryCounts,
    channelsSummary,
    selectedCountry,
    isLoaded,
    onSelectCountry,
    onSelectCountryForChannels,
  ]);

  // Camera Fly To on country selection (RAD-302)
  const prevSelectedCountryRef = useRef<string | null>(null);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;

    const prev = prevSelectedCountryRef.current;
    prevSelectedCountryRef.current = selectedCountry;

    // Do nothing on initial mount when selectedCountry is null
    if (prev === null && selectedCountry === null) return;
    if (prev === selectedCountry) return;

    if (selectedCountry) {
      const targetCountry =
        countries.find((c) => c.code === selectedCountry) ??
        AFRICAN_COUNTRIES.find((c) => c.code === selectedCountry);

      if (targetCountry) {
        map.flyTo({
          center: [targetCountry.longitude, targetCountry.latitude],
          zoom: isGlobeMode ? 4.5 : 5.2,
          pitch: isGlobeMode ? 38 : 0,
          speed: 1.2,
          curve: 1.42,
          essential: true,
        });
      }
    } else {
      map.flyTo({
        center: AFRICA_CENTER,
        zoom: isGlobeMode ? 2.2 : AFRICA_DEFAULT_ZOOM,
        pitch: isGlobeMode ? 35 : 0,
        speed: 1.0,
        curve: 1.42,
        essential: true,
      });
    }
  }, [selectedCountry, countries, isLoaded, isGlobeMode]);

  // Recenter map on Africa
  const handleRecenter = () => {
    onSelectCountry(null);
    if (!mapRef.current) return;
    if (isGlobeMode) {
      mapRef.current.easeTo({
        center: AFRICA_CENTER,
        zoom: 2.2,
        pitch: 35,
        bearing: 0,
        duration: 1200,
      });
    } else {
      mapRef.current.flyTo({
        center: AFRICA_CENTER,
        zoom: AFRICA_DEFAULT_ZOOM,
        pitch: 0,
        bearing: 0,
        speed: 1.0,
        curve: 1.42,
        essential: true,
      });
    }
  };

  if (!isSupported || mapError) {
    return (
      <div className="flex h-[480px] w-full flex-col items-center justify-center rounded-xl bg-surface-1 p-6 text-center text-text-muted">
        <Compass className="mb-3 h-10 w-10 text-al-gold" />
        <p role="status" className="text-sm font-bold text-text">{mapError ?? 'WebGL non supporté'}</p>
        <p className="mt-1 text-xs">
          {mapError ? 'Vous pouvez sélectionner un pays et consulter les dépêches ci-dessous.' : 'Votre navigateur ou affichage ne supporte pas l’accélération matérielle WebGL.'}
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-line bg-black/60">
      {/* Tactical Header Overlay */}
      <div className="relative z-10 flex flex-wrap items-center gap-2 border-b border-line bg-black/60 p-2">
        {/* Style de fond de carte (Satellite Réel / Relief Couleurs / Sombre) */}
        <div className="flex items-center rounded-xl border border-line bg-black/60 p-0.5 shadow-xl">
          <button
            type="button"
            onClick={() => handleSwitchBasemap('satellite')}
            aria-pressed={basemapMode === 'satellite'}
            title="Vue Satellite Réelle en couleurs (ESRI World Imagery + Frontières)"
            className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold ${
              basemapMode === 'satellite'
                ? 'border border-al-green/40 bg-al-green/20 text-text shadow-sm'
                : 'text-text-muted hover:text-text'
            }`}
          >
            <span>🛰️ Satellite</span>
          </button>
          <button
            type="button"
            onClick={() => handleSwitchBasemap('liberty')}
            aria-pressed={basemapMode === 'liberty'}
            title="Vue Relief & Couleurs vives (OpenFreeMap Topo)"
            className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold ${
              basemapMode === 'liberty'
                ? 'border border-al-gold/40 bg-al-gold/20 text-text shadow-sm'
                : 'text-text-muted hover:text-text'
            }`}
          >
            <span>🗺️ Couleurs</span>
          </button>
          <button
            type="button"
            onClick={() => handleSwitchBasemap('dark')}
            aria-pressed={basemapMode === 'dark'}
            title="Vue Tactique Sombre nocturne"
            className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold ${
              basemapMode === 'dark'
                ? 'border border-white/20 bg-white/10 text-text shadow-sm'
                : 'text-text-muted hover:text-text'
            }`}
          >
            <span>🎯 Sombre</span>
          </button>
        </div>

        {/* 3D Globe Projection Toggle */}
        <button
          type="button"
          onClick={handleToggleGlobe}
          aria-pressed={isGlobeMode}
          disabled={!isLoaded}
          title={isGlobeMode ? 'Basculer en vue 2D tactique (Mercator)' : 'Basculer en vue Globe 3D immersif'}
          className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-bold shadow-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold ${
            isGlobeMode
              ? 'border-al-green/60 bg-al-green/25 text-text shadow-[0_0_15px_rgba(18,181,74,0.35)] ring-1 ring-al-green/40'
              : 'border-line bg-white/[0.04] text-text-muted hover:border-al-gold/40 hover:bg-white/[0.08] hover:text-text'
          }`}
        >
          <Globe2
            aria-hidden="true"
            className={`h-3 w-3 ${isGlobeMode ? 'text-al-green' : 'text-text-muted'}`}
          />
          <span>Globe 3D</span>
          <span className="text-xs uppercase font-black">{isGlobeMode ? 'ON' : 'OFF'}</span>
        </button>

      </div>

      {/* Recenter Button */}
      <button
        type="button"
        onClick={handleRecenter}
        title="Recadrer sur l'Afrique"
        aria-label="Recadrer la carte sur le continent africain"
        className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-lg border border-line bg-black/75 px-2.5 py-1.5 text-xs font-bold text-text shadow-xl transition hover:border-al-green/40 hover:bg-black hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-green"
      >
        <RotateCcw className="h-3 w-3 text-al-green" />
        <span>Recadrer</span>
      </button>

      {/* MapLibre WebGL Canvas Container */}
      <div
        ref={mapContainerRef}
        className="h-[460px] sm:h-[520px] w-full"
        style={{ background: 'var(--color-surface-1)' }}
      />

      {/* Tactical Map Footer Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-black/40 px-3 py-2 text-xs text-text-muted">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-al-green" />
            Pays du média / sujet inféré
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border border-dashed border-al-gold" />
            Chaîne TV référencée
          </span>
          {isGlobeMode && (
            <span className="inline-flex items-center gap-1.5 text-al-green">
              <span className="h-2 w-2 rounded-full bg-al-green ring-2 ring-al-green/40 animate-pulse" />
              Globe 3D actif (Clic droit + glisser pour incliner)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedCountry && (
            <button
              type="button"
              onClick={() => onSelectCountry(null)}
              className="font-semibold text-al-green hover:text-text"
            >
              Effacer le filtre
            </button>
          )}
          <span className="text-text-muted">Zoom molette & glisser activés</span>
        </div>
      </div>
    </div>
  );
}
