import { normalizeRadarDate } from './radar-data';
import { parseFeedXml } from './rss-collector';
import type { FeedConfig } from './rss-collector-types';
import type { FeedDateOptions } from './feeds/types';

/**
 * Vérification des flux RSS des éditions (`npm run feeds:verify`, EDI-001) : fonctions pures, testées sans réseau.
 * Le script `src/scripts/verify-feeds.ts` fait les requêtes ; ce module lit les listes, décode et mesure les réponses.
 * Jamais utilisé par l'application ni par la CI.
 */
export type VerifyEdition = 'fr' | 'en' | 'ar';
export type CandidateRole = 'national' | 'panafrican' | 'international' | 'world';
export type CandidateTier = 'core' | 'complement' | 'recoverable';

export type FeedCandidate = FeedDateOptions & {
  edition: VerifyEdition;
  role: CandidateRole;
  /** Pays du média (ISO), ou null pour un média panafricain ou international. */
  country: string | null;
  name: string;
  url: string;
  /** Rang attribué par l'étude du 11/10, pour signaler les écarts. */
  tier?: CandidateTier;
  region?: string | null;
  origin?: string;
  charset?: string;
};

export type FeedVerdict = 'core' | 'complement' | 'stale' | 'date-issue' | 'ko';

export type FeedMeasure = FeedCandidate & {
  status: number;
  finalUrl: string | null;
  contentType: string;
  charset: string;
  charsetSource: 'header' | 'prolog' | 'default';
  /** Le décodeur demandé n'existe pas : repli UTF-8. */
  charsetFallback: boolean;
  bytes: number;
  /** Au-delà de la limite d'1 Mo du collecteur, l'application refuse le flux. */
  overAppLimit: boolean;
  format: 'rss' | 'atom' | 'rdf' | null;
  /** Articles retenus par le parseur de l'application (titre et lien valides). */
  items: number;
  /** Articles dont l'application comprend la date. */
  dated: number;
  /** Articles des dernières 24 h, avec une tolérance de 3 h d'avance (garde prévue en E2). */
  last24: number;
  /** Articles des dernières 24 h tels que l'application actuelle les montre (aucune avance tolérée). */
  last24Strict: number;
  /** Articles datés dans le futur au moment du relevé. */
  future: number;
  /** Plus grande avance observée, en heures (heure locale étiquetée UTC, le plus souvent). */
  leadHours: number | null;
  /** Âge du plus récent article non futur, en heures. */
  newestAgeHours: number | null;
  /** Premières dates brutes du flux, pour remesurer les formats avant de coder un adaptateur. */
  rawDateSamples: string[];
  /** Fuseaux déclarés dans les dates brutes (`+0000`, `GMT`, `Z`, `none`…). */
  declaredZones: string[];
  language: DetectedLanguage;
  languageMatches: boolean;
  sampleTitle: string;
  etag: boolean;
  lastModified: boolean;
  ms: number;
  error: string | null;
  verdict: FeedVerdict;
  /** Titres relevés (option `--dump-titles`), écrits à part pour préparer les échantillons de test. */
  titles?: { title: string; publishedAt: string | null }[];
};

export type DetectedLanguage = 'fr' | 'en' | 'ar' | 'pt' | 'so' | '?';

const EDITIONS = new Set<VerifyEdition>(['fr', 'en', 'ar']);
const ROLES = new Set<CandidateRole>(['national', 'panafrican', 'international', 'world']);
// Rôles de la liste de l'étude (`feeds-*.txt`) : `africa`, `intl`, `world`.
const LEGACY_ROLES: Record<string, CandidateRole> = { africa: 'national', intl: 'panafrican', world: 'world' };
const TIERS: Record<string, CandidateTier> = { noyau: 'core', core: 'core', 'complément': 'complement', complement: 'complement', 'récupérable': 'recoverable', recoverable: 'recoverable' };

export const APP_FEED_MAX_BYTES = 1_000_000;
const HOUR = 3_600_000;
const LEAD_TOLERANCE_MS = 3 * HOUR;

