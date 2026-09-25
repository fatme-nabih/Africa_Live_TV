import {
  and,
  asc,
  eq,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';

import { db, pool } from '../db';
import { channels, streams } from '../db/schema';
import { checkHlsStream, type HlsCheckResult } from '../lib/stream-verification';
import {
  classifyStaticDirectEligibility,
  decideDirectEligibility,
} from '../lib/direct-eligibility';
import { STREAM_FRESHNESS_TTL_MS } from '../lib/stream-freshness';
import { failedVerificationTransition } from '../lib/stream-verification-policy';
import { structuredLog } from '../lib/structured-log';
import { STREAM_STATUSES, type StreamStatus } from '../types/channel';

const DEFAULT_CONCURRENCY = 10;
const MAX_CONCURRENCY = 20;
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_RETRIES = 2;
const UPDATE_BATCH_SIZE = 100;
const CONFIRMED_FAILURE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const TEMPORARY_FAILURE_BASE_MS = 15 * 60 * 1000;
const TEMPORARY_FAILURE_MAX_MS = 6 * 60 * 60 * 1000;
const BROWSER_TEST_ORIGIN = process.env.BROWSER_TEST_ORIGIN || 'http://localhost:3000';
const VALID_STREAM_STATUSES = new Set<string>(STREAM_STATUSES);
const HISTORICALLY_PLAYABLE_STATUSES = ['BROWSER_OK', 'VLC_ONLY'] as const;

type VerifyOptions = {
  limit: number | null;
  country: string | null;
  status: StreamStatus | null;
  concurrency: number;
  timeoutMs: number;
  retries: number;
  recheckDays: number | null;
  revalidateDirect: boolean;
  scanAll: boolean;
  historical: boolean;
  repair: boolean;
  reviewMode: 'cookie-independent' | 'generic-query' | 'time-window-query' | null;
  dryRun: boolean;
  worker: boolean;
};

type TargetStream = {
  id: string;
  url: string;
  status: string;
  verificationState: string;
  consecutiveFailures: number;
  directEligibility: string;
  eligibilityReason: string;
  lastCheckedAt: string | null;
  lastSuccessAt: string | null;
  corsAllowed: boolean;
  mixedContent: boolean;
  httpStatus: number | null;
};

type PendingUpdate = {
  stream: TargetStream;
  result: HlsCheckResult;
  values: Partial<typeof streams.$inferInsert>;
};

function parsePositiveInt(value: string | undefined, optionName: string) {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${optionName} doit être un entier positif.`);
  }
  return parsed;
}

function parseNonNegativeInt(value: string | undefined, optionName: string) {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${optionName} doit être un entier positif ou nul.`);
  }
  return parsed;
}

function parseStatus(value: string | undefined) {
  const status = value?.toUpperCase();
  if (!status || !VALID_STREAM_STATUSES.has(status)) {
    throw new Error(`--status doit être l'un de: ${STREAM_STATUSES.join(', ')}`);
  }
  return status as StreamStatus;
}

function printHelp() {
  console.log(`Usage:
  npm run verify:streams
  npm run verify:streams -- -- --limit 500
  npm run verify:streams -- -- --country FR
  npm run verify:streams -- -- --status OFFLINE --recheck-days 7
  npm run verify:streams -- -- --all
  npm run verify:streams -- -- --historical
  npm run verify:streams -- -- --repair
  npm run verify:streams -- -- --review-cookie-independent
  npm run verify:streams -- -- --review-generic-query
  npm run verify:streams -- -- --review-time-window-query
  npm run verify:streams -- -- --concurrency 10 --timeout 15000 --retries 2

Sans filtre de statut, seuls les flux actifs dont next_check_at est arrivé sont sélectionnés.

Options:
  --limit <n>          Nombre maximum de flux à vérifier.
  --country <code>     Filtre pays ISO 2 lettres, ex: FR.
  --status <status>    Filtre optionnel: ${STREAM_STATUSES.join(', ')}.
  --all                Recontrôle tous les flux actifs, même s'ils ne sont pas encore arrivés à next_check_at.
  --historical         Recontrôle les flux actifs ayant déjà réussi au moins une vérification.
  --repair             Recontrôle les anciens succès actuellement en échec, en revue ou hors ligne.
  --review-cookie-independent
                       Revalide les sources ayant réussi sans réutiliser le cookie observé.
  --review-generic-query
                       Examine les queries sans signal d'authentification, signature ou expiration.
  --review-time-window-query
                       Examine explicitement les seules queries start/end sans identifiant ni signature.
  --revalidate-direct  Recontrôle tous les flux historiquement jouables, sans tenir compte de next_check_at.
  --concurrency <n>    Workers parallèles, maximum ${MAX_CONCURRENCY}. Défaut: ${DEFAULT_CONCURRENCY}.
  --timeout <ms>       Timeout par requête réseau. Défaut: ${DEFAULT_TIMEOUT_MS}.
  --retries <n>        Relances après erreur temporaire. Défaut: ${DEFAULT_RETRIES}.
  --recheck-days <n>   Force une validité historique basée sur last_checked_at.
  --dry-run            Vérifie sans écrire en base.
  --worker             Exécute avec un verrou exclusif, enregistre un rapport d'exécution (CRON).
  --help               Affiche cette aide.
`);
}

