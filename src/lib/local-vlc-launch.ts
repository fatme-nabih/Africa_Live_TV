import { access } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

export class LocalVlcError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
  }
}

type LaunchEntry = { promise: Promise<void>; expiresAt: number; pending: boolean };
const launchGlobal = globalThis as typeof globalThis & { localVlcLaunches?: Map<string, LaunchEntry> };
const launches = launchGlobal.localVlcLaunches ??= new Map();

export async function onceLocalVlcLaunch(key: string, action: () => Promise<void>, now = Date.now()) {
  for (const [id, entry] of launches) {
    if (!entry.pending && entry.expiresAt <= now) launches.delete(id);
  }
  const existing = launches.get(key);
  if (existing) return existing.promise;
  if (launches.size >= 256) throw new LocalVlcError('VLC_BUSY', 'Trop de demandes VLC. Réessayez dans quelques instants.');
  const entry: LaunchEntry = { promise: Promise.resolve(), expiresAt: now + 5 * 60_000, pending: true };
  entry.promise = Promise.resolve().then(action).finally(() => { entry.pending = false; });
  launches.set(key, entry);
  return entry.promise;
}

export async function findVlcCommand() {
  if (process.env.VLC_PATH) {
    try { await access(process.env.VLC_PATH); return process.env.VLC_PATH; }
    catch { throw new LocalVlcError('VLC_NOT_INSTALLED', 'VLC est introuvable au chemin configuré. Installez VLC ou corrigez VLC_PATH.'); }
  }
  if (process.platform === 'win32') {
    for (const directory of [process.env.ProgramFiles, process.env['ProgramFiles(x86)']]) {
      if (!directory) continue;
      const candidate = path.join(directory, 'VideoLAN', 'VLC', 'vlc.exe');
      try { await access(candidate); return candidate; } catch { /* Try the next installation. */ }
    }
  }
  return 'vlc';
}

export async function launchLocalVlc(url: string) {
  const command = await findVlcCommand();
  return new Promise<void>((resolve, reject) => {
    // VLC is installed on the local workstation, never packaged with the server.
    const vlc = spawn(/* turbopackIgnore: true */ command, ['--one-instance', '--no-playlist-enqueue', '--no-qt-start-minimized', '--', url], {
      detached: true, stdio: 'ignore', windowsHide: false,
    });
    vlc.once('spawn', () => { vlc.unref(); resolve(); });
    vlc.once('error', error => {
      reject(new LocalVlcError(
        (error as NodeJS.ErrnoException).code === 'ENOENT' ? 'VLC_NOT_INSTALLED' : 'VLC_LAUNCH_FAILED',
        'VLC n’a pas pu être lancé. Vérifiez son installation et VLC_PATH.',
      ));
    });
  });
}
