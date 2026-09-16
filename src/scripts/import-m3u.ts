import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import { pool } from '../db';
import { runCatalogImport, type CatalogImportReport } from '../lib/catalog-import';
import {
  readResponseTextWithLimit,
  safeUpstreamFetch,
} from '../lib/safe-upstream-fetch';

const DEFAULT_SOURCE = 'https://iptv-org.github.io/iptv/index.m3u';
export const MAX_M3U_BYTES = 25 * 1024 * 1024;
const REMOTE_IMPORT_TIMEOUT_MS = 30_000;

type ImportOptions = {
  source: string;
  dryRun: boolean;
};

function printHelp() {
  console.log(`Usage:
  npm run import:m3u
  npm run import:m3u -- -- --dry-run
  npm run import:m3u -- -- --source <url-ou-fichier>

Options:
  --source <valeur>  URL HTTP(S) ou fichier M3U local. Défaut: ${DEFAULT_SOURCE}
  --dry-run          Calcule le rapport sans écrire en base.
  --force            Accepté pour compatibilité; n'est plus nécessaire.
  --help             Affiche cette aide.
`);
}

export function parseImportArgs(args: string[]): ImportOptions {
  const options: ImportOptions = { source: DEFAULT_SOURCE, dryRun: false };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    switch (argument) {
      case '--':
        break;
      case '--source': {
        const source = args[++index]?.trim();
        if (!source) throw new Error('--source exige une URL ou un chemin de fichier.');
        options.source = source;
        break;
      }
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--force':
        console.warn('--force est obsolète : la publication est désormais transactionnelle.');
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
      default:
        throw new Error(`Argument inconnu: ${argument}. Utilisez --help.`);
    }
  }

  return options;
}

async function loadSource(source: string) {
  if (/^https?:\/\//i.test(source)) {
    const response = await safeUpstreamFetch(new URL(source), {
      headers: { 'User-Agent': 'Lumina-TV-Catalog-Importer/2.0' },
      signal: AbortSignal.timeout(REMOTE_IMPORT_TIMEOUT_MS),
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`Téléchargement impossible: HTTP ${response.status}`);
    }
    return readResponseTextWithLimit(
      response,
      MAX_M3U_BYTES,
      'REMOTE_M3U_TOO_LARGE',
    );
  }

  const localPath = path.resolve(source);
  const metadata = await stat(localPath);
  if (metadata.size > MAX_M3U_BYTES) throw new Error('LOCAL_M3U_TOO_LARGE');
  return readFile(localPath, 'utf8');
}

function printReport(report: CatalogImportReport) {
  console.log(JSON.stringify(report, null, 2));
  console.log(
    report.dryRun
      ? 'Dry-run terminé : aucune écriture en base.'
      : `Catalogue publié atomiquement. Import: ${report.importId}`,
  );
}

async function run() {
  const options = parseImportArgs(process.argv.slice(2));
  console.log(
    `Chargement d’une source ${/^https?:\/\//i.test(options.source) ? 'distante' : 'locale'}.`,
  );
  const content = await loadSource(options.source);
  const report = await runCatalogImport({
    source: options.source,
    content,
    dryRun: options.dryRun,
  });
  printReport(report);
}

if (process.env.NODE_ENV !== 'test') {
  run()
    .catch((error) => {
      console.error('Erreur lors de l’importation :', error);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
