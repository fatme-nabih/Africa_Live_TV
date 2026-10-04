import crypto from 'node:crypto';

import { z } from 'zod';

const NABOOPAY_API_ORIGIN = 'https://api.naboopay.com';
const MAX_PROVIDER_RESPONSE_BYTES = 64 * 1024;
const PROVIDER_TIMEOUT_MS = 10_000;

export const NabooPayMethodSchema = z.enum([
  'wave', 'orange_money', 'free_money', 'visa', 'mastercard',
]);
export type NabooPayMethod = z.infer<typeof NabooPayMethodSchema>;

export const NabooPayStatusSchema = z.enum(['pending', 'completed', 'failed', 'canceled', 'refunded']);
export type NabooPayStatus = z.infer<typeof NabooPayStatusSchema>;

export const NabooPayProductSchema = z.object({
  name: z.string().min(1).max(100),
  price: z.number().int().positive(),
  quantity: z.number().int().positive(),
  description: z.string().max(255).optional(),
}).strict();

export const NabooPayCustomerSchema = z.object({
  first_name: z.string().min(1).max(50),
  last_name: z.string().min(1).max(50),
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Numéro de téléphone non conforme E.164'),
  created_at: z.union([z.string().datetime({ offset: true }), z.date()]).optional(),
}).strict();

export const NabooPayTransactionRequestSchema = z.object({
  method_of_payment: z.array(NabooPayMethodSchema).min(1),
  products: z.array(NabooPayProductSchema).min(1),
  customer: NabooPayCustomerSchema,
  success_url: z.string().url(),
  error_url: z.string().url(),
  is_escrow: z.boolean().optional(),
  is_merchant: z.boolean().optional(),
  fees_customer_side: z.boolean().optional(),
}).strict();

export type NabooPayTransactionRequest = z.infer<typeof NabooPayTransactionRequestSchema>;

export const NabooPayCheckoutUrlSchema = z.string().url().refine((value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      (!url.port || url.port === '443') &&
      (url.hostname === 'naboopay.com' || url.hostname.endsWith('.naboopay.com'));
  } catch {
    return false;
  }
}, { message: 'URL de paiement NabooPay invalide.' });

export const NabooPayTransactionResponseSchema = z.object({
  checkout_url: NabooPayCheckoutUrlSchema,
  order_id: z.string().min(1).max(200),
}).strip();

export type NabooPayTransactionResponse = z.infer<typeof NabooPayTransactionResponseSchema>;

const providerDate = z.string().datetime({ offset: true });

export const NabooPayTransactionPayloadSchema = z.object({
  order_id: z.string().min(1).max(200),
  method_of_payment: z.array(NabooPayMethodSchema).min(1),
  selected_payment_method: NabooPayMethodSchema.optional(),
  amount: z.number().int().positive(),
  fees: z.number().nonnegative(),
  currency: z.literal('XOF'),
  customer: NabooPayCustomerSchema.omit({ created_at: true }).extend({
    created_at: providerDate,
  }).strict(),
  transaction_status: NabooPayStatusSchema,
  products: z.array(NabooPayProductSchema).min(1),
  is_escrow: z.boolean(),
  is_merchant: z.boolean(),
  fees_customer_side: z.boolean(),
  success_url: z.string().url(),
  error_url: z.string().url(),
  created_at: providerDate,
  updated_at: providerDate,
  paid_at: providerDate.optional(),
}).strict();

export type NabooPayTransactionPayload = z.infer<typeof NabooPayTransactionPayloadSchema>;

export class NabooPayApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly type:
      | 'timeout' | 'validation' | 'configuration' | 'limitation'
      | 'indisponibilite' | 'invalide',
  ) {
    super(message);
    this.name = 'NabooPayApiError';
  }
}

