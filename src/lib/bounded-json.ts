export class BoundedJsonError extends Error {
  constructor(
    readonly code: 'INVALID_JSON' | 'BODY_TOO_LARGE',
    message: string,
  ) {
    super(message);
    this.name = 'BoundedJsonError';
  }
}

export async function readBoundedJson(
  request: Request,
  maximumBytes = 32 * 1_024,
): Promise<unknown> {
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 1) {
    throw new TypeError('maximumBytes must be a positive safe integer.');
  }

  const declaredLength = request.headers.get('content-length');
  if (declaredLength) {
    const parsedLength = Number(declaredLength);
    if (!Number.isSafeInteger(parsedLength) || parsedLength < 0) {
      throw new BoundedJsonError('INVALID_JSON', 'Content-Length is invalid.');
    }
    if (parsedLength > maximumBytes) {
      throw new BoundedJsonError('BODY_TOO_LARGE', 'The JSON body is too large.');
    }
  }

  if (!request.body) {
    throw new BoundedJsonError('INVALID_JSON', 'The JSON body is missing.');
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maximumBytes) {
        await reader.cancel();
        throw new BoundedJsonError('BODY_TOO_LARGE', 'The JSON body is too large.');
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof BoundedJsonError) throw error;
    throw new BoundedJsonError('INVALID_JSON', 'The JSON body could not be read.');
  }

  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new BoundedJsonError('INVALID_JSON', 'The JSON body is invalid.');
  }
}