/** Liste `édition|rôle|pays|nom|url[|clé=valeur…]` (lignes vides et `#` ignorées), compatible avec les listes de l'étude. */
export function parseFeedList(text: string): FeedCandidate[] {
  const rows: FeedCandidate[] = [];
  for (const [index, rawLine] of text.split(/\r?\n/).entries()) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const [edition, role, country, name, url, ...extras] = line.split('|').map(part => part.trim());
    const mappedRole = ROLES.has(role as CandidateRole) ? role as CandidateRole : LEGACY_ROLES[role];
    if (!EDITIONS.has(edition as VerifyEdition) || !mappedRole || !name || !/^https?:\/\//i.test(url ?? '')) {
      throw new Error(`Ligne ${index + 1} invalide : ${line.slice(0, 80)}`);
    }
    const candidate: FeedCandidate = { edition: edition as VerifyEdition, role: mappedRole, country: countryCode(country), name, url };
    for (const extra of extras) {
      const [key, ...value] = extra.split('=');
      const content = value.join('=').trim();
      if (key === 'tier' && TIERS[content]) candidate.tier = TIERS[content];
      if (key === 'region') candidate.region = content || null;
      if (key === 'origin') candidate.origin = content;
    }
    rows.push(candidate);
  }
  return rows;
}

function countryCode(value: string | undefined): string | null {
  const code = (value ?? '').toUpperCase();
  return /^[A-Z]{2}$/.test(code) && code !== 'AF' ? code : null;
}

/**
 * Annexes A (anglais) et B (arabe) de l'étude : chaque tableau dont une colonne s'appelle « Flux ».
 * A.1/B.1 → presse nationale, A.2/B.2 → panafricain, A.3/B.3 → monde.
 */
export function parseStudyAnnexes(markdown: string): FeedCandidate[] {
  const rows: FeedCandidate[] = [];
  let edition: VerifyEdition | null = null, role: CandidateRole | null = null, header: string[] | null = null;
  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();
    const annex = /^##\s+Annexe\s+([A-Z])/i.exec(line);
    if (annex) { edition = annex[1] === 'A' ? 'en' : annex[1] === 'B' ? 'ar' : null; role = null; header = null; continue; }
    const section = /^###\s+([AB])\.(\d)/.exec(line);
    if (section) { role = (['national', 'panafrican', 'world'] as const)[Number(section[2]) - 1] ?? null; header = null; continue; }
    if (!edition || !role || !line.startsWith('|')) { if (!line.startsWith('|')) header = null; continue; }
    const cells = line.slice(1, line.endsWith('|') ? -1 : undefined).split('|').map(cell => cell.trim());
    if (!header) { header = cells.map(cell => cell.toLowerCase()); continue; }
    if (cells.every(cell => /^:?-{3,}:?$/.test(cell))) continue;
    const cell = (name: string) => { const position = header!.indexOf(name); return position >= 0 ? cells[position] : undefined; };
    const url = cell('flux');
    if (!url || !/^https?:\/\//.test(url)) continue;
    // Sans colonne « Rang » (B.2, B.3), un complément est signalé dans la remarque.
    const tier = TIERS[(cell('rang') ?? (/compl[ée]ment/i.test(cell('remarque') ?? '') ? 'complement' : 'noyau')).toLowerCase()];
    rows.push({ edition, role, country: countryCode(cell('pays')), name: cell('source') ?? url, url, ...(tier ? { tier } : {}),
      ...(cell('région') ? { region: cell('région') } : {}), ...(cell('origine') ? { origin: cell('origine') } : {}) });
  }
  return rows;
}

