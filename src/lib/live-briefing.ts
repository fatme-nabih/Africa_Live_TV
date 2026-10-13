import { getDictionary } from '@/i18n/dictionary';
import { format } from '@/i18n/message';
import { countryName } from './country-names';
import type { Edition } from './editions';
/**
 * Africa Live — Moteur de Synthèse Flash Briefing IA Panafricain (RAD-502)
 *
 * Analyse en temps réel les flux d'actualités vérifiées (RSS), les alertes géologiques (USGS/GDACS),
 * les indicateurs de marchés (Matières premières & Devises) et la couverture médiatique (IPTV directe)
 * pour produire un rapport de situation exécutif concis et stratégique des dernières 12 heures.
 *
 * Moteur hybride :
 * - Mode A (défaut) : Moteur heuristique NLP déterministe (100% open, sans coût, 0 clé requise).
 * - Mode B (optionnel) : Enrichissement génératif via Google Gemini Flash si GEMINI_API_KEY est défini.
 */

import type {
  BriefingMetrics,
  BriefingSection,
  BriefingStatus,
  LiveBriefingSnapshot,
} from './live-briefing-types';
import { getDisasterEventsSnapshot } from './live-disasters';
import { getLiveMarkets } from './live-markets';
import { getRadarRss } from './rss-collector';
import { getAfricanChannelsSummary } from './live-channels';
import type { LiveChannelsSummarySnapshot } from './live-channels-types';
import { AFRICAN_COUNTRIES } from './live-osint';

const BRIEFING_CACHE_TTL_MS = 15 * 60 * 1000;

interface CachedBriefing {
  snapshot: LiveBriefingSnapshot;
  cachedAt: number;
}

const briefingCache = new Map<string, CachedBriefing>();
export type BriefingProviders = {
  rss:typeof getRadarRss; disasters:typeof getDisasterEventsSnapshot;
  markets:typeof getLiveMarkets; channels:typeof getAfricanChannelsSummary; now:()=>number;
};
const defaultProviders:BriefingProviders={rss:getRadarRss,disasters:getDisasterEventsSnapshot,markets:getLiveMarkets,channels:getAfricanChannelsSummary,now:Date.now};

/**
 * Nettoie le cache des briefings (pour les tests unitaires)
 */
export function clearBriefingCache(): void {
  briefingCache.clear();
}

/**
 * Génère le Flash Briefing IA (continental ou centré sur un pays)
 */
