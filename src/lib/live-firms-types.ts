export interface FirmsHotspot {
  id: number;
  latitude: number;
  longitude: number;
  brightness: number;
  frp: number; // Fire Radiative Power (MW)
  confidence: number; // 0-100
  acqDate: string; // YYYY-MM-DD
  acqTime: string; // HH:MM UTC
  dayNight: 'D' | 'N';
}

export interface FirmsGeoJsonFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  properties: {
    id: number;
    brightness: number;
    frp: number;
    confidence: number;
    date: string;
    time: string;
    dayNight: 'D' | 'N';
  };
}

export interface FirmsSnapshot {
  type: 'FeatureCollection';
  metadata: {
    source: string;
    attribution: string;
    totalDetections: number;
    returnedFeatures: number;
    updatedAt: string;
    stale: boolean;
    availability?: import('./radar-data').RadarSourceState[];
  };
  features: FirmsGeoJsonFeature[];
}

export interface FirmsQueryOptions {
  minConfidence?: number;
  limit?: number;
}
