import type { RadarArticle } from './live-osint-types';

/**
 * Rubriques du fil (lot R4). Les flux publient 57 libellés hétérogènes et 60 % des dépêches ne portent que l'étiquette
 * générale de leur flux : la rubrique se déduit donc d'abord d'un libellé clair, sinon de mots-clés du titre.
 * Classement indicatif, jamais exclusif : une dépêche peut avoir deux rubriques, et une dépêche non classée reste dans « Toutes ».
 */
export type RadarTopic = 'politique' | 'economie' | 'securite' | 'societe' | 'sport' | 'culture';

export const RADAR_TOPICS: { id: RadarTopic; label: string }[] = [
  { id: 'politique', label: 'Politique' },
  { id: 'economie', label: 'Économie' },
  { id: 'securite', label: 'Sécurité' },
  { id: 'societe', label: 'Société' },
  { id: 'sport', label: 'Sport' },
  { id: 'culture', label: 'Culture' },
];

/** Minuscules, sans accents ni ponctuation, entouré d'espaces : les motifs s'écrivent ` mot ` sans souci de bord de chaîne. */
export function normalizeSearchText(text: string): string {
  return ` ${text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()} `;
}

// Libellés de flux sans ambiguïté (après normalisation).
const CATEGORY_TOPICS: [RegExp, RadarTopic][] = [
  [/ (politique|diplomatie|institutions) /, 'politique'],
  [/ (economie|finance|banques?|bourses?|assurance|marches) /, 'economie'],
  [/ (securite|defense) /, 'securite'],
  [/ (societe|sante|education|faits divers|environnement|justice) /, 'societe'],
  [/ sports? /, 'sport'],
  [/ (culture|arts?|cinema|musique) /, 'culture'],
];

// Mots du titre. Volontairement absents car trompeurs : « but », « mode », « million », « coupe » seul, « éléphants ».
const TITLE_TOPICS: [RegExp, RadarTopic][] = [
  [/ (presidents?|presidente|presidentielles?|elections?|electoral\w*|gouvernements?|ministres?|ministere|assemblee nationale|parlement\w*|deputes?|senat\w*|partis? politiques?|opposition|diplomati\w*|ambassad\w*|conseil constitutionnel|premier ministre|scrutin|referendum|elysee|chef de l etat|transition|cnt|sommet|politique) /, 'politique'],
  [/ (econom\w*|financ\w*|banques?|bancaires?|bourses?|budgets?|budgetaires?|fmi|banque mondiale|investiss\w*|entreprises?|petrol\w*|gaz|commerce|exportations?|importations?|dettes?|inflation|assurances?|milliards?|fcfa|fiscal\w*|impots?|taxes?|agricult\w*|recoltes?|energies?|electricite|minier\w*|mines d or|emplois?|chomage|recrutements?|croissance|pib|douanes?|tourisme|touristique|startups?|numerique|telecoms?) /, 'economie'],
  [/ prix (?!nobel)/, 'economie'],
  [/ (attaques?|attentats?|terroris\w*|jihadis\w*|djihadis\w*|armees?|militaires?|soldats?|securitaire|securite|guerres?|conflits?|rebelles?|rebellion|insurges?|tues?|morts|crash|polices?|gendarmerie|arrestations?|interpelles?|violences?|otages?|explosions?|drones?|coup d etat|enlevements?|enleves?|massacres?) /, 'securite'],
  [/ (sante|hopita\w*|medecins?|medecine|maladies?|epidemies?|vaccin\w*|paludisme|cholera|ebola|mpox|drogues?|education|ecoles?|universit\w*|enseignants?|eleves?|etudiants?|lyceens?|examens?|baccalaureat|femmes|jeunesse|religi\w*|eglises?|mosquees?|justice|tribunal|proces|condamne\w*|inondations?|accidents?|climat\w*|environnement|secheresse|logements?|migrants?|sans papiers|expulsions?|pauvrete|droits? humains?|nobel de medecine) /, 'societe'],
  [/ (football|foot|footballeurs?|matchs?|championnats?|ligue des champions|coupe du monde|coupe d afrique|lions de la teranga|lions indomptables|etalons|aigles du mali|lionceaux|eperviers|super eagles|match amical|amical|mma|boxe|basket\w*|sport\w*|joj|jeux olympiques|olympiques?|stades?|athletisme|athletes?|tournois?|equipe nationale|selectionneur|entraineur|buteurs?|tennis|cyclisme|tour du faso|lutte senegalaise|handball|volley\w*) /, 'sport'],
  [/ (cultur\w*|musiques?|musiciens?|chanteu\w*|films?|cinema|cineastes?|festivals?|albums?|livres?|ecrivains?|romans?|romanciers?|litterature|artistes?|concerts?|theatre|expositions?|patrimoine|fespaco|biennale|dak art|danse|poete|poesie) /, 'culture'],
];

/** Rubriques d'une dépêche, dans l'ordre de RADAR_TOPICS ; tableau vide si rien de sûr. */
export function articleTopics(article: Pick<RadarArticle, 'title' | 'category'>): RadarTopic[] {
  const found = new Set<RadarTopic>();
  const category = normalizeSearchText(article.category ?? '');
  for (const [pattern, topic] of CATEGORY_TOPICS) if (pattern.test(category)) found.add(topic);
  const title = normalizeSearchText(article.title);
  for (const [pattern, topic] of TITLE_TOPICS) if (pattern.test(title)) found.add(topic);
  // « CAN » (Coupe d'Afrique des nations) s'écrit en capitales : on le lit avant normalisation pour ne pas confondre avec « can ».
  if (/(^|[^\p{L}])CAN([^\p{L}]|$)/u.test(article.title)) found.add('sport');
  return RADAR_TOPICS.map(topic => topic.id).filter(id => found.has(id));
}

/** Recherche dans le fil : chaque mot saisi doit apparaître dans le titre, la source, la rubrique ou le pays (sans accents ni casse). */
export function matchesRadarQuery(
  article: Pick<RadarArticle, 'title' | 'sourceName' | 'domain' | 'category'>,
  query: string,
  countryName?: string,
): boolean {
  const words = normalizeSearchText(query).trim().split(' ').filter(Boolean);
  if (words.length === 0) return true;
  const haystack = normalizeSearchText([article.title, article.sourceName ?? article.domain, article.category ?? '', countryName ?? ''].join(' '));
  return words.every(word => haystack.includes(word));
}
