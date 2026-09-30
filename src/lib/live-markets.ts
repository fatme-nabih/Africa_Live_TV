/**
 * Africa Live — Moteur d'Agrégation Marchés Économiques & Ticker OSINT (RAD-403)
 *
 * Collecte et normalise en temps réel :
 * 1. Matières premières stratégiques pour l'Afrique (Cacao Abidjan/Accra, Pétrole Brent, Or).
 * 2. Devises clés (EUR/XOF, EUR/XAF parités fixes BCEAO/BEAC, USD/XOF flottant).
 * 3. Alertes d'urgence combinées (séismes majeurs USGS, alertes GDACS, dépêches chaudes Ecofin/APS).
 *
 * 100 % open data sans clé API propriétaire. Cache mémoire de 15 minutes.
 */

import type {
  LiveMarketsSnapshot,
  MarketCommodity,
  MarketForex,
  MarketTickerAlert,
} from './live-markets-types';
import { getDisasterEventsSnapshot } from './live-disasters';
import { getRadarRss } from './rss-collector';

/** Durée de validité du cache mémoire : 15 minutes */
const MARKETS_CACHE_TTL_MS = 15 * 60 * 1000;
const FETCH_TIMEOUT_MS = 5000;

/** Parité institutionnelle officielle fixe Euro / Franc CFA (Traité UEMOA / CEMAC) */
export const PEGGED_EUR_XOF_RATE = 655.957;
export const PEGGED_EUR_XAF_RATE = 655.957;

interface CachedMarkets {
  snapshot: LiveMarketsSnapshot;
  cachedAt: number;
}

let marketsCache: CachedMarkets | null = null;

/** Définition des matières premières stratégiques africaines suivies */
interface CommodityDefinition {
  symbol: string;
  name: string;
  label: string;
  unit: string;
  defaultPrice: number;
  source: string;
}

const STRATEGIC_COMMODITIES: CommodityDefinition[] = [
  {
    symbol: 'CC=F',
    name: 'Cacao',
    label: 'Cacao (Abidjan / Accra)',
    unit: '$/tonne',
    defaultPrice: 5350,
    source: 'ICE US / Marchés mondiaux',
  },
  {
    symbol: 'BZ=F',
    name: 'Pétrole Brent',
    label: 'Pétrole Brent',
    unit: '$/baril',
    defaultPrice: 98.5,
    source: 'ICE Europe / Mer du Nord',
  },
  {
    symbol: 'GC=F',
    name: 'Or',
    label: 'Or métal (Once)',
    unit: '$/oz',
    defaultPrice: 4180.0,
    source: 'COMEX / Métaux précieux',
  },
];

/**
 * Récupère les cotations d'une matière première via l'API publique de marché
 */
