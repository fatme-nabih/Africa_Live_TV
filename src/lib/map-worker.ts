export const MAP_WORKER_URL = '/maplibre/maplibre-gl-worker.mjs';

// Check the installed module and its dependencies before constructing MapLibre.
// A blocked worker must not leave rejected promises or an endlessly blank map.
export function checkMapWorker(): Promise<void> {
  return new Promise((resolve, reject) => {
    const worker = new Worker('/maplibre/worker-check.mjs', { type: 'module' });
    const timeout = window.setTimeout(() => finish(false), 5000);
    function finish(ok: boolean) {
      window.clearTimeout(timeout);
      worker.terminate();
      if (ok) resolve();
      else reject(new Error('Carte indisponible. Le fil et le choix du pays restent accessibles.'));
    }
    worker.onmessage = event => finish(event.data === 'ready');
    worker.onerror = event => { event.preventDefault(); finish(false); };
  });
}
