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
  editorialScope: 'africa' | 'international';
  category: string;
  /** Illustration publiée par l'éditeur dans son flux (https). Jamais téléchargée ni stockée par Africa Live. */
  imageUrl?: string;
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
  /** Pont entre éditions (EDI-601) : présent seulement si une autre édition active a un cache encore valide. */
  bridge?: import('./edition-bridge').EditionBridgeEntry[];
};

export type { FeedConfig } from './feeds/types';