export function parseVerifyArgs(args: string[]): VerifyOptions {
  const options: VerifyOptions = {
    limit: null,
    country: null,
    status: null,
    concurrency: DEFAULT_CONCURRENCY,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    retries: DEFAULT_RETRIES,
    recheckDays: null,
    revalidateDirect: false,
    scanAll: false,
    historical: false,
    repair: false,
    reviewMode: null,
    dryRun: false,
    worker: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    switch (argument) {
      case '--':
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--worker':
        options.worker = true;
        break;
      case '--revalidate-direct':
        options.revalidateDirect = true;
        break;
      case '--all':
        options.scanAll = true;
        break;
      case '--historical':
        options.historical = true;
        break;
      case '--repair':
        options.repair = true;
        break;
      case '--review-cookie-independent':
        if (options.reviewMode) {
          throw new Error('Un seul mode --review-* peut être utilisé.');
        }
        options.reviewMode = 'cookie-independent';
        break;
      case '--review-generic-query':
        if (options.reviewMode) {
          throw new Error('Un seul mode --review-* peut être utilisé.');
        }
        options.reviewMode = 'generic-query';
        break;
      case '--review-time-window-query':
        if (options.reviewMode) {
          throw new Error('Un seul mode --review-* peut être utilisé.');
        }
        options.reviewMode = 'time-window-query';
        break;
      case '--limit':
        options.limit = parsePositiveInt(args[++index], '--limit');
        break;
      case '--country': {
        const country = args[++index];
        if (!country || !/^[a-z]{2}$/i.test(country)) {
          throw new Error('--country doit être un code ISO de 2 lettres, ex: FR.');
        }
        options.country = country.toUpperCase();
        break;
      }
      case '--status':
        options.status = parseStatus(args[++index]);
        break;
      case '--concurrency':
        options.concurrency = parsePositiveInt(args[++index], '--concurrency');
        if (options.concurrency > MAX_CONCURRENCY) {
          throw new Error(`--concurrency ne peut pas dépasser ${MAX_CONCURRENCY}.`);
        }
        break;
      case '--timeout':
      case '--timeout-ms':
        options.timeoutMs = parsePositiveInt(args[++index], '--timeout');
        break;
      case '--retries':
        options.retries = parseNonNegativeInt(args[++index], '--retries');
        break;
      case '--recheck-days':
        options.recheckDays = parsePositiveInt(args[++index], '--recheck-days');
        break;
      default:
        if (/^\d+$/.test(argument) && options.limit == null) {
          options.limit = parsePositiveInt(argument, 'limit positionnel');
        } else if (/^[a-z]{2}$/i.test(argument) && options.country == null) {
          options.country = argument.toUpperCase();
        } else {
          throw new Error(`Argument inconnu: ${argument}. Utilisez --help.`);
        }
    }
  }

  if (
    options.revalidateDirect &&
    (
      options.status ||
      options.recheckDays ||
      options.scanAll ||
      options.historical ||
      options.repair ||
      options.reviewMode
    )
  ) {
    throw new Error(
      '--revalidate-direct ne peut pas être combiné avec les autres modes de ciblage.',
    );
  }
  if (
    (options.scanAll || options.historical || options.repair || options.reviewMode) &&
    (options.status || options.recheckDays)
  ) {
    throw new Error(
      'Les modes de ciblage ne peuvent pas être combinés avec --status ou --recheck-days.',
    );
  }
  const exclusiveModes = [
    options.scanAll,
    options.historical,
    options.repair,
    options.reviewMode != null,
  ].filter(Boolean).length;
  if (exclusiveModes > 1) {
    throw new Error(
      'Les modes --all, --historical, --repair et --review-* sont mutuellement exclusifs.',
    );
  }
  return options;
}

