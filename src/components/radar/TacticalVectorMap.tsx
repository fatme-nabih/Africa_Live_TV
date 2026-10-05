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
import { checkMapWorker, MAP_WORKER_URL } from '@/lib/map-worker';
import { activityTier } from '@/lib/radar-activity';
import type { RadarCountry } from '@/lib/live-osint-types';
import { AFRICAN_COUNTRIES } from '@/lib/live-osint';
import type { LiveChannelsSummarySnapshot } from '@/lib/live-channels-types';
import type { RadarSourceRow } from '@/lib/radar-workspace';
import { Compass, Globe2, RotateCcw } from 'lucide-react';
import { countLabel } from '@/lib/format';

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
const AFRICA_DEFAULT_ZOOM = 2.6;
// Étendue du continent, Dakar et le Cap-Vert compris : la vue initiale suit la taille du cadre (mobile comme bureau).
const AFRICA_VIEW: [[number, number], [number, number]] = [[-26, -36], [53, 38]];

/** Centre et zoom qui cadrent l'Afrique entière dans la carte telle qu'elle est dimensionnée. */
function africaCamera(map: MapLibreMap) {
  const camera = map.cameraForBounds(AFRICA_VIEW, { padding: 12 });
  return { center: camera?.center ?? AFRICA_CENTER, zoom: camera?.zoom ?? AFRICA_DEFAULT_ZOOM };
}
const AFRICA_BOUNDS: [[number, number], [number, number]] = [
  [-38.0, -40.0],
  [68.0, 42.0],
];
const MAP_UNAVAILABLE = 'Carte indisponible. Le fil et le choix du pays restent accessibles.';

export type BasemapMode = 'dark' | 'satellite';

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

const COUNTRIES_URL = '/maps/africa-countries.json';

