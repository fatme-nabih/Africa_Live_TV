import type { Page } from '@playwright/test';
import { fixtureRadar, weatherFixture } from './radar-fixture';

// Édition arabe simulée (EDI-404) : titres réels du relevé E0 (src/lib/fixtures/editions/titles-ar.json), aucune requête amont.
export const ARABIC_STORIES = [
  { id: 'ar-dz', title: 'وضعية آيت نوري تتعقّد', sourceName: 'Echorouk', countryCode: 'DZ', category: 'Sport' },
  { id: 'ar-ma', title: 'مهرّب ينقل قناطير من “الكيف” وسط شحنة من الخضر', sourceName: 'Hespress', countryCode: 'MA', category: 'Société' },
  { id: 'ar-tn', title: 'Tunisie : un titre français dans une rédaction arabe', sourceName: 'Nawaat', countryCode: 'TN', category: null },
];

export async function fixtureArabicRadar(page: Page, at = new Date().toISOString()) {
  await fixtureRadar(page, { asOf: at, weatherOk: true });
  await page.route('**/api/live/rss?edition=ar', route => route.fulfill({ json: {
    articles: ARABIC_STORIES.map(story => ({ ...story, url: `https://example.org/${story.id}`, domain: 'example.org', sourceType: 'rss',
      editorialScope: 'africa', countryBasis: 'media', publishedAt: at })),
    sources: [], updatedAt: at, stale: false, availability: [],
  } }));
  await page.route('**/api/live/world*edition=ar*', route => route.fulfill({ json: {
    articles: [
      { id: 'ar-w1', title: 'محادثات جديدة في كييف بشأن وقف إطلاق النار', url: 'https://example.org/ar-w1', sourceName: 'BBC Arabic', origin: 'Royaume-Uni', publishedAt: at, region: 'europe', regionBasis: 'inferred', africanCountries: [], touchesAfrica: false },
      { id: 'ar-w2', title: 'قمة في الرياض تبحث التعاون مع الجزائر', url: 'https://example.org/ar-w2', sourceName: 'RT Arabic', origin: "Russie · média d'État", publishedAt: at, region: 'moyen-orient', regionBasis: 'inferred', africanCountries: ['DZ'], touchesAfrica: true },
    ], updatedAt: at, availability: [],
  } }));
  await page.route('**/api/live/markets*edition=ar*', route => route.fulfill({ json: {
    commodities: [], updatedAt: at, availability: [], disclaimer: '',
    alerts: [{ id: 'ar-alert', title: 'ارتفاع صادرات الفوسفات المغربية', url: 'https://example.org/ar-alert', timestamp: at, type: 'news', severity: 'info', scope: 'Africa', source: 'Hespress', dateKind: 'publication', countryCode: 'MA' }],
    forex: ['DZD', 'MAD', 'TND', 'EGP'].map((quote, i) => ({ pair: 'USD / ' + quote, base: 'USD', quote, rate: 100 + i, label: 'Indicative', isPegged: false, updatedAt: at, source: 'Fixture' })),
  } }));
  await page.route('**/api/live/weather**', route => route.fulfill({ json: weatherFixture(new URL(route.request().url()).searchParams.get('code') ?? 'DZ', Date.parse(at)) }));
}
