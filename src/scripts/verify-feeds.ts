/**
 * Vérification réelle des flux RSS par édition (EDI-001), hors CI et hors `npm test`.
 *
 *   npm run feeds:verify -- --edition en|ar|fr|all [--list fichier.txt] [--study étude.md] [--compare relevé.json] [--out dossier]
 *                           [--timeout ms] [--concurrency 1-8] [--dump-titles]
 *
 * Sources : registres `src/lib/feeds/*` (désactivés compris), ou annexes explicites / liste `édition|rôle|pays|nom|url`.
 * Même User-Agent, même délai et même parseur que l'application. Sortie JSON dans `.local-logs/feeds-verify/<date>/` (hors Git).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  analyzeFeed,
  compareMeasures,
  failedMeasure,
  parseFeedList,
  parseStudyAnnexes,
  type FeedCandidate,
  type FeedMeasure,
  type StudyResult,
  type VerifyEdition,
} from '../lib/feed-verify';
import { RSS_FEED_HEADERS, RSS_FEED_TIMEOUT_MS } from '../lib/rss-collector';
import { AFRICA_FEEDS, WORLD_FEEDS_BY_EDITION } from '../lib/feeds';

const ROOT = process.cwd();
const STUDY_RESULTS = path.join(ROOT, '.local-logs', 'editions-2026-10-11');
const MAX_CONCURRENCY = 8;
const MAX_READ_BYTES = 5_000_000;

type Options = { editions: VerifyEdition[]; lists: string[]; study: string | null; compare: string[]; out: string | null; timeoutMs: number; concurrency: number; dumpTitles: boolean };

function parseArgs(args: string[]): Options {
  const options: Options = { editions: ['fr', 'en', 'ar'], lists: [], study: null, compare: [], out: null, timeoutMs: RSS_FEED_TIMEOUT_MS, concurrency: MAX_CONCURRENCY, dumpTitles: false };
  for (let index = 0; index < args.length; index++) {
    const flag = args[index], value = args[index + 1];
    const need = () => { if (!value || value.startsWith('--')) throw new Error(`Valeur manquante pour ${flag}`); index++; return value; };
    if (flag === '--edition') {
      const edition = need();
      if (edition === 'all') options.editions = ['fr', 'en', 'ar'];
      else if (edition === 'fr' || edition === 'en' || edition === 'ar') options.editions = [edition];
      else throw new Error(`Édition inconnue : ${edition} (fr, en, ar ou all)`);
    } else if (flag === '--list') options.lists.push(need());
    else if (flag === '--study') options.study = need();
    else if (flag === '--compare') options.compare.push(need());
    else if (flag === '--out') options.out = need();
    else if (flag === '--dump-titles') options.dumpTitles = true;
    else if (flag === '--timeout') options.timeoutMs = Math.max(1_000, Number(need()) || RSS_FEED_TIMEOUT_MS);
    else if (flag === '--concurrency') options.concurrency = Math.min(MAX_CONCURRENCY, Math.max(1, Number(need()) || MAX_CONCURRENCY));
    else throw new Error(`Option inconnue : ${flag}`);
  }
  return options;
}

/** Les mesures utilisent les registres et adaptateurs effectivement livrés, même si l'interface reste masquée. */
function registry(edition: VerifyEdition): FeedCandidate[] {
  return [...AFRICA_FEEDS[edition].map(feed => ({ ...feed, country: feed.defaultCountry })),
    ...WORLD_FEEDS_BY_EDITION[edition].map(feed => ({ ...feed, country: null, role: 'world' as const }))];
}
function candidatesFor(options: Options): { candidates: FeedCandidate[]; sources: string[] } {
  const sources: string[] = [];
  let candidates: FeedCandidate[] = [];
  if (!options.lists.length) {
    if (options.study) { candidates = parseStudyAnnexes(readFileSync(options.study, 'utf8')).filter(r => options.editions.includes(r.edition)); sources.push('annexes explicites'); }
    else { candidates = options.editions.flatMap(registry); sources.push('registres src/lib/feeds (sources désactivées comprises pour leur réévaluation)'); }
  }
  for (const list of options.lists) {
    candidates.push(...parseFeedList(readFileSync(list, 'utf8')).filter(row => options.editions.includes(row.edition)));
    sources.push(`liste ${path.relative(ROOT, path.resolve(list))}`);
  }
  const seen = new Set<string>();
  candidates = candidates.filter(row => { const key = row.edition + '|' + row.url; if (seen.has(key)) return false; seen.add(key); return true; });
  return { candidates, sources };
}

async function readBounded(response: Response): Promise<Uint8Array> {
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_READ_BYTES) { await reader.cancel(); throw new Error('TAILLE_SUPERIEURE_5_MO'); }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

async function measure(candidate: FeedCandidate, timeoutMs: number, keepTitles: boolean): Promise<FeedMeasure> {
  const started = Date.now();
  try {
    const response = await fetch(candidate.url, { cache: 'no-store', redirect: 'follow', signal: AbortSignal.timeout(timeoutMs), headers: RSS_FEED_HEADERS });
    const bytes = await readBounded(response);
    const facts = { status: response.status, finalUrl: response.url || null, contentType: response.headers.get('content-type'),
      etag: response.headers.has('etag'), lastModified: response.headers.has('last-modified'), ms: Date.now() - started };
    if (!response.ok) return failedMeasure(candidate, `HTTP_${response.status}`, facts.ms, response.status);
    return analyzeFeed(candidate, bytes, facts, Date.now(), keepTitles);
  } catch (error) {
    const cause = error instanceof Error ? (error.cause as { code?: string } | undefined)?.code ?? error.name : 'ERREUR';
    const message = error instanceof Error ? error.message.slice(0, 80) : String(error).slice(0, 80);
    return failedMeasure(candidate, `${cause}:${message}`, Date.now() - started);
  }
}