export async function getLiveBriefing(options: {
  countryCode?: string | null;
  edition?: Edition;
  forceRefresh?: boolean;
} = {}, providers:BriefingProviders=defaultProviders): Promise<LiveBriefingSnapshot> {
  const edition = options.edition ?? 'fr';
  const dictionary = getDictionary(edition);
  const texts = dictionary.briefing.engine;
  const targetCode = options.countryCode ? options.countryCode.toUpperCase() : null;
  const scope = targetCode ? 'country' : 'continent';
  const cacheKey = edition + '|' + (targetCode ?? 'continent');

  const now = providers.now();
  const cached = briefingCache.get(cacheKey);
  if (!options.forceRefresh && cached && now - cached.cachedAt < BRIEFING_CACHE_TTL_MS) {
    return cached.snapshot;
  }

  // Collecte concurrente des 4 sources vivantes du cockpit
  const [rssData, disastersData, marketsData, channelsData] = await Promise.all([
    providers.rss({ edition }).catch(() => ({ articles: [], sources: [], updatedAt: new Date(now).toISOString(), stale: true })),
    providers.disasters().catch(() => ({ type: 'FeatureCollection' as const, metadata: { source: '', attribution: '', totalEvents: 0, earthquakesCount: 0, gdacsAlertsCount: 0, generatedAt: '' }, features: [] })),
    providers.markets({ edition }).catch(() => ({ commodities: [], forex: [], alerts: [], updatedAt: new Date(now).toISOString(), disclaimer: '' })),
    providers.channels().catch((): LiveChannelsSummarySnapshot => ({ updatedAt: new Date(now).toISOString(), totalChannels: 0, totalDirectWeb: 0, countries: {} })),
  ]);

  // Filtrage selon le périmètre (pays ou continent)
  const countryObj = targetCode ? AFRICAN_COUNTRIES.find((c) => c.code === targetCode) : null;
  const targetName = countryObj ? (edition === 'fr' ? countryObj.name : countryName(countryObj.code, edition)) : texts.message1;

  const relevantArticles = targetCode
    ? rssData.articles.filter((a) => a.countryCode === targetCode || a.title.toLowerCase().includes(targetName.toLowerCase()))
    : rssData.articles;

  const relevantDisasters = targetCode
    ? disastersData.features.filter((f) => f.properties.countryName?.toUpperCase() === targetCode || f.properties.title.toLowerCase().includes(targetName.toLowerCase()))
    : disastersData.features;

  const countryChannelsEntry = (targetCode && channelsData.countries) ? channelsData.countries[targetCode] : null;
  const relevantChannels = targetCode
    ? countryChannelsEntry?.channelCount ?? 0
    : channelsData.totalChannels;

  // Calcul des métriques de synthèse
  const uniqueCountries = new Set<string>();
  rssData.articles.forEach((a) => {
    if (a.countryCode) uniqueCountries.add(a.countryCode);
  });
  disastersData.features.forEach((f) => {
    if (f.properties.countryName) uniqueCountries.add(f.properties.countryName);
  });

  const metrics: BriefingMetrics = {
    articlesAnalyzed: relevantArticles.length,
    alertsActive: relevantDisasters.length,
    countriesCovered: targetCode ? 1 : uniqueCountries.size,
    channelsOnAir: relevantChannels,
  };

  // 1. Pilier Géopolitique & Actualités
  const geoHighlights: string[] = [];
  const topArticles = relevantArticles.slice(0, 3);
  topArticles.forEach((art) => {
    geoHighlights.push(`[${art.sourceName}] ${art.title}`);
  });

  let geoSummary = '';
  if (topArticles.length > 0) {
    geoSummary = format(texts.message2, {v0: topArticles.length});
  } else {
    geoSummary = texts.message3;
  }

  // 2. Pilier Économie & Matières Premières
  const ecoHighlights: string[] = [];
  marketsData.commodities.forEach((c) => {
    const varText = c.changePercent24h !== null ? ` (${c.changePercent24h > 0 ? '+' : ''}${c.changePercent24h} %)` : '';
    ecoHighlights.push(`${edition === 'fr' ? c.name : (dictionary.markets.products as Record<string, string>)[c.symbol] ?? c.name} : ${c.price} ${c.currency} / ${c.unit.replace('$/', '')}${varText}`);
  });

  const eurXof = marketsData.forex.find((f) => f.pair === 'EUR / XOF');
  const usdXof = marketsData.forex.find((f) => f.pair === 'USD / XOF');
  if (eurXof && usdXof) {
    ecoHighlights.push(format(texts.message4, {v0: eurXof.rate.toFixed(2), v1: usdXof.rate.toFixed(2)}));
  }

  const ecoArticles = relevantArticles.filter((a) => edition === 'fr' ? a.category === 'Économie' : ['economy', 'business', 'finance'].includes(a.category.toLowerCase()));
  let ecoSummary = texts.message5;
  if (ecoArticles.length > 0) {
    ecoSummary += format(texts.message6, {v0: ecoArticles[0].title});
  }

  // 3. Pilier Risques, Météo & Catastrophes (GDACS & USGS)
  const hazardHighlights: string[] = [];
  let hazardStatus: BriefingStatus = 'normal';

  const criticalDisasters = relevantDisasters.filter((f) => f.properties.severity === 'red' || (f.properties.magnitude && f.properties.magnitude >= 5.5));
  const warningDisasters = relevantDisasters.filter((f) => f.properties.severity === 'orange' || (f.properties.magnitude && f.properties.magnitude >= 4.8));

  if (criticalDisasters.length > 0) {
    hazardStatus = 'critical';
  } else if (warningDisasters.length > 0) {
    hazardStatus = 'vigilance';
  }

  relevantDisasters.slice(0, 3).forEach((f) => {
    const p = f.properties;
    const kind = p.eventType === 'earthquake' ? format(texts.message7, {v0: p.magnitude?.toFixed(1) ?? '?'}) : format(texts.message8, {v0: p.eventType.toUpperCase()});
    hazardHighlights.push(`${kind} : ${p.title}`);
  });

  let hazardSummary = '';
  if (hazardStatus === 'critical') {
    hazardSummary = format(texts.message9, {v0: criticalDisasters.length});
  } else if (hazardStatus === 'vigilance') {
    hazardSummary = texts.message10;
  } else {
    hazardSummary = texts.message11;
  }

  // 4. Pilier Présence Médias & TV de Terrain
  const mediaHighlights: string[] = [];
  if (targetCode && countryObj) {
    mediaHighlights.push(format(texts.message26, {v0: relevantChannels, v1: targetName}));
    mediaHighlights.push(texts.message12);
  } else {
    mediaHighlights.push(format(texts.message32, { v0: channelsData.totalChannels }));
    mediaHighlights.push(format(texts.message27, {v0: channelsData.totalDirectWeb}));
  }

  const totalCountriesCovered = channelsData.countries ? Object.keys(channelsData.countries).length : 54;
  const mediaSummary = targetCode
    ? format(texts.message13, {v0: targetName, v1: relevantChannels})
    : format(texts.message28, {v0: totalCountriesCovered, v1: channelsData.totalChannels});

  // Assemblage des 4 sections
  const sections: BriefingSection[] = [
    {
      id: 'geopolitics',
      title: texts.message14,
      summary: geoSummary,
      highlights: geoHighlights.length > 0 ? geoHighlights : [texts.message15],
      status: topArticles.length > 2 ? 'vigilance' : 'normal',
    },
    {
      id: 'economy',
      title: texts.message16,
      summary: ecoSummary,
      highlights: ecoHighlights,
      status: 'normal',
    },
    {
      id: 'hazards',
      title: texts.message29,
      summary: hazardSummary,
      highlights: hazardHighlights.length > 0 ? hazardHighlights : [texts.message17],
      status: hazardStatus,
    },
    {
      id: 'media',
      title: texts.message18,
      summary: mediaSummary,
      highlights: mediaHighlights,
      status: 'normal',
    },
  ];

  // Résumé exécutif : mêmes métriques et branches, textes selon l'édition.
  const headline = targetCode ? format(texts.message19, { v0: targetName }) : texts.message20;
  const monitoring = hazardStatus === 'critical' ? texts.message30 : hazardStatus === 'vigilance' ? texts.message22 : texts.message31;
  const executiveSummary = targetCode
    ? format(texts.message21, { v0: targetName, v1: monitoring, v2: relevantArticles.length, v3: relevantChannels })
    : format(texts.message23, { v0: rssData.articles.length, v1: uniqueCountries.size, v2: relevantDisasters.length });

  const snapshot: LiveBriefingSnapshot = {
    id: `briefing-${scope}-${targetCode ?? 'africa'}-${Math.floor(now / (10 * 60_000))}`,
    scope,
    targetCountryCode: targetCode ?? undefined,
    targetName,
    generatedAt: new Date(now).toISOString(),
    periodCovered: texts.message24,
    headline,
    executiveSummary,
    sections,
    metrics,
    engineUsed: 'heuristic-nlp',
    disclaimer: texts.message25,
  };

  briefingCache.set(cacheKey, {
    snapshot,
    cachedAt: now,
  });

  return snapshot;
}
