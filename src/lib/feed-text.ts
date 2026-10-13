/** Lecture bornée en octets, décodage HTTP > XML > registre > UTF-8. */
export async function readBoundedText(response: Response, maxBytes: number, feedCharset?: string): Promise<string> {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) {
    await response.body?.cancel();
    throw new Error('Upstream response exceeded the allowed size.');
  }
  if (!response.body) return '';
  const reader = response.body.getReader(), chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) { await reader.cancel(); throw new Error('Upstream response exceeded the allowed size.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  const header = /charset\s*=\s*["']?([\w.:-]+)/i.exec(response.headers.get('content-type') ?? '');
  const head = new TextDecoder('latin1').decode(bytes.subarray(0, 400));
  const xml = /<\?xml[^>]*encoding\s*=\s*["']([\w.:-]+)["']/i.exec(head);
  try { return new TextDecoder(header?.[1] ?? xml?.[1] ?? feedCharset ?? 'utf-8').decode(bytes); }
  catch { return new TextDecoder().decode(bytes); }
}
