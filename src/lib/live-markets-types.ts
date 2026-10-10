/**
 * Africa Live — Types du Ticker Marchés Économiques & Devises (RAD-403)
 *
 * Données de matières premières stratégiques africaines, devises clés (FCFA, EUR, USD)
 * et alertes d'urgence agrégées pour le bandeau défilant du cockpit radar.
 */

export interface MarketCommodity {
  /** Identifiant ou symbole de marché (ex: CC=F, BZ=F, GC=F) */
  symbol: string;
  /** Nom usuel en français */
  name: string;
  /** Libellé court (ex: Cacao Abidjan/Accra, Pétrole Brent, Or) */
  label: string;
  /** Prix actuel normalisé */
  price: number;
  /** Prix de clôture précédente pour calcul de variation */
  previousClose: number | null;
  /** Horodatage de la bougie de la séance précédente ; ce n'est pas son heure de clôture. */
  previousCloseAt?: string | null;
  /** Variation depuis la séance précédente ; nom historique conservé pour les consommateurs. */
  changePercent24h: number | null;
  /** Devise de cotation (ex: USD) */
  currency: string;
  /** Unité de cotation (ex: $/tonne, $/baril, $/oz) */
  unit: string;
  /** Horodatage ISO de la dernière cotation */
  updatedAt: string;
  /** Source de cotation (ex: Marchés Internationaux / ICE / Yahoo Finance) */
  source: string;
}

export interface MarketForex {
  /** Paire de devises (ex: EUR/XOF, USD/XOF, USD/EUR) */
  pair: string;
  /** Devise de base (ex: EUR) */
  base: string;
  /** Devise de contrepartie (ex: XOF) */
  quote: string;
  /** Taux de change */
  rate: number;
  /** Libellé explicatif (ex: Franc CFA UEMOA, Franc CFA CEMAC) */
  label: string;
  /** Indique si le taux est à parité fixe officielle (ex: EUR/FCFA = 655.957) */
  isPegged: boolean;
  /** Horodatage ISO du taux */
  updatedAt: string;
  /** Source de cotation (ex: BCEAO / BEAC / Open Exchange Rates) */
  source: string;
}

export interface MarketTickerAlert {
  /** Identifiant unique de l'alerte */
  id: string;
  /** Nature de l'alerte : séisme, catastrophe GDACS ou dépêche urgente */
  type: 'disaster' | 'news';
  /** Titre ou message court pour le bandeau */
  title: string;
  /** Niveau de sévérité */
  severity: 'critical' | 'warning' | 'info';
  /** Code pays ISO si applicable (ex: SN, CD, MG) */
  countryCode?: string;
  /** Lien source externe */
  url?: string;
  /** Horodatage ISO */
  timestamp: string | null;
  scope?: 'Africa' | 'World' | 'unknown';
  source?: string;
  dateKind?: 'publication' | 'event';
}

export interface LiveMarketsSnapshot {
  /** Liste des matières premières stratégiques */
  commodities: MarketCommodity[];
  /** Liste des devises et parités clés */
  forex: MarketForex[];
  /** Alertes chaudes pour le bandeau */
  alerts: MarketTickerAlert[];
  /** Horodatage ISO de la synthèse */
  updatedAt: string;
  /** Mention légale et sources open data */
  disclaimer: string;
  availability?: import('./radar-data').RadarSourceState[];
}
