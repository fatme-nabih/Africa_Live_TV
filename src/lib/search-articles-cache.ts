import type { Edition } from './editions';
import type { RadarRssArticle } from './rss-collector-types';
export const SEARCH_ARTICLES_TTL_MS=5*60_000;
export class SearchArticlesCache {
  private cached:{at:number;articles:RadarRssArticle[]}|null=null;
  private pending:Promise<RadarRssArticle[]>|null=null;
  peek(now=Date.now()) {return this.cached&&now-this.cached.at<SEARCH_ARTICLES_TTL_MS ? this.cached.articles : null;}
  async load(fetcher:()=>Promise<RadarRssArticle[]>,clock=Date.now) {
    const current=this.peek(clock());
    if(current) return current;
    if(this.pending) return this.pending;
    this.pending=fetcher().then(articles=>{this.cached={at:clock(),articles};return articles;}).finally(()=>{this.pending=null;});
    return this.pending;
  }
}
export const searchArticlesCache=new SearchArticlesCache();

const editionCaches = new Map<Edition, SearchArticlesCache>([['fr', searchArticlesCache]]);
export function searchCacheForEdition(edition: Edition) {
  let cache = editionCaches.get(edition);
  if (!cache) { cache = new SearchArticlesCache(); editionCaches.set(edition, cache); }
  return cache;
}