/** Encodage déclaré : en-tête HTTP, puis prologue XML, sinon UTF-8. */
export function detectCharset(contentType: string | null, head: string): { charset: string; source: FeedMeasure['charsetSource'] } {
  const header = /charset\s*=\s*["']?([\w.:-]+)/i.exec(contentType ?? '');
  if (header) return { charset: header[1].toLowerCase(), source: 'header' };
  const prolog = /<\?xml[^>]*encoding\s*=\s*["']([\w.:-]+)["']/i.exec(head);
  if (prolog) return { charset: prolog[1].toLowerCase(), source: 'prolog' };
  return { charset: 'utf-8', source: 'default' };
}

export function decodeFeedBytes(bytes: Uint8Array, charset: string): { text: string; fallback: boolean } {
  try {
    return { text: new TextDecoder(charset).decode(bytes), fallback: false };
  } catch {
    return { text: new TextDecoder().decode(bytes), fallback: true };
  }
}

export function feedFormat(xml: string): FeedMeasure['format'] {
  if (/<rdf:RDF[\s>]/i.test(xml)) return 'rdf';
  if (/<feed[\s>]/i.test(xml)) return 'atom';
  if (/<rss[\s>]/i.test(xml)) return 'rss';
  return null;
}

/** Langue majoritaire des titres : part de lettres arabes, puis mots-outils latins. */
export function detectLanguage(titles: string[]): DetectedLanguage {
  const text = titles.join(' ');
  const letters = text.replace(/[^\p{L}]/gu, '');
  if (!letters) return '?';
  const arabic = (text.match(/[؀-ۿݐ-ݿ]/g) ?? []).length / letters.length;
  if (arabic > 0.5) return 'ar';
  const padded = ' ' + text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ') + ' ';
  const count = (words: string[]) => words.reduce((total, word) => total + padded.split(' ' + word + ' ').length - 1, 0);
  const scores: [DetectedLanguage, number][] = [
    ['en', count(['the', 'of', 'and', 'to', 'in', 'for', 'on', 'with', 'is', 'at', 'as', 'after', 'over', 'says'])],
    ['fr', count(['le', 'la', 'les', 'des', 'du', 'une', 'et', 'pour', 'dans', 'sur', 'est', 'au', 'aux', 'avec'])],
    ['pt', count(['o', 'os', 'da', 'do', 'das', 'dos', 'em', 'para', 'com', 'não', 'uma'])],
    ['so', count(['iyo', 'oo', 'ka', 'ku', 'ee', 'u', 'waxaa', 'kale', 'dalka', 'ayaa'])],
  ];
  scores.sort((a, b) => b[1] - a[1]);
  return scores[0][1] > 0 && scores[0][1] > scores[1][1] ? scores[0][0] : '?';
}

/** Première date brute de chaque article (`pubDate`, `dc:date`, `published`, sinon `updated`). */
export function rawItemDates(xml: string): string[] {
  const items = xml.match(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi) ?? [];
  return items.flatMap(item => {
    const match = /<(pubDate|dc:date|published)[^>]*>([\s\S]*?)<\/\1>/i.exec(item) ?? /<(updated)[^>]*>([\s\S]*?)<\/\1>/i.exec(item);
    const value = match?.[2].replace(/<!\[CDATA\[|\]\]>/g, '').trim();
    return value ? [value] : [];
  });
}

/** Fuseau écrit après l'heure (`+0000`, `+01:00`, `GMT`, `Z`), sinon `none` (« 17:24 | 11-10-2026 » n'en a pas). */
export function declaredZone(raw: string): string {
  const zone = /\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?\s*(?:([+-]\d{2}:?\d{2})|(Z|GMT|UTC|[A-Z]{3,4}))\s*$/.exec(raw.trim());
  return zone ? (zone[1] ?? zone[2]).replace(':', '') : 'none';
}

export function classifyFeed(measure: Pick<FeedMeasure, 'status' | 'format' | 'items' | 'dated' | 'last24' | 'future' | 'leadHours' | 'newestAgeHours' | 'error'>): FeedVerdict {
  if (measure.error || measure.status !== 200 || !measure.format || measure.items === 0) return 'ko';
  if (measure.dated === 0) return 'date-issue';
  // Toutes les dates en avance de 3 h au plus : heure locale étiquetée UTC, le flux est frais (Masrawy, Cairo24).
  const age = measure.newestAgeHours ?? (measure.future > 0 && (measure.leadHours ?? Infinity) <= 3 ? 0 : null);
  if (age === null || age > 72) return 'stale';
  return measure.last24 >= 3 && age < 24 ? 'core' : 'complement';
}

type ResponseFacts = { status: number; finalUrl: string | null; contentType: string | null; etag: boolean; lastModified: boolean; ms: number };

/** Mesure d'une réponse déjà reçue. `now` est passé pour rendre la mesure reproductible. */
export function analyzeFeed(candidate: FeedCandidate, bytes: Uint8Array, facts: ResponseFacts, now: number, keepTitles = false): FeedMeasure {
  const head = new TextDecoder('latin1').decode(bytes.slice(0, 400));
  const { charset, source } = detectCharset(facts.contentType, head);
  const { text: xml, fallback } = decodeFeedBytes(bytes, charset);
  const format = feedFormat(xml);
  const config: FeedConfig = { id: 'verify', edition: candidate.edition, origin: candidate.origin ?? 'verify', role: candidate.role === 'world' ? 'international' : candidate.role, name: candidate.name, domain: 'verify.invalid', url: facts.finalUrl ?? candidate.url,
    defaultCountry: candidate.country, editorialScope: candidate.role === 'national' ? 'africa' : 'international', category: 'verify', enabled: true,
    timeZone: candidate.timeZone, wallClockTimeZone: candidate.wallClockTimeZone, dateFormat: candidate.dateFormat };
  const articles = format ? parseFeedXml(xml, config, facts.finalUrl ?? candidate.url) : [];
  const times = articles.map(article => normalizeRadarDate(article.publishedAt)).filter((date): date is string => !!date).map(date => Date.parse(date));
  const future = times.filter(time => time > now);
  const past = times.filter(time => time <= now);
  const raw = format ? rawItemDates(xml) : [];
  const language = detectLanguage(articles.slice(0, 15).map(article => article.title));
  const measure = {
    ...candidate,
    status: facts.status,
    finalUrl: facts.finalUrl && facts.finalUrl !== candidate.url ? facts.finalUrl : null,
    contentType: (facts.contentType ?? '').split(';')[0].trim(),
    charset, charsetSource: source, charsetFallback: fallback,
    bytes: bytes.byteLength, overAppLimit: bytes.byteLength > APP_FEED_MAX_BYTES,
    format,
    items: articles.length,
    dated: times.length,
    last24: times.filter(time => time >= now - 24 * HOUR && time <= now + LEAD_TOLERANCE_MS).length,
    last24Strict: past.filter(time => time >= now - 24 * HOUR).length,
    future: future.length,
    leadHours: future.length ? round((Math.max(...future) - now) / HOUR) : null,
    newestAgeHours: past.length ? round((now - Math.max(...past)) / HOUR) : null,
    rawDateSamples: raw.slice(0, 3),
    declaredZones: [...new Set(raw.slice(0, 20).map(declaredZone))],
    language,
    languageMatches: language === candidate.edition,
    sampleTitle: articles[0]?.title.slice(0, 120) ?? '',
    etag: facts.etag, lastModified: facts.lastModified, ms: facts.ms,
    error: format ? null : 'FORMAT_INVALIDE',
  };
  return { ...measure, verdict: classifyFeed(measure),
    ...(keepTitles ? { titles: articles.map(article => ({ title: article.title, publishedAt: article.publishedAt })) } : {}) };
}

export function failedMeasure(candidate: FeedCandidate, error: string, ms: number, status = 0): FeedMeasure {
  const measure = { ...candidate, status, finalUrl: null, contentType: '', charset: '', charsetSource: 'default' as const, charsetFallback: false,
    bytes: 0, overAppLimit: false, format: null, items: 0, dated: 0, last24: 0, last24Strict: 0, future: 0, leadHours: null, newestAgeHours: null,
    rawDateSamples: [], declaredZones: [], language: '?' as const, languageMatches: false, sampleTitle: '', etag: false, lastModified: false, ms, error };
  return { ...measure, verdict: 'ko' };
}

const round = (value: number) => Math.round(value * 10) / 10;

/** Relevé de l'étude du 11/10 (`result-*.json`) : seuls ces champs servent à la comparaison. */
export type StudyResult = { url: string; status?: number; valid?: boolean; items?: number; last24?: number; ageH?: number | null; lang?: string; finalUrl?: string };

export function studyVerdict(previous: StudyResult): FeedVerdict {
  if (!previous.valid || previous.status !== 200 || !previous.items) return 'ko';
  if (previous.ageH === null || previous.ageH === undefined) return 'date-issue';
  if (previous.ageH > 72) return 'stale';
  return (previous.last24 ?? 0) >= 3 && previous.ageH < 24 ? 'core' : 'complement';
}

export type FeedDrift = { url: string; name: string; changes: string[] };

/** Écarts entre le relevé courant et le rang de l'étude (ou un relevé précédent). */
export function compareMeasures(current: FeedMeasure[], previous: StudyResult[]): FeedDrift[] {
  const byUrl = new Map(previous.map(row => [row.url, row]));
  const drifts: FeedDrift[] = [];
  for (const measure of current) {
    const changes: string[] = [];
    const before = byUrl.get(measure.url) ?? (measure.finalUrl ? byUrl.get(measure.finalUrl) : undefined);
    const expected = measure.tier === 'core' ? 'core' : measure.tier === 'complement' ? 'complement' : measure.tier === 'recoverable' ? 'date-issue' : before ? studyVerdict(before) : null;
    if (expected && expected !== measure.verdict) changes.push(`rang ${expected} → ${measure.verdict}`);
    if (before && before.status !== measure.status) changes.push(`statut ${before.status ?? '-'} → ${measure.status}`);
    if (before && (before.finalUrl || null) !== measure.finalUrl && measure.finalUrl) changes.push(`redirection → ${measure.finalUrl}`);
    if (measure.items > 0 && !measure.languageMatches) changes.push(`langue ${measure.language} (attendu ${measure.edition})`);
    if (measure.leadHours !== null && measure.leadHours > 0.25) changes.push(`avance ${measure.leadHours} h`);
    if (measure.charsetFallback) changes.push(`encodage inconnu ${measure.charset} → UTF-8`);
    if (measure.overAppLimit) changes.push(`taille ${Math.round(measure.bytes / 1024)} Ko > 1 Mo`);
    if (changes.length) drifts.push({ url: measure.url, name: measure.name, changes });
  }
  return drifts;
}
