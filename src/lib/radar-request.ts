export async function requestRadarJson(url: string, parent: AbortSignal, options: { timeoutMs?: number; fetcher?: typeof fetch } = {}): Promise<unknown> {
  const controller = new AbortController(), abort = () => controller.abort();
  parent.addEventListener('abort',abort,{ once:true }); if (parent.aborted) abort();
  const timer = setTimeout(abort,options.timeoutMs ?? 15_000);
  let rejectAbort!:()=>void;
  const deadline = new Promise<never>((_,reject) => { rejectAbort = () => reject(new DOMException('Radar request deadline','AbortError')); controller.signal.addEventListener('abort',rejectAbort,{ once:true }); if (controller.signal.aborted) rejectAbort(); });
  try {
    const task = (options.fetcher ?? fetch)(url,{ cache:'no-store',signal:controller.signal }).then(async response => { if (!response.ok) throw new Error('RADAR_API_' + response.status); return response.json() as Promise<unknown>; });
    return await Promise.race([task,deadline]);
  } finally { clearTimeout(timer); controller.signal.removeEventListener('abort',rejectAbort); parent.removeEventListener('abort',abort); }
}
