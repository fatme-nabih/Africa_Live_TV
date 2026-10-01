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
  publishedAt?: string | null;
  id?: string;
  countryBasis?: 'media' | 'inferred_topic';
  countryCode: string | null;
  sourceType?: 'gdelt' | 'rss';
  sourceName?: string;
  category?: string;
};

export type RadarNewsSnapshot = {
  articles: RadarArticle[];
  countries: RadarCountry[];
  updatedAt: string;
  stale: boolean;
  availability?: import('./radar-data').RadarSourceState[];
  undatedArticles?: RadarArticle[];
  window?: ReturnType<typeof import('./radar-data').temporalWindow>['window'];
};