function nextCheckDate(
  now: Date,
  result: HlsCheckResult,
  failures: number,
  confirmed: boolean,
) {
  if (result.available) {
    return new Date(now.getTime() + STREAM_FRESHNESS_TTL_MS).toISOString();
  }
  if (confirmed) {
    return new Date(now.getTime() + CONFIRMED_FAILURE_TTL_MS).toISOString();
  }
  const temporaryDelay = Math.min(
    TEMPORARY_FAILURE_BASE_MS * 2 ** Math.max(failures - 1, 0),
    TEMPORARY_FAILURE_MAX_MS,
  );
  return new Date(now.getTime() + temporaryDelay).toISOString();
}

export function buildVerificationUpdate(
  stream: TargetStream,
  result: HlsCheckResult,
  now: Date,
  reviewedQuery: 'generic' | 'time-window' | null = null,
) {
  if (result.available && result.playableStatus) {
    const eligibility = decideDirectEligibility({
      url: stream.url,
      available: true,
      playableStatus: result.playableStatus,
      setsCookie: result.setsCookie,
      confirmedOffline: false,
      reviewedQuery,
    });
    return {
      status: result.playableStatus,
      verificationState: 'HEALTHY',
      directEligibility: eligibility.state,
      eligibilityReason: eligibility.reason,
      eligibilityCheckedAt: now.toISOString(),
      consecutiveFailures: 0,
      corsAllowed: result.corsAllowed,
      mixedContent: result.mixedContent,
      httpStatus: result.httpStatus,
      failureReason: null,
      lastCheckedAt: now.toISOString(),
      lastSuccessAt: now.toISOString(),
      nextCheckAt: nextCheckDate(now, result, 0, false),
      finalUrl: result.finalUrl,
      updatedAt: now.toISOString(),
    } satisfies Partial<typeof streams.$inferInsert>;
  }

  const transition = failedVerificationTransition({
    now,
    temporaryFailure: result.temporaryFailure,
    status: stream.status,
    verificationState: stream.verificationState,
    directEligibility: stream.directEligibility,
    consecutiveFailures: stream.consecutiveFailures,
    lastCheckedAt: stream.lastCheckedAt,
    lastSuccessAt: stream.lastSuccessAt,
    freshnessTtlMs: STREAM_FRESHNESS_TTL_MS,
  });
  const { failures, confirmed } = transition;
  if (transition.retainLastKnownGood) {
    const retainedReviewMarker = stream.eligibilityReason.includes(
      'TIME_WINDOW_REVIEWED',
    )
      ? 'RECENT_SUCCESS_GRACE_TIME_WINDOW_REVIEWED'
      : stream.eligibilityReason.includes('QUERY_REVIEWED')
        ? 'RECENT_SUCCESS_GRACE_QUERY_REVIEWED'
        : 'RECENT_SUCCESS_GRACE';
    return {
      status: stream.status,
      verificationState: 'TEMPORARY_FAILURE',
      directEligibility: stream.directEligibility,
      eligibilityReason: retainedReviewMarker,
      eligibilityCheckedAt: now.toISOString(),
      consecutiveFailures: failures,
      corsAllowed: stream.corsAllowed,
      mixedContent: stream.mixedContent,
      httpStatus: stream.httpStatus,
      failureReason: result.failureReason,
      lastCheckedAt: now.toISOString(),
      nextCheckAt: nextCheckDate(now, result, failures, false),
      updatedAt: now.toISOString(),
    } satisfies Partial<typeof streams.$inferInsert>;
  }

  const eligibility = decideDirectEligibility({
    url: stream.url,
    available: false,
    playableStatus: null,
    setsCookie: result.setsCookie,
    confirmedOffline: confirmed,
    reviewedQuery,
  });
  return {
    status: confirmed ? 'OFFLINE' : 'UNTESTED',
    verificationState: confirmed ? 'CONFIRMED_FAILURE' : 'TEMPORARY_FAILURE',
    directEligibility: eligibility.state,
    eligibilityReason: eligibility.reason,
    eligibilityCheckedAt: now.toISOString(),
    consecutiveFailures: failures,
    corsAllowed: result.corsAllowed,
    mixedContent: result.mixedContent,
    httpStatus: result.httpStatus,
    failureReason: result.failureReason,
    lastCheckedAt: now.toISOString(),
    nextCheckAt: nextCheckDate(now, result, failures, confirmed),
    finalUrl: result.finalUrl,
    updatedAt: now.toISOString(),
  } satisfies Partial<typeof streams.$inferInsert>;
}

