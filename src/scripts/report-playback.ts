import { sql } from 'drizzle-orm';

import { db } from '../db';
import {
  assessStreamForRequalification,
  detectTelemetryAlerts,
  type StreamSessionMetrics,
} from '../lib/telemetry-metrics';

type Options = { days: number; limit: number; json: boolean; failOnAlert: boolean };
type SummaryRow = { sessions: number; starts: number; failures: number; buffering: number; start_rate: number; failure_rate: number };
type StreamRow = {
  stream_id: string;
  channel: string;
  status: string;
  sessions: number;
  start_rate: number;
  failure_rate: number;
  buffering_rate: number;
  avg_startup_ms: number | null;
  p95_startup_ms: number | null;
};

function positive(value: string | undefined, name: string) {
  const number = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(number) || number <= 0) throw new Error(`${name} doit être un entier positif.`);
  return number;
}

export function parseReportArgs(args: string[]): Options {
  const options: Options = { days: 7, limit: 10, json: false, failOnAlert: false };
  for (let index = 0; index < args.length; index++) {
    switch (args[index]) {
      case '--days': options.days = positive(args[++index], '--days'); break;
      case '--limit': options.limit = positive(args[++index], '--limit'); break;
      case '--json': options.json = true; break;
      case '--fail-on-alert': options.failOnAlert = true; break;
      case '--help':
      case '-h':
        console.log('Usage: npm run report:playback -- -- --days 7 --limit 10 [--json] [--fail-on-alert]');
        process.exit(0);
      default: throw new Error(`Argument inconnu: ${args[index]}`);
    }
  }
  return options;
}

async function summaryBetween(from: string, to: string): Promise<SummaryRow> {
  const result = await db.execute<SummaryRow>(sql`
    with per_session as (
      select
        playback_session_id,
        bool_or(event = 'started') as started,
        bool_or(event = 'failed') as failed,
        bool_or(event = 'buffering_started') as buffered
      from playback_events
      where schema_version = 1
        and playback_session_id is not null
        and received_at >= ${from} and received_at < ${to}
      group by playback_session_id
    )
    select
      count(*)::int as sessions,
      count(*) filter (where started)::int as starts,
      count(*) filter (where failed)::int as failures,
      count(*) filter (where buffered)::int as buffering,
      coalesce(round(100.0 * count(*) filter (where started) / nullif(count(*), 0), 1), 0)::float as start_rate,
      coalesce(round(100.0 * count(*) filter (where failed) / nullif(count(*), 0), 1), 0)::float as failure_rate
    from per_session
  `);
  return result.rows[0] ?? { sessions: 0, starts: 0, failures: 0, buffering: 0, start_rate: 0, failure_rate: 0 };
}

async function run() {
  const options = parseReportArgs(process.argv.slice(2));
  const now = new Date();
  const from = new Date(now.getTime() - options.days * 86_400_000);
  const previousFrom = new Date(from.getTime() - options.days * 86_400_000);
  const [current, previous, legacyResult, streamResult] = await Promise.all([
    summaryBetween(from.toISOString(), now.toISOString()),
    summaryBetween(previousFrom.toISOString(), from.toISOString()),
    db.execute<{ count: number }>(sql`select count(*)::int as count from playback_events where schema_version = 0`),
    db.execute<StreamRow>(sql`
      with per_stream_session as (
        select
          playback_session_id,
          stream_id,
          bool_or(event = 'started') as started,
          bool_or(event = 'failed') as failed,
          bool_or(event = 'buffering_started') as buffered,
          max(startup_time_ms) filter (where event = 'started') as startup_ms
        from playback_events
        where schema_version = 1
          and playback_session_id is not null
          and stream_id is not null
          and received_at >= ${from.toISOString()}
        group by playback_session_id, stream_id
      )
      select
        p.stream_id,
        coalesce(c.name, p.stream_id) as channel,
        s.status,
        count(*)::int as sessions,
        round(100.0 * count(*) filter (where p.started) / count(*), 1)::float as start_rate,
        round(100.0 * count(*) filter (where p.failed) / count(*), 1)::float as failure_rate,
        round(100.0 * count(*) filter (where p.buffered) / count(*), 1)::float as buffering_rate,
        round(avg(p.startup_ms))::int as avg_startup_ms,
        round(percentile_cont(0.95) within group (order by p.startup_ms))::int as p95_startup_ms
      from per_stream_session p
      join streams s on s.id = p.stream_id
      join channels c on c.id = s.channel_id
      group by p.stream_id, c.name, s.status
      order by failure_rate desc, start_rate asc, sessions desc
    `),
  ]);

  const streams = streamResult.rows;
  const requalification = streams
    .map((row) => {
      const metrics: StreamSessionMetrics = {
        streamId: row.stream_id,
        sessions: row.sessions,
        startRate: row.start_rate,
        failureRate: row.failure_rate,
        bufferingRate: row.buffering_rate,
        p95StartupMs: row.p95_startup_ms,
      };
      const assessment = assessStreamForRequalification(metrics);
      return assessment ? { ...row, ...assessment } : null;
    })
    .filter((row) => row != null)
    .slice(0, options.limit);
  const alerts = detectTelemetryAlerts(
    { sessions: current.sessions, startRate: current.start_rate, failureRate: current.failure_rate },
    { sessions: previous.sessions, startRate: previous.start_rate, failureRate: previous.failure_rate },
  );
  const report = {
    generatedAt: now.toISOString(),
    windowDays: options.days,
    current,
    previous,
    legacyEventsExcluded: legacyResult.rows[0]?.count ?? 0,
    streams: streams.slice(0, options.limit),
    requalification,
    alerts,
  };

  if (options.json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`Rapport télémétrie par session — ${options.days} jours`);
    console.table([current]);
    console.log(`Événements historiques exclus : ${report.legacyEventsExcluded}`);
    console.log('\nMesures par flux');
    console.table(report.streams);
    console.log('\nFlux à requalifier');
    console.table(requalification.map((row) => ({ ...row, reasons: row.reasons.join(', ') })));
    if (alerts.length) console.warn(`ALERTES: ${alerts.join(' ; ')}`);
  }
  if (options.failOnAlert && alerts.length) process.exitCode = 2;
}

run().catch((error) => {
  console.error(JSON.stringify({ level: 'error', event: 'telemetry.database_unavailable', errorName: error instanceof Error ? error.name : 'UnknownError' }));
  process.exit(1);
});
