import { and, eq, inArray, isNotNull } from 'drizzle-orm';

import { db, pool } from '../db';
import { channels } from '../db/schema';
import {
  buildChannelLanguageIndex,
  parseLanguageCodes,
  resolveChannelLanguage,
} from '../lib/channel-language';
import {
  readResponseTextWithLimit,
  safeUpstreamFetch,
} from '../lib/safe-upstream-fetch';

const DEFAULT_METADATA_SOURCE = 'https://iptv-org.github.io/api/feeds.json';
const MAX_METADATA_BYTES = 20 * 1024 * 1024;
const METADATA_TIMEOUT_MS = 30_000;
const UPDATE_BATCH_SIZE = 500;

type Options = {
  force: boolean;
  source: string;
};

function parseArgs(args: string[]): Options {
  const options: Options = {
    force: false,
    source: DEFAULT_METADATA_SOURCE,
  };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    switch (argument) {
      case '--':
        break;
      case '--force':
        options.force = true;
        break;
      case '--source': {
        const source = args[++index]?.trim();
        if (!source) throw new Error('--source exige une URL HTTP(S).');
        options.source = source;
        break;
      }
      case '--help':
      case '-h':
        console.log(`Usage:
  npm run backfill:languages
  npm run backfill:languages -- -- --force
  npm run backfill:languages -- -- --source <url>

Sans --force, la commande simule les changements sans écrire en base.
`);
        process.exit(0);
      default:
        throw new Error(`Argument inconnu: ${argument}. Utilisez --help.`);
    }
  }

  return options;
}

async function loadMetadata(source: string) {
  const sourceUrl = new URL(source);
  if (!['http:', 'https:'].includes(sourceUrl.protocol)) {
    throw new Error('La source de langues doit utiliser HTTP(S).');
  }

  const response = await safeUpstreamFetch(sourceUrl, {
    headers: { 'User-Agent': 'Lumina-TV-Language-Backfill/1.0' },
    signal: AbortSignal.timeout(METADATA_TIMEOUT_MS),
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`Téléchargement des langues impossible: HTTP ${response.status}`);
  }

  const content = await readResponseTextWithLimit(
    response,
    MAX_METADATA_BYTES,
    'LANGUAGE_METADATA_TOO_LARGE',
  );
  return JSON.parse(content) as unknown;
}

function summarizeLanguages(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) {
    for (const language of parseLanguageCodes(value)) {
      counts.set(language, (counts.get(language) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 25)
    .map(([language, channels]) => ({ language, channels }));
}

async function updateLanguages(updates: Array<{ id: string; language: string }>) {
  const updatesByLanguage = new Map<string, string[]>();
  for (const update of updates) {
    const ids = updatesByLanguage.get(update.language) ?? [];
    ids.push(update.id);
    updatesByLanguage.set(update.language, ids);
  }

  const updatedAt = new Date().toISOString();
  await db.transaction(async (tx) => {
    for (const [language, ids] of updatesByLanguage) {
      for (let offset = 0; offset < ids.length; offset += UPDATE_BATCH_SIZE) {
        await tx
          .update(channels)
          .set({ language, updatedAt })
          .where(
            and(
              eq(channels.active, true),
              isNotNull(channels.tvgId),
              inArray(channels.id, ids.slice(offset, offset + UPDATE_BATCH_SIZE)),
            ),
          );
      }
    }
  });
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  const metadata = await loadMetadata(options.source);
  const index = buildChannelLanguageIndex(metadata);
  const currentChannels = await db
    .select({
      id: channels.id,
      tvgId: channels.tvgId,
      language: channels.language,
    })
    .from(channels)
    .where(eq(channels.active, true));

  const updates: Array<{ id: string; language: string }> = [];
  let mappedChannels = 0;
  let unmappedChannels = 0;
  for (const channel of currentChannels) {
    const language = resolveChannelLanguage(channel.tvgId, index);
    if (!language) {
      unmappedChannels += 1;
      continue;
    }
    mappedChannels += 1;
    if (language !== channel.language) updates.push({ id: channel.id, language });
  }

  if (options.force && updates.length > 0) {
    await updateLanguages(updates);
  }

  console.log(JSON.stringify({
    dryRun: !options.force,
    activeChannels: currentChannels.length,
    mappedChannels,
    unmappedChannels,
    changedChannels: updates.length,
    topLanguages: summarizeLanguages(updates.map((update) => update.language)),
  }, null, 2));
  console.log(
    options.force
      ? 'Langues enregistrées dans PostgreSQL.'
      : 'Dry-run terminé : relancez avec --force pour enregistrer les langues.',
  );
}

if (process.env.NODE_ENV !== 'test') {
  run()
    .catch((error) => {
      console.error('Erreur lors du backfill des langues :', error);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
