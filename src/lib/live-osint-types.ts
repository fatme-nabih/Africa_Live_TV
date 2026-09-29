export type RadarCountry = {
  code: string;
  name: string;
  region: string;
  latitude: number;
  longitude: number;
};

export type RadarArticle = {
  title: string;
  url: string;
  domain: string;
  indexedAt: string;
  countryCode: string | null;
};

export type RadarNewsSnapshot = {
  articles: RadarArticle[];
  countries: RadarCountry[];
  updatedAt: string;
  stale: boolean;
};
