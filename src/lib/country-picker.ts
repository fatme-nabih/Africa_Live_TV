// Briques pures du sélecteur de pays : drapeaux, recherche sans accents, pays récents.
export type PickerCountry = { code: string; name: string };

/** Événement émis quand la liste des pays récents change (même onglet). */
export const RECENT_COUNTRIES_EVENT = 'al_recent_countries_change';

/** Drapeau emoji d'un code ISO à deux lettres ; chaîne vide si le code est invalide. */
export function flagEmoji(code: string | null | undefined): string {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return '';
  return [...code.toUpperCase()].map(letter => String.fromCodePoint(0x1f1e6 + letter.charCodeAt(0) - 65)).join('');
}

/** Minuscules, sans accents ni ponctuation : « Côte d’Ivoire » → « cote d ivoire ». */
export function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’'`\-_.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Noms d'usage courants non présents dans le libellé officiel (diaspora, anglophones).
const ALIASES: Record<string, string[]> = {
  CD: ['rdc', 'congo kinshasa', 'zaire'],
  CG: ['congo brazzaville'],
  CF: ['centrafrique', 'rca'],
  CI: ['ivory coast'],
  SZ: ['swaziland'],
  CV: ['cape verde'],
  ZA: ['south africa'],
  EG: ['egypt'],
  ET: ['ethiopia'],
  MA: ['morocco'],
  NG: ['nigeria'],
  TZ: ['tanzania'],
  DZ: ['algeria'],
  TN: ['tunisia'],
  LY: ['libya'],
  UG: ['uganda'],
  SD: ['sudan'],
};

function rank(country: PickerCountry, query: string): number {
  const name = normalizeSearch(country.name);
  if (country.code.toLowerCase() === query) return 0;
  if (name === query) return 0;
  if (name.startsWith(query)) return 1;
  if (name.split(' ').some(word => word.startsWith(query))) return 2;
  const aliases = (ALIASES[country.code] ?? []).map(normalizeSearch);
  if (aliases.some(alias => alias.startsWith(query))) return 2;
  if (name.includes(query)) return 3;
  if (aliases.some(alias => alias.includes(query))) return 4;
  return -1;
}

/** Liste triée par pertinence ; sans requête, ordre alphabétique français. */
export function filterCountries(countries: readonly PickerCountry[], rawQuery: string): PickerCountry[] {
  const query = normalizeSearch(rawQuery);
  const alphabetical = [...countries].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  if (!query) return alphabetical;
  return alphabetical
    .map(country => ({ country, score: rank(country, query) }))
    .filter(entry => entry.score >= 0)
    .sort((a, b) => a.score - b.score)
    .map(entry => entry.country);
}

/** Place le pays en tête de la liste des récents, sans doublon, borné. */
export function pushRecentCountry(recents: readonly string[], code: string, max = 5): string[] {
  return [code, ...recents.filter(item => item !== code)].slice(0, max);
}

/** Lit la valeur stockée en ignorant tout ce qui n'est pas un code connu. */
export function parseRecentCountries(raw: string | null, valid: ReadonlySet<string>, max = 5): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const result: string[] = [];
    for (const item of parsed) {
      if (typeof item === 'string' && valid.has(item) && !seen.has(item)) {
        seen.add(item);
        result.push(item);
      }
    }
    return result.slice(0, max);
  } catch {
    return [];
  }
}
