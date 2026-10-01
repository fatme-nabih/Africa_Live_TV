/** Bound decompressed bodies as well as declared sizes. Fetch deadlines also cover reads. */
export async function readRadarText(response: Response, maxBytes = 2_000_000): Promise<string> {
  if (Number(response.headers.get('content-length')) > maxBytes) throw new Error('RADAR_PAYLOAD_TOO_LARGE');
  const reader = response.body?.getReader();
  if (!reader) throw new Error('RADAR_PAYLOAD_EMPTY');
  let size = 0, text = '';
  const decoder = new TextDecoder();
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new Error('RADAR_PAYLOAD_TOO_LARGE'); }
      text += decoder.decode(chunk.value, { stream: true });
    }
    return text + decoder.decode();
  } finally { reader.releaseLock(); }
}