async function measureAll(candidates: FeedCandidate[], options: Options) {
  const results: FeedMeasure[] = new Array(candidates.length);
  let next = 0;
  const worker = async () => { while (next < candidates.length) { const index = next++; results[index] = await measure(candidates[index], options.timeoutMs, options.dumpTitles); } };
  await Promise.all(Array.from({ length: Math.min(options.concurrency, candidates.length) }, worker));
  return results;
}

function previousResults(options: Options, edition: VerifyEdition): StudyResult[] {
  const files = options.compare.length ? options.compare : [path.join(STUDY_RESULTS, `result-${edition}.json`), path.join(STUDY_RESULTS, 'result-extra.json')];
  return files.filter(existsSync).flatMap(file => {
    const raw: unknown = JSON.parse(readFileSync(file, 'utf8'));
    const rows = Array.isArray(raw) ? raw : (raw as { measures?: unknown[] }).measures ?? [];
    return rows.filter((row): row is StudyResult => typeof (row as StudyResult)?.url === 'string');
  });
}

const dakarDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Dakar', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const cell = (value: unknown) => String(value ?? '–').replace(/\|/g, '/');

function summarize(measures: FeedMeasure[]) {
  const verdicts: Record<string, number> = {};
  for (const row of measures) verdicts[row.verdict] = (verdicts[row.verdict] ?? 0) + 1;
  return { feeds: measures.length, verdicts, countries: new Set(measures.filter(row => row.verdict === 'core' || row.verdict === 'complement').map(row => row.country).filter(Boolean)).size,
    leading: measures.filter(row => row.leadHours !== null && row.leadHours > 0.25).length, languageMismatch: measures.filter(row => row.items > 0 && !row.languageMatches).length,
    conditional: measures.filter(row => row.etag || row.lastModified).length, overAppLimit: measures.filter(row => row.overAppLimit).length };
}

function markdown(edition: VerifyEdition, measures: FeedMeasure[], drifts: ReturnType<typeof compareMeasures>, generatedAt: string, sources: string[]) {
  const lines = [`# Vérification des flux — édition ${edition} — ${generatedAt}`, '', `Sources : ${sources.join(' ; ')}.`, '', `Résumé : ${JSON.stringify(summarize(measures))}`, '',
    '| Verdict | Rôle | Pays | Source | Statut | Art. | Datés | 24 h | Futur (avance h) | Âge h | Langue | Encodage | Ko | Cond. | Dates brutes |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|'];
  for (const row of measures) lines.push('| ' + [row.verdict, row.role, row.country, row.name, row.error ?? row.status, row.items, row.dated, row.last24, `${row.future} (${row.leadHours ?? '–'})`, row.newestAgeHours,
    row.language, row.charset, Math.round(row.bytes / 1024), row.etag || row.lastModified ? 'oui' : 'non', row.rawDateSamples[0]].map(cell).join(' | ') + ' |');
  lines.push('', '## Écarts', '', ...(drifts.length ? drifts.map(drift => `- **${drift.name}** (${drift.url}) : ${drift.changes.join(' ; ')}`) : ['Aucun.']));
  return lines.join('\n') + '\n';
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const { candidates, sources } = candidatesFor(options);
  if (!candidates.length) throw new Error('Aucun flux à vérifier.');
  const out = path.resolve(options.out ?? path.join(ROOT, '.local-logs', 'feeds-verify', dakarDate()));
  mkdirSync(out, { recursive: true });
  console.log(`${candidates.length} flux (${options.editions.join(', ')}), ${options.concurrency} en parallèle, délai ${options.timeoutMs} ms. Sources : ${sources.join(' ; ')}`);
  const measures = await measureAll(candidates, options);
  const generatedAt = new Date().toISOString();
  for (const edition of options.editions) {
    const rows = measures.filter(row => row.edition === edition);
    if (!rows.length) continue;
    const drifts = compareMeasures(rows, previousResults(options, edition));
    const report = { generatedAt, edition, userAgent: RSS_FEED_HEADERS['User-Agent'], timeoutMs: options.timeoutMs, sources, summary: summarize(rows), drifts,
      measures: rows.map(row => { const copy = { ...row }; delete copy.titles; return copy; }) };
    if (options.dumpTitles) writeFileSync(path.join(out, `titles-${edition}.json`), JSON.stringify(rows.filter(row => row.titles?.length)
      .map(row => ({ name: row.name, url: row.url, role: row.role, country: row.country, region: row.region ?? null, titles: row.titles })), null, 1));
    writeFileSync(path.join(out, `result-${edition}.json`), JSON.stringify(report, null, 1));
    writeFileSync(path.join(out, `summary-${edition}.md`), markdown(edition, rows, drifts, generatedAt, sources));
    console.log(`\n== ${edition} : ${JSON.stringify(report.summary)}`);
    for (const row of rows) console.log([row.verdict.padEnd(10), row.role.padEnd(13), (row.country ?? '--').padEnd(2), row.name.slice(0, 28).padEnd(28), String(row.error ?? row.status).slice(0, 30).padEnd(6),
      `art=${row.items}`, `24h=${row.last24}`, `futur=${row.future}${row.leadHours !== null ? `(+${row.leadHours}h)` : ''}`, `âge=${row.newestAgeHours ?? '–'}h`, row.language, row.charset, `${Math.round(row.bytes / 1024)}Ko`].join(' '));
    console.log(`Écarts (${drifts.length}) :`);
    for (const drift of drifts) console.log(`  - ${drift.name} : ${drift.changes.join(' ; ')}`);
  }
  console.log(`\nRelevés : ${path.relative(ROOT, out) || out}`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
