export type RadarRssArticle = {
  id: string;
  title: string;
  url: string;
  domain: string;
  sourceName: string;
  sourceType: 'rss';
  publishedAt: string | null;
  updatedAt?: string | null;
  countryCode: string | null;
  countryBasis?: 'media' | 'inferred_topic';
  category: string;
};

export type RssSourceMetric = {
  id: string;
  name: string;
  domain: string;
  count: number;
  availability?: import('./radar-data').RadarSourceState;
};

export type RadarRssSnapshot = {
  articles: RadarRssArticle[];
  sources: RssSourceMetric[];
  updatedAt: string;
  stale: boolean;
  partial?: boolean;
  availability?: import('./radar-data').RadarSourceState[];
  undatedArticles?: RadarRssArticle[];
  window?: ReturnType<typeof import('./radar-data').temporalWindow>['window'];
};

export type FeedConfig = {
  id: string;
  name: string;
  domain: string;
  url: string;
  defaultCountry: string | null;
  category: string;
  enabled: boolean;
};
