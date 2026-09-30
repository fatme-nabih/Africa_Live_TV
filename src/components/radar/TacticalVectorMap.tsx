'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  Popup,
  GeoJSONSource,
  type MapLayerMouseEvent,
  type StyleSpecification,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { RadarCountry } from '@/lib/live-osint-types';
import { AFRICAN_COUNTRIES } from '@/lib/live-osint';
import type { LiveChannelsSummarySnapshot } from '@/lib/live-channels-types';
import type { FirmsSnapshot } from '@/lib/live-firms-types';
import type { DisasterEventsSnapshot } from '@/lib/live-disasters-types';
import { AlertTriangle, Compass, Flame, Globe2, RotateCcw } from 'lucide-react';

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

const DARK_COMMAND_CENTER_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'carto-dark': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OSM</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>',
    },
  },
  layers: [
    {
      id: 'carto-dark-layer',
      type: 'raster',
      source: 'carto-dark',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

export interface TacticalVectorMapProps {
  countries: RadarCountry[];
  countryCounts: Map<string, number>;
  channelsSummary: LiveChannelsSummarySnapshot | null;
  selectedCountry: string | null;
  onSelectCountry: (countryCode: string | null) => void;
  onSelectCountryForChannels?: (countryCode: string) => void;
}

export default function TacticalVectorMap({
  countries,
  countryCounts,
  channelsSummary,
  selectedCountry,
  onSelectCountry,
  onSelectCountryForChannels,
}: TacticalVectorMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const [isSupported] = useState(() => isWebGLSupported());
  const [isLoaded, setIsLoaded] = useState(false);

  const [showFires, setShowFires] = useState(false);
  const [firmsData, setFirmsData] = useState<FirmsSnapshot | null>(null);
  const [firmsLoading, setFirmsLoading] = useState(false);
  const [firmsError, setFirmsError] = useState<string | null>(null);

  const handleToggleFires = () => {
    setShowFires((prev) => {
      const next = !prev;
      if (next && !firmsData && !firmsLoading) {
        setFirmsLoading(true);
        setFirmsError(null);
        fetch('/api/live/firms?limit=2500&minConfidence=40', { cache: 'no-store' })
          .then((res) => {
            if (!res.ok) throw new Error('Impossible de charger les feux NASA.');
            return res.json() as Promise<FirmsSnapshot>;
          })
          .then((data) => {
            setFirmsData(data);
          })
          .catch((err) => {
            setFirmsError(err instanceof Error ? err.message : 'Erreur de chargement.');
          })
          .finally(() => {
            setFirmsLoading(false);
          });
      }
      return next;
    });
  };

  const [showDisasters, setShowDisasters] = useState(false);
  const [disastersData, setDisastersData] = useState<DisasterEventsSnapshot | null>(null);
  const [disastersLoading, setDisastersLoading] = useState(false);
  const [disastersError, setDisastersError] = useState<string | null>(null);

  const handleToggleDisasters = () => {
    setShowDisasters((prev) => {
      const next = !prev;
      if (next && !disastersData && !disastersLoading) {
        setDisastersLoading(true);
        setDisastersError(null);
        fetch('/api/live/events?limit=300', { cache: 'no-store' })
          .then((res) => {
            if (!res.ok) throw new Error('Impossible de charger les alertes GDACS/USGS.');
            return res.json() as Promise<DisasterEventsSnapshot>;
          })
          .then((data) => {
            setDisastersData(data);
          })
          .catch((err) => {
            setDisastersError(err instanceof Error ? err.message : 'Erreur alertes.');
          })
          .finally(() => {
            setDisastersLoading(false);
          });
      }
      return next;
    });
  };

  const [isGlobeMode, setIsGlobeMode] = useState(false);

  const handleToggleGlobe = () => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    setIsGlobeMode((prev) => {
      const next = !prev;
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
      return next;
    });
  };

  // Initialize MapLibre GL
  useEffect(() => {
    if (!mapContainerRef.current || !isSupported) return;

    const map = new MapLibreMap({
      container: mapContainerRef.current,
      style: DARK_COMMAND_CENTER_STYLE,
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

    mapRef.current = map;
    const markers = markersRef.current;

    return () => {
      markers.forEach((marker) => marker.remove());
      markers.clear();
      map.remove();
      mapRef.current = null;
    };
  }, [isSupported]);

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
        ? 'border-amber-400 bg-amber-400 text-black shadow-[0_0_15px_rgba(250,204,21,0.8)]'
        : hasChannels
        ? 'border-emerald-400 bg-[#081510] text-emerald-300 ring-2 ring-amber-400/40'
        : 'border-emerald-300/80 bg-[#081510] text-emerald-200';

      el.innerHTML = `
        <div class="relative flex items-center justify-center transition-transform duration-200 group-hover:scale-110 ${
          isSelected ? 'scale-110 z-30' : 'z-10'
        }">
          ${
            isSelected
              ? '<span class="absolute -inset-2 rounded-full bg-amber-400/30 animate-ping"></span>'
              : hasChannels
              ? '<span class="absolute -inset-1.5 rounded-full border border-dashed border-amber-400/60 animate-[spin_12s_linear_infinite]"></span>'
              : ''
          }
          <div style="width: ${size}px; height: ${size}px;" class="relative flex items-center justify-center rounded-full border-2 text-[10px] font-black transition-all ${badgeBorder}">
            <span>${count > 0 ? count : ''}</span>
            ${
              hasChannels && count === 0
                ? '<span class="text-[9px]">📺</span>'
                : ''
            }
          </div>
          ${
            hasChannels && count > 0
              ? '<span class="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400 text-[8px] font-black text-black ring-1 ring-black">📺</span>'
              : ''
          }
          <div class="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 ${
            isSelected ? 'block' : 'hidden group-hover:block'
          } whitespace-nowrap rounded-lg border ${
            isSelected
              ? 'border-amber-400/60 bg-black/95 shadow-[0_0_20px_rgba(251,191,36,0.35)] ring-1 ring-amber-400/30'
              : 'border-white/10 bg-black/90 shadow-xl'
          } px-2.5 py-1.5 text-[10px] font-bold text-white backdrop-blur-md z-50">
            <div class="flex items-center gap-1.5">
              <span class="${isSelected ? 'text-amber-300' : 'text-white'}">${country.name}</span>
              ${
                channelCount > 0
                  ? `<span class="rounded bg-amber-400/20 px-1 py-0.2 text-[8px] font-black text-amber-300">📺 ${channelCount}</span>`
                  : ''
              }
            </div>
            <div class="text-[9px] font-normal text-zinc-400 mt-0.5">${count} dépêche(s)${
              channelCount > 0 ? ` · ${channelCount} TV direct` : ''
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

  // Manage NASA FIRMS Thermal Layer (RAD-401)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;

    const SOURCE_ID = 'nasa-firms-source';
    const CLUSTERS_LAYER_ID = 'firms-clusters';
    const CLUSTER_GLOW_LAYER_ID = 'firms-clusters-glow';
    const POINTS_LAYER_ID = 'firms-unclustered-points';

    if (!showFires || !firmsData) {
      if (map.getLayer(CLUSTERS_LAYER_ID)) {
        map.setLayoutProperty(CLUSTERS_LAYER_ID, 'visibility', 'none');
      }
      if (map.getLayer(CLUSTER_GLOW_LAYER_ID)) {
        map.setLayoutProperty(CLUSTER_GLOW_LAYER_ID, 'visibility', 'none');
      }
      if (map.getLayer(POINTS_LAYER_ID)) {
        map.setLayoutProperty(POINTS_LAYER_ID, 'visibility', 'none');
      }
      return;
    }

    const existingSource = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    if (existingSource) {
      existingSource.setData(firmsData);
      map.setLayoutProperty(CLUSTERS_LAYER_ID, 'visibility', 'visible');
      map.setLayoutProperty(CLUSTER_GLOW_LAYER_ID, 'visibility', 'visible');
      map.setLayoutProperty(POINTS_LAYER_ID, 'visibility', 'visible');
      return;
    }

    // Add source with spatial clustering
    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: firmsData,
      cluster: true,
      clusterMaxZoom: 8,
      clusterRadius: 35,
    });

    // Outer glow for thermal clusters
    map.addLayer({
      id: CLUSTER_GLOW_LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': '#f97316',
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          16,
          20,
          22,
          100,
          30,
        ],
        'circle-opacity': 0.28,
        'circle-blur': 0.6,
      },
    });

    // Core cluster circle
    map.addLayer({
      id: CLUSTERS_LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          '#ea580c',
          20,
          '#dc2626',
          100,
          '#991b1b',
        ],
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          10,
          20,
          14,
          100,
          18,
        ],
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#fef08a',
        'circle-stroke-opacity': 0.85,
        'circle-opacity': 0.9,
      },
    });

    // Individual fire detections (unclustered)
    map.addLayer({
      id: POINTS_LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': '#ef4444',
        'circle-radius': 4.5,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#fbbf24',
        'circle-opacity': 0.95,
      },
    });

    // Click cluster to zoom in
    const handleClusterClick = (e: MapLayerMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: [CLUSTERS_LAYER_ID],
      });
      const clusterId = features[0]?.properties?.cluster_id as number | undefined;
      const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
      if (!source || clusterId === undefined) return;

      void source.getClusterExpansionZoom(clusterId).then((zoom) => {
        if (zoom === undefined || zoom === null) return;
        const geom = features[0].geometry;
        if (geom.type === 'Point') {
          map.easeTo({
            center: geom.coordinates as [number, number],
            zoom: zoom,
          });
        }
      });
    };

    let activePopup: Popup | null = null;
    const handlePointClick = (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      const props = feature?.properties;
      if (!props) return;

      activePopup?.remove();

      activePopup = new Popup({
        closeButton: true,
        closeOnClick: true,
        className: 'tactical-fire-popup',
        offset: 8,
      })
        .setLngLat(e.lngLat)
        .setHTML(`
          <div style="background:#090d0b; color:#fff; padding:10px 12px; border-radius:10px; border:1px solid rgba(249,115,22,0.5); font-family:sans-serif; min-width:180px; box-shadow:0 10px 25px rgba(0,0,0,0.85);">
            <div style="display:flex; align-items:center; gap:6px; font-weight:bold; font-size:11px; color:#fdba74;">
              <span>🔥 Foyer thermique satellitaire</span>
            </div>
            <div style="margin-top:6px; font-size:12px; color:#f1f5f9;">
              Puissance (FRP) : <strong style="color:#fde047;">${props.frp} MW</strong>
            </div>
            <div style="font-size:10px; color:#94a3b8; margin-top:3px;">
              Brillance : ${props.brightness} K
            </div>
            <div style="font-size:10px; color:#94a3b8; margin-top:3px;">
              Confiance : ${props.confidence}% · ${props.date} ${props.time}
            </div>
            <div style="margin-top:6px; font-size:9px; color:#fdba74; opacity:0.8; border-top:1px solid rgba(255,255,255,0.08); padding-top:4px;">
              NASA FIRMS · MODIS C6.1 NRT
            </div>
          </div>
        `)
        .addTo(map);
    };

    const handleMouseEnter = () => {
      map.getCanvas().style.cursor = 'pointer';
    };
    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = '';
    };

    map.on('click', CLUSTERS_LAYER_ID, handleClusterClick);
    map.on('click', POINTS_LAYER_ID, handlePointClick);
    map.on('mouseenter', CLUSTERS_LAYER_ID, handleMouseEnter);
    map.on('mouseleave', CLUSTERS_LAYER_ID, handleMouseLeave);
    map.on('mouseenter', POINTS_LAYER_ID, handleMouseEnter);
    map.on('mouseleave', POINTS_LAYER_ID, handleMouseLeave);

    return () => {
      activePopup?.remove();
      map.off('click', CLUSTERS_LAYER_ID, handleClusterClick);
      map.off('click', POINTS_LAYER_ID, handlePointClick);
      map.off('mouseenter', CLUSTERS_LAYER_ID, handleMouseEnter);
      map.off('mouseleave', CLUSTERS_LAYER_ID, handleMouseLeave);
      map.off('mouseenter', POINTS_LAYER_ID, handleMouseEnter);
      map.off('mouseleave', POINTS_LAYER_ID, handleMouseLeave);
    };
  }, [showFires, firmsData, isLoaded]);

  // Manage USGS & GDACS Disasters Layer (RAD-402)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;

    const SOURCE_ID = 'disasters-events-source';
    const WAVES_LAYER_ID = 'disasters-wave-layer';
    const POINTS_LAYER_ID = 'disasters-point-layer';

    if (!showDisasters || !disastersData) {
      if (map.getLayer(WAVES_LAYER_ID)) {
        map.setLayoutProperty(WAVES_LAYER_ID, 'visibility', 'none');
      }
      if (map.getLayer(POINTS_LAYER_ID)) {
        map.setLayoutProperty(POINTS_LAYER_ID, 'visibility', 'none');
      }
      return;
    }

    const existingSource = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    if (existingSource) {
      existingSource.setData(disastersData);
      map.setLayoutProperty(WAVES_LAYER_ID, 'visibility', 'visible');
      map.setLayoutProperty(POINTS_LAYER_ID, 'visibility', 'visible');
      return;
    }

    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: disastersData,
    });

    // Outer seismic/cyclone wave ripple halo
    map.addLayer({
      id: WAVES_LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      paint: {
        'circle-radius': ['*', ['get', 'radius'], 1.9],
        'circle-color': ['get', 'glowColor'],
        'circle-opacity': 0.35,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': ['get', 'color'],
        'circle-stroke-opacity': 0.7,
        'circle-blur': 0.25,
      },
    });

    // Core disaster event symbol
    map.addLayer({
      id: POINTS_LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      paint: {
        'circle-radius': ['get', 'radius'],
        'circle-color': ['get', 'color'],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-opacity': 0.9,
        'circle-opacity': 0.95,
      },
    });

    let activePopup: Popup | null = null;
    const handleDisasterClick = (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      const props = feature?.properties;
      if (!props) return;

      activePopup?.remove();

      const isEarthquake = props.eventType === 'earthquake';
      const eventIcon =
        props.eventType === 'earthquake'
          ? '⚡'
          : props.eventType === 'cyclone'
          ? '🌀'
          : props.eventType === 'flood'
          ? '🌊'
          : props.eventType === 'volcano'
          ? '🌋'
          : '⚠️';

      const severityBadge =
        props.severity === 'red'
          ? '<span style="background:rgba(239,68,68,0.25); color:#fca5a5; border:1px solid rgba(239,68,68,0.5); border-radius:4px; padding:1px 5px; font-size:9px; font-weight:bold;">ALERTE ROUGE</span>'
          : props.severity === 'orange'
          ? '<span style="background:rgba(249,115,22,0.25); color:#fed7aa; border:1px solid rgba(249,115,22,0.5); border-radius:4px; padding:1px 5px; font-size:9px; font-weight:bold;">ALERTE ORANGE</span>'
          : '<span style="background:rgba(234,179,8,0.2); color:#fef08a; border:1px solid rgba(234,179,8,0.4); border-radius:4px; padding:1px 5px; font-size:9px; font-weight:bold;">VIGILANCE</span>';

      const detailsHtml = isEarthquake
        ? `
          <div style="margin-top:6px; font-size:12px; color:#f1f5f9;">
            Magnitude : <strong style="color:#fde047;">M ${props.magnitude ?? '—'}</strong>
            ${props.depthKm !== undefined ? ` · Profondeur : ${props.depthKm} km` : ''}
          </div>
        `
        : `
          <div style="margin-top:6px; font-size:11px; color:#f1f5f9;">
            ${props.description ? `<p style="margin:0 0 4px 0; color:#cbd5e1;">${props.description}</p>` : ''}
            ${props.countryName ? `<span>Zone : <strong>${props.countryName}</strong></span>` : ''}
          </div>
        `;

      activePopup = new Popup({
        closeButton: true,
        closeOnClick: true,
        className: 'tactical-disaster-popup',
        offset: 10,
      })
        .setLngLat(e.lngLat)
        .setHTML(`
          <div style="background:#090d0b; color:#fff; padding:10px 14px; border-radius:10px; border:1px solid ${props.color}80; font-family:sans-serif; min-width:210px; max-width:280px; box-shadow:0 12px 30px rgba(0,0,0,0.9);">
            <div style="display:flex; align-items:center; justify-content:space-between; gap:6px;">
              <span style="font-weight:bold; font-size:11px; color:${props.color};">${eventIcon} ${String(props.eventType).toUpperCase()}</span>
              ${severityBadge}
            </div>
            <div style="margin-top:5px; font-size:12px; font-weight:bold; color:#fff; line-height:1.3;">
              ${props.title}
            </div>
            ${detailsHtml}
            <div style="margin-top:8px; display:flex; align-items:center; justify-content:space-between; font-size:9px; color:#94a3b8; border-top:1px solid rgba(255,255,255,0.08); padding-top:6px;">
              <span>Source : ${props.source}</span>
              <a href="${props.sourceUrl}" target="_blank" rel="noopener noreferrer" style="color:#38bdf8; text-decoration:none; font-weight:bold;">Rapport officiel ↗</a>
            </div>
          </div>
        `)
        .addTo(map);
    };

    const handleMouseEnter = () => {
      map.getCanvas().style.cursor = 'pointer';
    };
    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = '';
    };

    map.on('click', POINTS_LAYER_ID, handleDisasterClick);
    map.on('click', WAVES_LAYER_ID, handleDisasterClick);
    map.on('mouseenter', POINTS_LAYER_ID, handleMouseEnter);
    map.on('mouseleave', POINTS_LAYER_ID, handleMouseLeave);
    map.on('mouseenter', WAVES_LAYER_ID, handleMouseEnter);
    map.on('mouseleave', WAVES_LAYER_ID, handleMouseLeave);

    return () => {
      activePopup?.remove();
      map.off('click', POINTS_LAYER_ID, handleDisasterClick);
      map.off('click', WAVES_LAYER_ID, handleDisasterClick);
      map.off('mouseenter', POINTS_LAYER_ID, handleMouseEnter);
      map.off('mouseleave', POINTS_LAYER_ID, handleMouseLeave);
      map.off('mouseenter', WAVES_LAYER_ID, handleMouseEnter);
      map.off('mouseleave', WAVES_LAYER_ID, handleMouseLeave);
    };
  }, [showDisasters, disastersData, isLoaded]);

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

  if (!isSupported) {
    return (
      <div className="flex h-[480px] w-full flex-col items-center justify-center rounded-xl bg-zinc-950 p-6 text-center text-zinc-400">
        <Compass className="mb-3 h-10 w-10 text-amber-400" />
        <p className="text-sm font-bold text-white">WebGL non supporté</p>
        <p className="mt-1 text-xs">
          Votre navigateur ou affichage ne supporte pas l’accélération matérielle WebGL.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-white/[0.08] bg-[#070b09]">
      {/* Tactical Header Overlay */}
      <div className="absolute left-3 top-3 z-10 flex flex-wrap items-center gap-2">
        <div className="pointer-events-none flex items-center gap-2 rounded-lg border border-white/10 bg-black/75 px-2.5 py-1 text-[10px] font-mono tracking-wider text-emerald-300 backdrop-blur-md">
          <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>{isGlobeMode ? 'GLOBE 3D' : 'PLAN 2D'}</span>
        </div>

        {/* 3D Globe Projection Toggle */}
        <button
          type="button"
          onClick={handleToggleGlobe}
          title={isGlobeMode ? 'Basculer en vue 2D tactique (Mercator)' : 'Basculer en vue Globe 3D immersif'}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-bold shadow-lg backdrop-blur-md transition ${
            isGlobeMode
              ? 'border-emerald-400/60 bg-emerald-500/25 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.35)] ring-1 ring-emerald-400/40'
              : 'border-white/10 bg-black/75 text-zinc-400 hover:border-emerald-400/30 hover:text-zinc-200'
          }`}
        >
          <Globe2
            aria-hidden="true"
            className={`h-3 w-3 ${isGlobeMode ? 'text-emerald-400' : 'text-zinc-500'}`}
          />
          <span>Globe 3D</span>
          <span className="text-[9px] uppercase font-black">{isGlobeMode ? 'ON' : 'OFF'}</span>
        </button>

        {/* NASA FIRMS Toggle Button */}
        <button
          type="button"
          onClick={handleToggleFires}
          title="Afficher/masquer les feux de brousse actifs détectés par satellite NASA FIRMS"
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-bold shadow-lg backdrop-blur-md transition ${
            showFires
              ? 'border-orange-500/60 bg-orange-500/25 text-orange-200 shadow-[0_0_15px_rgba(249,115,22,0.35)] ring-1 ring-orange-400/40'
              : 'border-white/10 bg-black/75 text-zinc-400 hover:border-orange-400/30 hover:text-zinc-200'
          }`}
        >
          <Flame
            aria-hidden="true"
            className={`h-3 w-3 ${showFires ? 'text-orange-400 animate-pulse' : 'text-zinc-500'}`}
          />
          <span>Feux NASA</span>
          {firmsLoading ? (
            <span className="text-[9px] text-orange-300">chargement…</span>
          ) : showFires && firmsData ? (
            <span className="rounded bg-orange-400/30 px-1 py-0.2 text-[8px] font-black text-orange-200">
              {firmsData.features.length}
            </span>
          ) : (
            <span className="text-[9px] text-zinc-500 uppercase">{showFires ? 'ON' : 'OFF'}</span>
          )}
        </button>

        {/* USGS & GDACS Disasters Toggle Button */}
        <button
          type="button"
          onClick={handleToggleDisasters}
          title="Afficher/masquer les séismes USGS et alertes catastrophes GDACS"
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-bold shadow-lg backdrop-blur-md transition ${
            showDisasters
              ? 'border-yellow-500/60 bg-yellow-500/25 text-yellow-200 shadow-[0_0_15px_rgba(234,179,8,0.35)] ring-1 ring-yellow-400/40'
              : 'border-white/10 bg-black/75 text-zinc-400 hover:border-yellow-400/30 hover:text-zinc-200'
          }`}
        >
          <AlertTriangle
            aria-hidden="true"
            className={`h-3 w-3 ${showDisasters ? 'text-yellow-400 animate-pulse' : 'text-zinc-500'}`}
          />
          <span>Séismes & GDACS</span>
          {disastersLoading ? (
            <span className="text-[9px] text-yellow-300">chargement…</span>
          ) : showDisasters && disastersData ? (
            <span className="rounded bg-yellow-400/30 px-1 py-0.2 text-[8px] font-black text-yellow-200">
              {disastersData.features.length}
            </span>
          ) : (
            <span className="text-[9px] text-zinc-500 uppercase">{showDisasters ? 'ON' : 'OFF'}</span>
          )}
        </button>

        {firmsError && showFires && (
          <span className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[9px] text-red-300 backdrop-blur-md">
            {firmsError}
          </span>
        )}

        {disastersError && showDisasters && (
          <span className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[9px] text-red-300 backdrop-blur-md">
            {disastersError}
          </span>
        )}
      </div>

      {/* Recenter Button */}
      <button
        type="button"
        onClick={handleRecenter}
        title="Recadrer sur l'Afrique"
        aria-label="Recadrer la carte sur le continent africain"
        className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/75 px-2.5 py-1.5 text-[11px] font-bold text-zinc-200 shadow-xl backdrop-blur-md transition hover:border-emerald-400/40 hover:bg-black hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
      >
        <RotateCcw className="h-3 w-3 text-emerald-400" />
        <span>Recadrer</span>
      </button>

      {/* MapLibre WebGL Canvas Container */}
      <div
        ref={mapContainerRef}
        className="h-[460px] sm:h-[520px] w-full"
        style={{ background: '#0a0e0c' }}
      />

      {/* Tactical Map Footer Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] bg-black/40 px-3 py-2 text-[10px] text-zinc-400">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Média source indexé
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border border-dashed border-amber-400" />
            Chaîne TV en direct
          </span>
          {showFires && (
            <span className="inline-flex items-center gap-1.5 text-orange-300">
              <span className="h-2.5 w-2.5 rounded-full bg-orange-500 ring-2 ring-yellow-400/50 shadow-[0_0_8px_#f97316]" />
              Foyer thermique NASA (24h)
            </span>
          )}
          {showDisasters && (
            <span className="inline-flex items-center gap-1.5 text-yellow-300">
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-400 ring-2 ring-red-400/60 shadow-[0_0_8px_#facc15]" />
              Alerte séisme / GDACS
            </span>
          )}
          {isGlobeMode && (
            <span className="inline-flex items-center gap-1.5 text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/40 animate-pulse" />
              Globe 3D actif (Clic droit + glisser pour incliner)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedCountry && (
            <button
              type="button"
              onClick={() => onSelectCountry(null)}
              className="font-semibold text-emerald-300 hover:text-white"
            >
              Effacer le filtre
            </button>
          )}
          <span className="text-zinc-600">Zoom molette & glisser activés</span>
        </div>
      </div>
    </div>
  );
}