async function fetchCommodityQuote(def: CommodityDefinition): Promise<MarketCommodity> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(def.symbol)}?interval=1d&range=5d`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AfricaLive/1.0',
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const json = await response.json();
    const meta = json?.chart?.result?.[0]?.meta;
    const price = typeof meta?.regularMarketPrice === 'number' ? meta.regularMarketPrice : def.defaultPrice;
    const prevClose = typeof meta?.chartPreviousClose === 'number' ? meta.chartPreviousClose : null;

    let changePercent24h: number | null = null;
    if (typeof meta?.regularMarketChangePercent === 'number') {
      changePercent24h = Number(meta.regularMarketChangePercent.toFixed(2));
    } else if (prevClose !== null && prevClose > 0) {
      changePercent24h = Number((((price - prevClose) / prevClose) * 100).toFixed(2));
    }

    return {
      symbol: def.symbol,
      name: def.name,
      label: def.label,
      price: Number(price.toFixed(2)),
      previousClose: prevClose ? Number(prevClose.toFixed(2)) : null,
      changePercent24h,
      currency: meta?.currency || 'USD',
      unit: def.unit,
      updatedAt: new Date().toISOString(),
      source: def.source,
    };
  } catch {
    // En cas de panne temporaire du fournisseur amont, renvoie la cotation de référence résiliente
    return {
      symbol: def.symbol,
      name: def.name,
      label: def.label,
      price: def.defaultPrice,
      previousClose: def.defaultPrice,
      changePercent24h: 0.0,
      currency: 'USD',
      unit: def.unit,
      updatedAt: new Date().toISOString(),
      source: `${def.source} (Référence)`,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Récupère les taux de change mondiaux (open.er-api.com, gratuit, sans clé)
 * et calcule les parités FCFA UEMOA / CEMAC.
 */
async function fetchForexRates(): Promise<MarketForex[]> {
  const url = 'https://open.er-api.com/v6/latest/USD';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let usdToEur = 0.88;
  let usdToXof = 580.0;
  let isLiveRate = false;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    if (response.ok) {
      const data = await response.json();
      if (data?.result === 'success' && data.rates) {
        if (typeof data.rates.EUR === 'number' && data.rates.EUR > 0) {
          usdToEur = data.rates.EUR;
        }
        if (typeof data.rates.XOF === 'number' && data.rates.XOF > 0) {
          usdToXof = data.rates.XOF;
        } else if (usdToEur > 0) {
          // Calcul dérivé via parité officielle EUR/XOF si XOF n'est pas coté en direct
          usdToXof = (1 / usdToEur) * PEGGED_EUR_XOF_RATE;
        }
        isLiveRate = true;
      }
    }
  } catch {
    // Taux de repli sécurisés
    usdToEur = 0.92;
    usdToXof = (1 / usdToEur) * PEGGED_EUR_XOF_RATE;
  } finally {
    clearTimeout(timeoutId);
  }

  const nowIso = new Date().toISOString();
  const sourceLabel = isLiveRate ? 'BCEAO / Open Rates' : 'Parité officielle / Référence';

  return [
    {
      pair: 'EUR / XOF',
      base: 'EUR',
      quote: 'XOF',
      rate: PEGGED_EUR_XOF_RATE,
      label: 'Franc CFA UEMOA (Taux officiel fixe)',
      isPegged: true,
      updatedAt: nowIso,
      source: 'Banque Centrale des États de l’Afrique de l’Ouest (BCEAO)',
    },
    {
      pair: 'EUR / XAF',
      base: 'EUR',
      quote: 'XAF',
      rate: PEGGED_EUR_XAF_RATE,
      label: 'Franc CFA CEMAC (Taux officiel fixe)',
      isPegged: true,
      updatedAt: nowIso,
      source: 'Banque des États de l’Afrique Centrale (BEAC)',
    },
    {
      pair: 'USD / XOF',
      base: 'USD',
      quote: 'XOF',
      rate: Number(usdToXof.toFixed(2)),
      label: 'Dollar US / Franc CFA (Flottant)',
      isPegged: false,
      updatedAt: nowIso,
      source: sourceLabel,
    },
    {
      pair: 'USD / EUR',
      base: 'USD',
      quote: 'EUR',
      rate: Number(usdToEur.toFixed(4)),
      label: 'Dollar US / Euro',
      isPegged: false,
      updatedAt: nowIso,
      source: sourceLabel,
    },
  ];
}

/**
 * Récupère les alertes chaudes et critiques pour le bandeau défilant :
 * - Séismes M5.0+ ou catastrophes GDACS Orange/Red
 * - Dépêches urgentes éco/politique récentes
 */
async function fetchTickerAlerts(): Promise<MarketTickerAlert[]> {
  const alerts: MarketTickerAlert[] = [];

  try {
    const disastersSnapshot = await getDisasterEventsSnapshot();
    for (const feat of disastersSnapshot.features) {
      const p = feat.properties;
      const isCritical = p.severity === 'red' || (typeof p.magnitude === 'number' && p.magnitude >= 5.5);
      const isWarning = p.severity === 'orange' || (typeof p.magnitude === 'number' && p.magnitude >= 4.8);
      if (isCritical || isWarning) {
        alerts.push({
          id: `disaster-${p.id}`,
          type: 'disaster',
          title: `${p.eventType === 'earthquake' ? 'Séisme' : 'Catastrophe GDACS'} : ${p.title}`,
          severity: isCritical ? 'critical' : 'warning',
          countryCode: p.countryName ?? undefined,
          url: p.sourceUrl,
          timestamp: p.eventDate,
        });
      }
      if (alerts.length >= 4) break;
    }
  } catch {
    // Si indisponible, continue sans bloquer le ticker
  }

  try {
    const rssSnapshot = await getRadarRss();
    const ecoArticles = rssSnapshot.articles
      .filter((a) => a.category === 'Économie' || a.sourceName === 'Agence Ecofin')
      .slice(0, 3);

    for (const art of ecoArticles) {
      alerts.push({
        id: `news-${art.id}`,
        type: 'news',
        title: `[${art.sourceName}] ${art.title}`,
        severity: 'info',
        countryCode: art.countryCode ?? undefined,
        url: art.url,
        timestamp: art.publishedAt,
      });
      if (alerts.length >= 6) break;
    }
  } catch {
    // Continue sans bloquer
  }

  return alerts;
}

/**
 * Point d'entrée principal : récupère la synthèse des marchés et du ticker
 */
export async function getLiveMarkets(options: { forceRefresh?: boolean } = {}): Promise<LiveMarketsSnapshot> {
  const now = Date.now();

  if (!options.forceRefresh && marketsCache && now - marketsCache.cachedAt < MARKETS_CACHE_TTL_MS) {
    return marketsCache.snapshot;
  }

  const [commodities, forex, alerts] = await Promise.all([
    Promise.all(STRATEGIC_COMMODITIES.map((c) => fetchCommodityQuote(c))),
    fetchForexRates(),
    fetchTickerAlerts(),
  ]);

  const snapshot: LiveMarketsSnapshot = {
    commodities,
    forex,
    alerts,
    updatedAt: new Date().toISOString(),
    disclaimer: 'Cotations de référence et cours indicatifs à usage informatif. Parités officielles BCEAO/BEAC.',
  };

  marketsCache = {
    snapshot,
    cachedAt: now,
  };

  return snapshot;
}

/**
 * Réinitialise le cache mémoire (utile pour les tests unitaires)
 */
export function clearMarketsCache(): void {
  marketsCache = null;
}

/**
 * Formate un prix avec sa devise et son unité pour affichage dans le bandeau
 */
export function formatMarketPrice(price: number, currency: string, unit: string): string {
  const formattedNumber = new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: price >= 100 ? 2 : 4,
    minimumFractionDigits: 2,
  }).format(price);

  return `${formattedNumber} ${currency} / ${unit.replace('$/', '')}`;
}

/**
 * Formate une variation en pourcentage avec signe (+/-) et couleur associée
 */
export function formatVariation(variation: number | null): { text: string; isPositive: boolean; isNeutral: boolean } {
  if (variation === null || Number.isNaN(variation) || variation === 0) {
    return { text: '0.00 %', isPositive: false, isNeutral: true };
  }

  const sign = variation > 0 ? '+' : '';
  return {
    text: `${sign}${variation.toFixed(2)} %`,
    isPositive: variation > 0,
    isNeutral: false,
  };
}