async function readProviderJson(response: Response, signal: AbortSignal) {
  const reader = response.body?.getReader();
  if (!reader) throw new NabooPayApiError('Réponse NabooPay vide.', 502, 'invalide');

  const decoder = new TextDecoder();
  let text = '';
  let bytesRead = 0;
  const cancel = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', cancel, { once: true });
  try {
  signal.throwIfAborted();
  while (true) {
    const { done, value } = await reader.read();
    signal.throwIfAborted();
    if (done) break;
    bytesRead += value.byteLength;
    if (bytesRead > MAX_PROVIDER_RESPONSE_BYTES) {
      throw new NabooPayApiError('Réponse NabooPay trop volumineuse.', 502, 'invalide');
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new NabooPayApiError('Réponse NabooPay non JSON.', 502, 'invalide');
  }
  } finally {
    signal.removeEventListener('abort', cancel);
    void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

function providerError(status: number) {
  let type: NabooPayApiError['type'] = 'indisponibilite';
  if (status === 400 || status === 404) type = 'validation';
  else if (status === 401 || status === 403) type = 'configuration';
  else if (status === 429) type = 'limitation';
  return new NabooPayApiError(`NabooPay a répondu avec le statut ${status}.`, status, type);
}

export type NabooPayTransport = { fetch?: typeof fetch; timeoutMs?: number };
async function providerFetch<T>(path: string, init: RequestInit, parse: (json: unknown) => T, transport: NabooPayTransport = {}) {
  const apiKey = process.env.NABOOPAY_API_KEY;
  if (!apiKey) throw new NabooPayApiError('Configuration NabooPay absente.', 500, 'configuration');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), transport.timeoutMs ?? PROVIDER_TIMEOUT_MS);
  let removeAbort = () => {};
  const deadline = new Promise<never>((_, reject) => {
    const abort = () => reject(new NabooPayApiError('Délai NabooPay dépassé.', 504, 'timeout'));
    controller.signal.addEventListener('abort', abort, { once: true });
    removeAbort = () => controller.signal.removeEventListener('abort', abort);
  });
  try {
    return await Promise.race([deadline, (async () => {
    const response = await (transport.fetch ?? fetch)(`${NABOOPAY_API_ORIGIN}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
        ...init.headers,
      },
      signal: controller.signal,
    });
    if (!response.ok) { void response.body?.cancel().catch(() => {}); throw providerError(response.status); }
    return parse(await readProviderJson(response, controller.signal));
    })()]);
  } catch (error) {
    if (error instanceof NabooPayApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new NabooPayApiError('Délai NabooPay dépassé.', 504, 'timeout');
    }
    throw new NabooPayApiError('NabooPay est injoignable.', 503, 'indisponibilite');
  } finally {
    clearTimeout(timeout);
    removeAbort();
  }
}

export async function createNabooPayTransaction(
  request: NabooPayTransactionRequest,
  transport: NabooPayTransport = {},
): Promise<NabooPayTransactionResponse> {
  const parsedRequest = NabooPayTransactionRequestSchema.parse(request);
  return providerFetch('/api/v2/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(parsedRequest),
  }, json => {
  const parsed = NabooPayTransactionResponseSchema.safeParse(json);
  if (!parsed.success) throw new NabooPayApiError('Réponse de création NabooPay invalide.', 502, 'invalide');
  return parsed.data;
  }, transport);
}

export async function getNabooPayTransaction(orderId: string, transport: NabooPayTransport = {}) {
  if (!orderId || orderId.length > 200) {
    throw new NabooPayApiError('Identifiant NabooPay invalide.', 400, 'validation');
  }
  return providerFetch(`/api/v2/transactions/${encodeURIComponent(orderId)}`, {
    method: 'GET',
  }, json => {
  const parsed = NabooPayTransactionPayloadSchema.safeParse(json);
  if (!parsed.success) throw new NabooPayApiError('Réponse de lecture NabooPay invalide.', 502, 'invalide');
  return parsed.data;
  }, transport);
}

export function verifyNabooPayWebhookSignature(payload: string, signature: string) {
  const secretKey = process.env.NABOOPAY_WEBHOOK_SECRET;
  if (!secretKey) throw new Error('NABOOPAY_WEBHOOK_SECRET is not configured');
  if (!/^[0-9a-f]{64}$/i.test(signature)) return false;
  const expected = crypto.createHmac('sha256', secretKey).update(payload).digest();
  return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), expected);
}
