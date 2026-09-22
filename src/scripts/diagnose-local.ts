import { execFile } from 'node:child_process';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import { loadEnvConfig } from '@next/env';
import { Pool } from 'pg';

const execFileAsync = promisify(execFile);

type ResultStatus = 'OK' | 'WARN' | 'FAIL';

function line(status: ResultStatus, label: string, detail: string) {
  console.log(`[${status}] ${label}: ${detail}`);
}

function booleanFlag(name: string) {
  const value = process.env[name];
  return value === undefined ? 'absent' : value === 'true' ? 'true' : value === 'false' ? 'false' : 'invalide';
}

function clerkMode(value: string | undefined) {
  if (!value) return 'absente';
  if (/^(?:pk|sk)_test_/.test(value)) return 'test';
  if (/^(?:pk|sk)_live_/.test(value)) return 'live';
  return 'format inconnu';
}

function safeOrigin(value: string | undefined) {
  try {
    return value ? new URL(value).origin : 'absente';
  } catch {
    return 'invalide';
  }
}

async function findVlc() {
  const candidates = [
    process.env.VLC_PATH,
    'C:/Program Files/VideoLAN/VLC/vlc.exe',
    'C:/Program Files (x86)/VideoLAN/VLC/vlc.exe',
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    if (await access(resolved).then(() => true, () => false)) return resolved;
  }
  return null;
}

async function inspectClock() {
  if (process.platform !== 'win32') {
    line('WARN', 'Horloge', 'contrôle w32tm disponible uniquement sous Windows');
    return;
  }

  try {
    const query = await execFileAsync('w32tm.exe', ['/query', '/status'], {
      windowsHide: true,
      timeout: 10_000,
      encoding: 'utf8',
    });
    const synchronized = !/Local CMOS Clock|Horloge CMOS locale|unsynchronized|non synchronis/i.test(query.stdout);
    line(synchronized ? 'OK' : 'WARN', 'Service horaire', synchronized ? 'source réseau détectée' : 'source locale ou état non synchronisé');
  } catch {
    line('WARN', 'Service horaire', 'w32tm /query /status indisponible');
  }

  try {
    const sample = await execFileAsync('w32tm.exe', ['/stripchart', '/computer:time.windows.com', '/samples:1', '/dataonly'], {
      windowsHide: true,
      timeout: 15_000,
      encoding: 'utf8',
    });
    const matches = [...sample.stdout.matchAll(/([+-]\d+(?:[.,]\d+)?)s/g)];
    const rawOffset = matches.at(-1)?.[1];
    const offset = rawOffset ? Number(rawOffset.replace(',', '.')) : Number.NaN;
    if (Number.isFinite(offset)) {
      line(Math.abs(offset) <= 5 ? 'OK' : 'FAIL', 'Dérive horaire', `${offset.toFixed(3)} s par rapport à time.windows.com`);
    } else {
      line('WARN', 'Dérive horaire', 'échantillon reçu mais valeur non interprétable');
    }
  } catch {
    line('WARN', 'Dérive horaire', 'time.windows.com inaccessible');
  }
}

async function inspectDatabase(connectionString: string) {
  const pool = new Pool({ connectionString, connectionTimeoutMillis: 5_000 });
  try {
    const summary = await pool.query<{
      databaseName: string;
      channels: number;
      streams: number;
      favorites: number;
      lastCheck: Date | null;
      lastSuccess: Date | null;
    }>(`
      select
        current_database() as "databaseName",
        (select count(*)::int from channels) as channels,
        (select count(*)::int from streams) as streams,
        (select count(*)::int from user_favorites) as favorites,
        (select max(last_checked_at) from streams) as "lastCheck",
        (select max(last_success_at) from streams) as "lastSuccess"
    `);
    const row = summary.rows[0];
    const correctDatabase = row.databaseName === 'africa_live_dev';
    const freshnessLimit = 72 * 60 * 60 * 1_000;
    const freshCheck = row.lastCheck && Date.now() - row.lastCheck.getTime() <= freshnessLimit;
    const freshSuccess = row.lastSuccess && Date.now() - row.lastSuccess.getTime() <= freshnessLimit;
    line(correctDatabase ? 'OK' : 'FAIL', 'PostgreSQL', `${row.databaseName} — ${row.channels} chaînes, ${row.streams} sources, ${row.favorites} favoris`);
    line(freshCheck ? 'OK' : 'WARN', 'Dernier contrôle des sources', row.lastCheck ? `${row.lastCheck.toISOString()}${freshCheck ? '' : ' (plus de 72 h)'}` : 'aucun');
    line(freshSuccess ? 'OK' : 'WARN', 'Dernier succès de lecture', row.lastSuccess ? `${row.lastSuccess.toISOString()}${freshSuccess ? '' : ' (plus de 72 h)'}` : 'aucun');
    return correctDatabase;
  } catch (error) {
    line('FAIL', 'PostgreSQL', error instanceof Error ? error.message.replace(/postgres(?:ql)?:\/\/\S+/gi, '[URL masquée]') : 'connexion impossible');
    return false;
  } finally {
    await pool.end();
  }
}

async function run() {
  loadEnvConfig(process.cwd());
  let failed = false;

  console.log('Diagnostic local Africa Live (aucun secret affiché)');
  line('OK', 'Node.js', process.version);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const correctOrigin = appUrl === 'http://localhost:3001' || appUrl === 'http://127.0.0.1:3001';
  line(correctOrigin ? 'OK' : 'FAIL', 'Origine locale', safeOrigin(appUrl));
  failed ||= !correctOrigin;

  for (const name of ['LOCAL_DEV_MODE', 'NEXT_PUBLIC_LOCAL_DEV_MODE', 'NEXT_PUBLIC_LOCAL_PLAYBACK', 'ENABLE_LOCAL_VLC', 'PLAYBACK_ELIGIBILITY_READY']) {
    line(booleanFlag(name) === 'invalide' ? 'FAIL' : 'OK', name, booleanFlag(name));
    failed ||= booleanFlag(name) === 'invalide';
  }

  const publishableMode = clerkMode(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  const secretMode = clerkMode(process.env.CLERK_SECRET_KEY);
  const clerkCoherent = publishableMode !== 'absente' && publishableMode === secretMode && publishableMode !== 'format inconnu';
  line(clerkCoherent ? 'OK' : 'WARN', 'Clerk', `clé publique ${publishableMode}, clé serveur ${secretMode} (valeurs masquées)`);

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    line('FAIL', 'PostgreSQL', 'DATABASE_URL absente');
    failed = true;
  } else {
    try {
      const database = new URL(connectionString);
      line('OK', 'Cible DB', `${database.hostname}:${database.port || '5432'}${database.pathname}`);
      failed ||= !(await inspectDatabase(connectionString));
    } catch {
      line('FAIL', 'Cible DB', 'DATABASE_URL invalide');
      failed = true;
    }
  }

  const vlc = await findVlc();
  const vlcRequired = process.env.ENABLE_LOCAL_VLC === 'true';
  line(vlc ? 'OK' : vlcRequired ? 'FAIL' : 'WARN', 'VLC', vlc ?? 'exécutable introuvable');
  failed ||= vlcRequired && !vlc;

  await inspectClock();
  process.exitCode = failed ? 1 : 0;
}

run().catch((error) => {
  console.error('Diagnostic local interrompu:', error instanceof Error ? error.message : 'erreur inconnue');
  process.exitCode = 1;
});
