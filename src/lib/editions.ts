import type { WorldRegion } from './world-desk-data';

/**
 * Éditions linguistiques d'Africa Live (EDI-101) : trois rédactions, pas une traduction.
 * Module partagé (proxy, serveur, navigateur) : aucune dépendance d'exécution.
 * Décisions du 11/10/2026 : D2 pays par défaut, D3 chiffres occidentaux en arabe (`ar-u-nu-latn`).
 */
export const EDITION_IDS = ['fr', 'en', 'ar'] as const;
export type Edition = (typeof EDITION_IDS)[number];
export const DEFAULT_EDITION: Edition = 'fr';

/** Cookie du choix d'édition, lu par le proxy (un an, `SameSite=Lax`). */
export const EDITION_COOKIE = 'al_edition';
export const EDITION_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

export type EditionConfig = {
  id: Edition;
  /** Nom écrit dans sa propre langue et son propre alphabet (sélecteur, sans drapeau). */
  label: string;
  dir: 'ltr' | 'rtl';
  /** Locale `Intl` des dates, nombres, pluriels et tris. */
  intl: string;
  /** Traduction des écrans Clerk (`@clerk/localizations`). */
  clerk: 'frFR' | 'enGB' | 'arSA';
  /** Premier pays de l'édition (grille, TV, briefing). */
  defaultCountry: string;
  /** Pays suivants de l'édition, dans l'ordre. */
  secondaryCountries: readonly string[];
  /** Ordre des régions de « Regards sur le monde ». */
  worldOrder: readonly WorldRegion[];
  /** Pays de la météo par défaut quand aucun pays n'est suivi. */
  weatherDefault: string;
};

export const EDITIONS: Readonly<Record<Edition, EditionConfig>> = {
  fr: { id: 'fr', label: 'Français', dir: 'ltr', intl: 'fr-FR', clerk: 'frFR', defaultCountry: 'SN', secondaryCountries: [],
    worldOrder: ['europe', 'ameriques', 'moyen-orient', 'asie-pacifique'], weatherDefault: 'SN' },
  en: { id: 'en', label: 'English', dir: 'ltr', intl: 'en-GB', clerk: 'enGB', defaultCountry: 'NG', secondaryCountries: [],
    worldOrder: ['europe', 'ameriques', 'moyen-orient', 'asie-pacifique'], weatherDefault: 'NG' },
  // D2 : l'Algérie d'abord, le Maroc juste après (une seule ligne à changer pour les inverser).
  ar: { id: 'ar', label: 'العربية', dir: 'rtl', intl: 'ar-u-nu-latn', clerk: 'arSA', defaultCountry: 'DZ', secondaryCountries: ['MA'],
    worldOrder: ['moyen-orient', 'europe', 'ameriques', 'asie-pacifique'], weatherDefault: 'DZ' },
};

export function isEdition(value: unknown): value is Edition {
  return typeof value === 'string' && (EDITION_IDS as readonly string[]).includes(value);
}

/** Valeur du cookie `al_edition` : une édition connue, sinon null (valeur ignorée). */
export function parseEditionCookie(value: string | null | undefined): Edition | null {
  const edition = value?.trim().toLowerCase();
  return isEdition(edition) ? edition : null;
}

/**
 * Éditions dont le dictionnaire existe (`src/i18n/{fr,en,ar}.ts`). Une édition demandée dans `EDITIONS` mais pas encore prête
 * est masquée avec un avertissement, plutôt que servie en français sous une adresse `/en` (EDI-107). E3 a ajouté `en`, E4 `ar`.
 */
export const READY_EDITIONS: readonly Edition[] = ['fr', 'en', 'ar'];

/**
 * Variable serveur `EDITIONS` (liste séparée par des virgules ; défaut `fr`). Le français est toujours actif et toujours premier ;
 * les valeurs inconnues et les éditions pas encore prêtes sont ignorées et renvoyées pour un avertissement.
 */
export function parseEnabledEditions(raw: string | undefined, ready: readonly Edition[] = READY_EDITIONS): { editions: Edition[]; unknown: string[]; notReady: Edition[] } {
  const editions: Edition[] = [DEFAULT_EDITION];
  const unknown: string[] = [];
  const notReady: Edition[] = [];
  for (const token of (raw ?? '').split(',').map(part => part.trim().toLowerCase()).filter(Boolean)) {
    if (!isEdition(token)) { if (!unknown.includes(token)) unknown.push(token); continue; }
    if (!ready.includes(token)) { if (!notReady.includes(token)) notReady.push(token); continue; }
    if (!editions.includes(token)) editions.push(token);
  }
  // Ordre stable, celui du registre : fr, en, ar.
  return { editions: EDITION_IDS.filter(edition => editions.includes(edition)), unknown, notReady };
}

let warned = false;

/** Éditions actives de ce serveur. À fixer à l'identique au build (pages statiques) et à l'exécution (proxy). */
export function enabledEditions(env: Record<string, string | undefined> = process.env): Edition[] {
  const { editions, unknown, notReady } = parseEnabledEditions(env.EDITIONS);
  if ((unknown.length || notReady.length) && !warned) {
    warned = true;
    // Pas de dépendance au journal serveur : ce module est aussi chargé par le proxy et next.config.
    console.warn(JSON.stringify({ timestamp: new Date().toISOString(), level: 'warn', event: 'editions_ignored', unknown: unknown.length, notReady: notReady.join(',') }));
  }
  return editions;
}

export function isEditionEnabled(edition: Edition, enabled: readonly Edition[]) {
  return enabled.includes(edition);
}
