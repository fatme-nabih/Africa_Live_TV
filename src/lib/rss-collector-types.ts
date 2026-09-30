export type RadarRssArticle = {
  id: string;
  title: string;
  url: string;
  domain: string;
  sourceName: string;
  sourceType: 'rss';
  publishedAt: string;
  countryCode: string | null;
  category: string;
};

export type RssSourceMetric = {
  id: string;
  name: string;
  domain: string;
  count: number;
};

export type RadarRssSnapshot = {
  articles: RadarRssArticle[];
  sources: RssSourceMetric[];
  updatedAt: string;
  stale: boolean;
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
