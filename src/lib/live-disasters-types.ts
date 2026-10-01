export type DisasterEventType =
  | 'earthquake'
  | 'cyclone'
  | 'flood'
  | 'volcano'
  | 'drought'
  | 'other';

export type AlertSeverity = 'green' | 'orange' | 'red';

export interface DisasterEvent {
  id: string;
  source: 'USGS' | 'GDACS';
  eventType: DisasterEventType;
  title: string;
  description?: string;
  latitude: number;
  longitude: number;
  depthKm?: number;
  magnitude?: number;
  severity: AlertSeverity;
  countryName?: string;
  iso3?: string;
  eventDate: string; // ISO 8601
  sourceUrl: string;
}

export interface DisasterGeoJsonFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  properties: {
    id: string;
    source: 'USGS' | 'GDACS';
    eventType: DisasterEventType;
    title: string;
    description?: string;
    magnitude?: number;
    depthKm?: number;
    severity: AlertSeverity;
    countryName?: string;
    eventDate: string;
    sourceUrl: string;
    // Styling attributes for MapLibre WebGL
    color: string;
    glowColor: string;
    radius: number;
  };
}

export interface DisasterEventsSnapshot {
  type: 'FeatureCollection';
  metadata: {
    source: string;
    attribution: string;
    totalEvents: number;
    earthquakesCount: number;
    gdacsAlertsCount: number;
    updatedAt: string;
    stale: boolean;
    disclaimer: string;
    availability?: import('./radar-data').RadarSourceState[];
  };
  features: DisasterGeoJsonFeature[];
}

export interface DisasterQueryOptions {
  minMagnitude?: number;
  eventType?: DisasterEventType;
  limit?: number;
}