function buildStaticReviewUpdate(
  decision: NonNullable<ReturnType<typeof classifyStaticDirectEligibility>>,
  now: Date,
) {
  return {
    directEligibility: decision.state,
    eligibilityReason: decision.reason,
    eligibilityCheckedAt: now.toISOString(),
    updatedAt: now.toISOString(),
  } satisfies Partial<typeof streams.$inferInsert>;
}

export async function expireStalePlaybackClassifications(now = new Date()) {
  const cutoff = new Date(now.getTime() - STREAM_FRESHNESS_TTL_MS).toISOString();
  const expired = await db
    .update(streams)
    .set({
      verificationState: 'STALE',
      directEligibility: 'REVIEW_REQUIRED',
      eligibilityReason: 'STALE_VERIFICATION',
      eligibilityCheckedAt: now.toISOString(),
      failureReason: 'STALE_VERIFICATION',
      updatedAt: now.toISOString(),
    })
    .where(and(
      eq(streams.active, true),
      inArray(streams.status, HISTORICALLY_PLAYABLE_STATUSES),
      or(isNull(streams.lastSuccessAt), lt(streams.lastSuccessAt, cutoff)),
    ))
    .returning({ id: streams.id });
  return expired.length;
}

async function writeSingleBatchWithRetry(batch: PendingUpdate[], maxRetries = 3) {
  let attempt = 0;
  while (attempt < maxRetries) {
    attempt += 1;
    try {
      await db.transaction(async (tx) => {
        for (const update of batch) {
          await tx.update(streams).set(update.values).where(eq(streams.id, update.stream.id));
        }
      });
      return;
    } catch (error) {
      if (attempt >= maxRetries) throw error;
      console.warn(`Échec d'écriture du lot (${attempt}/${maxRetries}), nouvelle tentative dans 2s...`, error);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

async function run() {
  const startedAt = Date.now();
  const options = parseVerifyArgs(process.argv.slice(2));
  const now = new Date();

  if (options.worker) {
    const lockResult = await db.execute<{ locked: boolean }>(
      sql`select pg_try_advisory_lock(hashtext('worker_verify_streams')) as locked`
    );
    if (!lockResult.rows[0]?.locked) {
      console.log('Un autre worker est déjà en cours d\'exécution. Arrêt.');
      return;
    }
    console.log('Verrou worker_verify_streams acquis.');
  }

  async function selectTargets() {
    const conditions: SQL[] = [eq(streams.active, true), eq(channels.active, true)];
    if (options.revalidateDirect) {
      conditions.push(inArray(streams.status, HISTORICALLY_PLAYABLE_STATUSES));
    } else {
      if (options.status) conditions.push(eq(streams.status, options.status));
      if (options.reviewMode === 'cookie-independent') {
        conditions.push(eq(streams.eligibilityReason, 'COOKIE_OBSERVED'));
      } else if (options.reviewMode === 'generic-query') {
        conditions.push(eq(streams.eligibilityReason, 'QUERY_REQUIRES_REVIEW'));
      } else if (options.reviewMode === 'time-window-query') {
        conditions.push(
          inArray(streams.eligibilityReason, [
            'TIME_WINDOW_QUERY_REQUIRES_REVIEW',
            'SENSITIVE_QUERY',
          ]),
        );
      } else if (options.repair) {
        conditions.push(isNotNull(streams.lastSuccessAt));
        conditions.push(
          or(
            inArray(streams.directEligibility, ['REVIEW_REQUIRED', 'OFFLINE']),
            inArray(streams.verificationState, [
              'TEMPORARY_FAILURE',
              'CONFIRMED_FAILURE',
              'STALE',
            ]),
          )!,
        );
      } else if (options.historical) {
        conditions.push(isNotNull(streams.lastSuccessAt));
      } else if (options.scanAll) {
        // Le scan intégral ignore uniquement le calendrier; les garde-fous réseau restent actifs.
      } else if (options.recheckDays) {
        const cutoff = new Date(
          now.getTime() - options.recheckDays * 24 * 60 * 60 * 1000,
        ).toISOString();
        conditions.push(
          or(isNull(streams.lastCheckedAt), lt(streams.lastCheckedAt, cutoff))!,
        );
      } else {
        conditions.push(
          or(isNull(streams.nextCheckAt), lte(streams.nextCheckAt, now.toISOString()))!,
        );
      }
    }
    if (options.country) conditions.push(eq(channels.countryCode, options.country));

    const selected = await db
      .select({
        id: streams.id,
        url: streams.url,
        status: streams.status,
        verificationState: streams.verificationState,
        consecutiveFailures: streams.consecutiveFailures,
        directEligibility: streams.directEligibility,
        eligibilityReason: streams.eligibilityReason,
        lastCheckedAt: streams.lastCheckedAt,
        lastSuccessAt: streams.lastSuccessAt,
        corsAllowed: streams.corsAllowed,
        mixedContent: streams.mixedContent,
        httpStatus: streams.httpStatus,
      })
      .from(streams)
      .innerJoin(channels, eq(streams.channelId, channels.id))
      .where(and(...conditions))
      .orderBy(asc(streams.nextCheckAt), asc(streams.id));
    return options.limit ? selected.slice(0, options.limit) : selected;
  }

  let targets: TargetStream[];
  if (options.revalidateDirect) {
    targets = await selectTargets();
  } else {
    if (!options.dryRun) {
      const expired = await expireStalePlaybackClassifications(now);
      if (expired > 0) console.log(`Classifications expirées: ${expired}`);
    }
    targets = await selectTargets();
  }

  if (options.revalidateDirect && !options.dryRun) {
    const expired = await expireStalePlaybackClassifications(now);
    if (expired > 0) console.log(`Classifications expirées avant revalidation: ${expired}`);
  }

  console.log(
    `Vérification de ${targets.length} flux avec ${Math.min(options.concurrency, targets.length)} workers.`,
  );
  if (targets.length === 0) return;

  const queue = [...targets];
  const pendingUpdates: PendingUpdate[] = [];
  const writeQueue: PendingUpdate[] = [];
  let isWriting = false;
  let completed = 0;
  let written = 0;

  async function flushWriteQueue(force = false) {
    if (options.dryRun) return;
    while (writeQueue.length >= UPDATE_BATCH_SIZE || (force && writeQueue.length > 0)) {
      if (isWriting) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        continue;
      }
      isWriting = true;
      try {
        const batch = writeQueue.splice(0, UPDATE_BATCH_SIZE);
        if (batch.length > 0) {
          await writeSingleBatchWithRetry(batch);
          written += batch.length;
          console.log(`[Base de données] ${written}/${targets.length} flux synchronisés en base.`);
        }
      } finally {
        isWriting = false;
      }
    }
  }

  async function worker() {
    while (queue.length > 0) {
      const stream = queue.shift();
      if (!stream) return;
      const staticDecision = classifyStaticDirectEligibility(stream.url);
      const queryWasReviewed =
        stream.eligibilityReason.includes('QUERY_REVIEWED');
      const timeWindowWasReviewed =
        stream.eligibilityReason.includes('TIME_WINDOW_REVIEWED');
      const reviewGenericQuery =
        staticDecision?.reason === 'QUERY_REQUIRES_REVIEW' &&
        (options.reviewMode === 'generic-query' || queryWasReviewed);
      const reviewTimeWindowQuery =
        staticDecision?.reason === 'TIME_WINDOW_QUERY_REQUIRES_REVIEW' &&
        (options.reviewMode === 'time-window-query' || timeWindowWasReviewed);
      const reviewedQuery = reviewGenericQuery
        ? 'generic' as const
        : reviewTimeWindowQuery
          ? 'time-window' as const
          : null;
      const enforcedStaticDecision = reviewedQuery ? null : staticDecision;
      const result: HlsCheckResult = enforcedStaticDecision
        ? {
            available: false,
            playableStatus: null,
            temporaryFailure: false,
            corsAllowed: false,
            mixedContent: stream.url.startsWith('http://'),
            httpStatus: null,
            failureReason: enforcedStaticDecision.reason,
            finalUrl: null,
            redirected: false,
            setsCookie: false,
            attempts: 0,
          }
        : await checkHlsStream(stream.url, {
            timeoutMs: options.timeoutMs,
            retries: options.retries,
            origin: BROWSER_TEST_ORIGIN,
          });
      const updateItem: PendingUpdate = {
        stream,
        result,
        values: enforcedStaticDecision
          ? buildStaticReviewUpdate(enforcedStaticDecision, new Date())
          : buildVerificationUpdate(stream, result, new Date(), reviewedQuery),
      };
      pendingUpdates.push(updateItem);
      writeQueue.push(updateItem);
      completed += 1;
      if (writeQueue.length >= UPDATE_BATCH_SIZE) {
        void flushWriteQueue();
      }
      if (completed % 10 === 0 || completed === targets.length) {
        console.log(`Progression: ${completed}/${targets.length} vérifiés (dont ${written} écrits en base)`);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(options.concurrency, targets.length) }, () => worker()),
  );
  if (!options.dryRun) {
    while (isWriting) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    await flushWriteQueue(true);
    while (isWriting) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    const expiredAfterVerification = await expireStalePlaybackClassifications(
      new Date(),
    );
    if (expiredAfterVerification > 0) {
      console.log(
        `Classifications encore expirées après vérification: ${expiredAfterVerification}`,
      );
    }
  }

  const healthy = pendingUpdates.filter((item) => item.result.available).length;
  const temporary = pendingUpdates.filter(
    (item) => item.values.verificationState === 'TEMPORARY_FAILURE',
  ).length;
  const confirmed = pendingUpdates.filter(
    (item) => item.values.verificationState === 'CONFIRMED_FAILURE',
  ).length;
  const redirects = pendingUpdates.filter((item) => item.result.redirected).length;
  const cookies = pendingUpdates.filter((item) => item.result.setsCookie).length;
  const eligibilityCounts = pendingUpdates.reduce<Record<string, number>>(
    (counts, item) => {
      const state = String(item.values.directEligibility ?? item.stream.directEligibility);
      counts[state] = (counts[state] ?? 0) + 1;
      return counts;
    },
    {},
  );
  const eligibilityReasonCounts = pendingUpdates.reduce<Record<string, number>>(
    (counts, item) => {
      const reason = String(
        item.values.eligibilityReason ?? item.stream.eligibilityReason,
      );
      counts[reason] = (counts[reason] ?? 0) + 1;
      return counts;
    },
    {},
  );
  const failureReasonCounts = pendingUpdates.reduce<Record<string, number>>(
    (counts, item) => {
      const reason = item.result.failureReason ?? 'NONE';
      counts[reason] = (counts[reason] ?? 0) + 1;
      return counts;
    },
    {},
  );
  console.log(`Résultats: sains=${healthy}, temporaires=${temporary}, confirmés=${confirmed}`);
  console.log(`Redirections suivies: ${redirects}`);
  console.log(`Réponses avec cookie: ${cookies}`);
  console.log(`Éligibilité agrégée: ${JSON.stringify(eligibilityCounts)}`);
  console.log(`Motifs d'éligibilité: ${JSON.stringify(eligibilityReasonCounts)}`);
  console.log(`Motifs de contrôle: ${JSON.stringify(failureReasonCounts)}`);
  console.log(`Écritures: ${options.dryRun ? 'aucune (dry-run)' : `lots de ${UPDATE_BATCH_SIZE}`}`);
  console.log(`Durée: ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);

  if (options.worker) {
    structuredLog('info', 'stream.verification.worker.completed', {
      durationSeconds: (Date.now() - startedAt) / 1000,
      checked: targets.length,
      healthy,
      temporary,
      confirmed,
      redirects,
      cookies,
      eligibilityCounts: JSON.stringify(eligibilityCounts),
      dryRun: options.dryRun,
    });
  }
}

if (process.env.NODE_ENV !== 'test') {
  run()
    .catch((error) => {
      console.error('Erreur lors de la vérification :', error);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
