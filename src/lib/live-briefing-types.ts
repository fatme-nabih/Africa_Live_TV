/**
 * Africa Live — Types du Flash Briefing IA Panafricain (RAD-502)
 *
 * Structure des synthèses de situation 12h à l'échelle continentale ou nationale :
 * Synthèse exécutive, piliers thématiques, indicateurs clés et contexte géomédiatique.
 */

export type BriefingScope = 'continent' | 'country';

export type BriefingStatus = 'normal' | 'vigilance' | 'critical';

export interface BriefingSection {
  /** Clé thématique (ex: geopolitics, economy, hazards, media) */
  id: string;
  /** Titre de la section (ex: 'Politique & Société', 'Économie & Marchés') */
  title: string;
  /** Synthèse narrative concise (2-4 phrases) */
  summary: string;
  /** Faits marquants ou points clés sous forme de puces */
  highlights: string[];
  /** Statut de vigilance */
  status: BriefingStatus;
}

export interface BriefingMetrics {
  /** Nombre total de dépêches et articles analysés */
  articlesAnalyzed: number;
  /** Nombre d'alertes catastrophes/séismes actives */
  alertsActive: number;
  /** Nombre de pays couverts par l'analyse */
  countriesCovered: number;
  /** Nombre de chaînes TV directes disponibles sur la zone */
  channelsOnAir: number;
}

export interface LiveBriefingSnapshot {
  /** Identifiant unique du briefing */
  id: string;
  /** Portée de la synthèse : continentale ou nationale */
  scope: BriefingScope;
  /** Code pays ISO si scope === 'country' (ex: SN, CI, CD) */
  targetCountryCode?: string;
  /** Nom du pays ou 'Continent Africain' */
  targetName: string;
  /** Horodatage ISO de génération */
  generatedAt: string;
  /** Période temporelle couverte (ex: 'Dernières 12 heures') */
  periodCovered: string;
  /** Titre d'actualité ou grand titre du briefing */
  headline: string;
  /** Résumé exécutif stratégique (1 paragraphe percutant) */
  executiveSummary: string;
  /** Sections thématiques détaillées */
  sections: BriefingSection[];
  /** Métriques quantitatives de la synthèse */
  metrics: BriefingMetrics;
  /** Moteur utilisé pour la synthèse */
  engineUsed: 'heuristic-nlp' | 'gemini-ai';
  /** Mention légale et source */
  disclaimer: string;
}