/** Couleur d'un jeton de la charte (MapLibre ne lit pas les variables CSS) ; le repli reprend la valeur du jeton. */
function token(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/**
 * Fond sombre par défaut : les contours des pays d'Afrique, servis par Africa Live (une vingtaine de Ko compressés),
 * sans tuiles ni polices tierces. Le satellite reste un choix explicite, plus lourd en données.
 */
function darkStyle(): StyleSpecification {
  const gold = token('--color-al-gold', '#d4a72c');
  const border = token('--color-line-gold', gold);
  return {
    version: 8,
    sources: { countries: { type: 'geojson', data: COUNTRIES_URL, attribution: 'Natural Earth' } },
    layers: [
      { id: 'ocean', type: 'background', paint: { 'background-color': token('--color-ink', '#000000') } },
      { id: 'land', type: 'fill', source: 'countries', paint: { 'fill-color': token('--color-surface-2', '#141416') } },
      { id: 'land-selected', type: 'fill', source: 'countries', filter: ['==', ['get', 'code'], ''], paint: { 'fill-color': gold, 'fill-opacity': 0.24 } },
      { id: 'borders', type: 'line', source: 'countries', paint: { 'line-color': border, 'line-width': ['interpolate', ['linear'], ['zoom'], 2, 0.6, 6, 1.4] } },
      { id: 'borders-selected', type: 'line', source: 'countries', filter: ['==', ['get', 'code'], ''], paint: { 'line-color': gold, 'line-width': 2 } },
    ],
  };
}

function basemapStyle(mode: BasemapMode): StyleSpecification {
  return mode === 'satellite' ? SATELLITE_STYLE : darkStyle();
}

const TV_ICON = '<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="m8 3 4 4 4-4"/></svg>';

function highlightCountry(map: MapLibreMap, code: string | null) {
  for (const id of ['land-selected', 'borders-selected']) {
    if (map.getLayer(id)) map.setFilter(id, ['==', ['get', 'code'], code ?? '']);
  }
}

export interface TacticalVectorMapProps {
  countries: RadarCountry[];
  /** Dépêches des dernières 24 h par pays : règle la taille et la pulsation du repère. */
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
  // Le dernier pays choisi et le dernier gestionnaire : les écouteurs de la carte ne sont posés qu'une fois.
  const selectedRef = useRef(selectedCountry);
  const onSelectRef = useRef(onSelectCountry);
  const [isSupported] = useState(() => isWebGLSupported());
  const [isLoaded, setIsLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [basemapMode, setBasemapMode] = useState<BasemapMode>('dark');
  const initialBasemapRef = useRef(basemapMode);

  const handleSwitchBasemap = (mode: BasemapMode) => {
    if (mode === basemapMode || !mapRef.current) return;
    setBasemapMode(mode);
    mapRef.current.setStyle(basemapStyle(mode));
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
          ...africaCamera(map),
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
    } catch { setMapError(MAP_UNAVAILABLE); }
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
          style: basemapStyle(initialBasemapRef.current),
          bounds: AFRICA_VIEW,
          fitBoundsOptions: { padding: 12 },
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
          if (!disposed) setMapError(MAP_UNAVAILABLE);
        });

        map.on('style.load', () => {
          highlightCountry(map, selectedRef.current);
          setIsLoaded(true);
        });

        // Un clic sur un pays du fond sombre le choisit (re-clic : retour à toute l'Afrique), comme son repère.
        map.on('click', event => {
          if (!map.getLayer('land')) return;
          const code = map.queryRenderedFeatures(event.point, { layers: ['land'] })[0]?.properties?.code;
          if (typeof code === 'string') onSelectRef.current(selectedRef.current === code ? null : code);
        });

        mapRef.current = map;
      } catch {
        if (!disposed) setMapError(MAP_UNAVAILABLE);
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

  // Le pays choisi est surligné sur le fond sombre.
  useEffect(() => {
    selectedRef.current = selectedCountry;
    onSelectRef.current = onSelectCountry;
    if (mapRef.current && isLoaded) highlightCountry(mapRef.current, selectedCountry);
  }, [selectedCountry, onSelectCountry, isLoaded]);

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
      const tier = activityTier(count);

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
        ? 'border-al-gold bg-al-yellow text-black'
        : hasChannels
        ? 'border-al-green bg-surface-1 text-al-green ring-2 ring-al-gold/40'
        : 'border-al-green/80 bg-surface-1 text-text';

      // Pulsation = activité des dernières 24 h (anneaux CSS animés par transform/opacity, coupés en mode Éco).
      const pulse = isSelected
        ? '<span class="radar-pulse radar-pulse-3 radar-pulse-gold" aria-hidden="true"></span>'
        : tier >= 2
        ? `<span class="radar-pulse radar-pulse-${tier}" aria-hidden="true"></span>`
        : '';

      el.innerHTML = `
        <div class="relative flex items-center justify-center transition-transform duration-200 group-hover:scale-110 ${
          isSelected ? 'scale-110 z-30' : 'z-10'
        }">
          ${pulse}
          ${
            isSelected
              ? '<span class="absolute -inset-1.5 rounded-full border-2 border-al-gold"></span>'
              : hasChannels
              ? '<span class="absolute -inset-1.5 rounded-full border border-dashed border-al-gold/60"></span>'
              : ''
          }
          <div style="width: ${size}px; height: ${size}px;" class="relative flex items-center justify-center rounded-full border-2 text-xs font-black transition-all ${badgeBorder}">
            <span>${count > 0 ? count : ''}</span>
            ${hasChannels && count === 0 ? `<span class="text-al-gold">${TV_ICON}</span>` : ''}
          </div>
          ${
            hasChannels && count > 0
              ? `<span class="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-al-yellow text-black ring-1 ring-black">${TV_ICON}</span>`
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
                  ? `<span class="rounded bg-al-gold/20 px-1 text-xs font-black text-al-gold">${channelCount} TV</span>`
                  : ''
              }
            </div>
            <div class="text-xs font-normal text-text-muted mt-0.5">${countLabel(count, 'dépêche', 'dépêches')}${
              channelCount > 0 ? ` · ${countLabel(channelCount, 'chaîne référencée', 'chaînes référencées')}` : ''
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
        ...(isGlobeMode ? { center: AFRICA_CENTER, zoom: 2.2 } : africaCamera(map)),
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
        ...africaCamera(mapRef.current),
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

  const modeButton = (mode: BasemapMode, label: string, title: string) => (
    <button
      type="button"
      onClick={() => handleSwitchBasemap(mode)}
      aria-pressed={basemapMode === mode}
      title={title}
      className={`inline-flex min-h-9 items-center rounded-lg px-3 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold ${
        basemapMode === mode
          ? 'border border-al-gold bg-al-gold/15 text-text'
          : 'text-text-muted hover:text-text'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="relative flex w-full flex-1 flex-col overflow-hidden rounded-xl border border-line bg-black/60">
      <div className="relative z-10 flex flex-wrap items-center gap-2 border-b border-line bg-black/60 p-2">
        <div role="group" aria-label="Fond de carte" className="flex items-center rounded-xl border border-line bg-black/60 p-0.5">
          {modeButton('dark', 'Sombre', 'Fond sombre léger : consomme peu de données')}
          {modeButton('satellite', 'Satellite', 'Vue satellite : plus lourde en données')}
        </div>

        <button
          type="button"
          onClick={handleToggleGlobe}
          aria-pressed={isGlobeMode}
          disabled={!isLoaded}
          title={isGlobeMode ? 'Revenir à la carte à plat' : 'Afficher la Terre en relief'}
          className={`inline-flex min-h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold ${
            isGlobeMode
              ? 'border-al-gold bg-al-gold/15 text-text'
              : 'border-line bg-surface-2 text-text-muted hover:border-line-gold hover:text-text'
          }`}
        >
          <Globe2 aria-hidden="true" className="h-3.5 w-3.5 text-al-gold" />
          <span>Globe 3D</span>
          <span className="text-xs font-black uppercase">{isGlobeMode ? 'ON' : 'OFF'}</span>
        </button>

        <button
          type="button"
          onClick={handleRecenter}
          title="Recadrer sur l'Afrique"
          aria-label="Recadrer la carte sur le continent africain"
          className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-line bg-surface-2 px-3 text-xs font-bold text-text-muted transition hover:border-line-gold hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold sm:ml-auto"
        >
          <RotateCcw aria-hidden="true" className="h-3 w-3 text-al-gold" />
          <span>Recadrer</span>
        </button>
      </div>

      <div
        ref={mapContainerRef}
        // Sur grand écran la carte occupe toute la hauteur de sa rangée (à côté de « À la une ») : plus de vide sous la carte (R3).
        className="h-[420px] w-full sm:h-[520px] xl:h-auto xl:min-h-[520px] xl:flex-1"
        style={{ background: 'var(--color-surface-1)' }}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-black/40 px-3 py-2 text-xs text-text-muted">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-al-green" />
            Pays avec dépêches · plus ça pulse, plus c’est actif (24 h)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border border-dashed border-al-gold" />
            Chaînes TV référencées
          </span>
          {isGlobeMode && (
            <span className="inline-flex items-center gap-1.5 text-al-green">
              Globe 3D : clic droit + glisser pour incliner
            </span>
          )}
        </div>
        {selectedCountry && (
          <button
            type="button"
            onClick={() => onSelectCountry(null)}
            className="min-h-9 px-2 font-semibold text-al-green hover:text-text"
          >
            Effacer le filtre
          </button>
        )}
        {/* Attribution obligatoire, sur une ligne : l'imagerie Esri n'est créditée que lorsqu'elle est affichée. */}
        <p className="w-full text-text-muted">
          Contours : Natural Earth{basemapMode === 'satellite' && <> · Imagerie © Esri, Maxar, Earthstar Geographics</>}
        </p>
      </div>
    </div>
  );
}
