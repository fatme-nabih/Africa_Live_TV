import { z } from 'zod';
import crypto from 'crypto';

export const NabooPayMethodSchema = z.enum(['wave', 'orange_money', 'free_money', 'visa', 'mastercard']);
export type NabooPayMethod = z.infer<typeof NabooPayMethodSchema>;

export const NabooPayStatusSchema = z.enum(['pending', 'completed', 'failed', 'canceled']);
export type NabooPayStatus = z.infer<typeof NabooPayStatusSchema>;

export const NabooPayProductSchema = z.object({
  name: z.string().min(1).max(100),
  price: z.number().positive(),
  quantity: z.number().int().positive(),
  description: z.string().max(255).optional(),
}).strict();

export const NabooPayCustomerSchema = z.object({
  first_name: z.string().min(1).max(50),
  last_name: z.string().min(1).max(50),
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/, "Numéro de téléphone non conforme E.164"),
  created_at: z.union([z.string(), z.date()]).optional(),
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

export const NabooPayCheckoutUrlSchema = z.string().url().refine((val) => {
  try {
    const u = new URL(val);
    if (u.protocol !== 'https:') return false;
    if (u.username || u.password) return false;
    if (u.port && u.port !== '443' && u.port !== '') return false;
    return true;
  } catch {
    return false;
  }
}, { message: "Invalid checkout URL" });

export const NabooPayTransactionResponseSchema = z.object({
  checkout_url: NabooPayCheckoutUrlSchema,
  order_id: z.string().min(1),
}); // default strips unknown fields

export type NabooPayTransactionResponse = z.infer<typeof NabooPayTransactionResponseSchema>;

export const NabooPayTransactionPayloadSchema = z.object({
  order_id: z.string(),
  method_of_payment: z.array(NabooPayMethodSchema),
  selected_payment_method: z.string().optional(),
  amount: z.number(),
  fees: z.number(),
  currency: z.string(),
  customer: NabooPayCustomerSchema.omit({ created_at: true }).extend({ created_at: z.string() }),
  transaction_status: NabooPayStatusSchema,
  products: z.array(NabooPayProductSchema).optional(),
  is_escrow: z.boolean(),
  is_merchant: z.boolean(),
  fees_customer_side: z.boolean(),
  success_url: z.string().url(),
  error_url: z.string().url(),
  created_at: z.string(),
  updated_at: z.string(),
  paid_at: z.string().optional(),
});

export type NabooPayTransactionPayload = z.infer<typeof NabooPayTransactionPayloadSchema>;

export class NabooPayApiError extends Error {
  constructor(message: string, public status: number, public type: 'timeout' | 'validation' | 'configuration' | 'limitation' | 'indisponibilite' | 'invalide') {
    super(message);
    this.name = 'NabooPayApiError';
  }
}

/**
 * Creates a transaction in NabooPay API v2
 */
export async function createNabooPayTransaction(request: NabooPayTransactionRequest): Promise<NabooPayTransactionResponse> {
  const apiKey = process.env.NABOOPAY_API_KEY;
  if (!apiKey) {
    throw new NabooPayApiError('NABOOPAY_API_KEY is not defined', 500, 'configuration');
  }

  // Validate the request strictly
  const parsedRequest = NabooPayTransactionRequestSchema.parse(request);

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 10000);

  let response: Response;
  try {
    response = await fetch('https://api.naboopay.com/api/v2/transactions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(parsedRequest),
      signal: abortController.signal,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new NabooPayApiError('NabooPay API timeout', 504, 'timeout');
    }
    throw new NabooPayApiError('NabooPay API unreachable', 503, 'indisponibilite');
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    let type: NabooPayApiError['type'] = 'indisponibilite';
    if (response.status === 400) type = 'validation';
    else if (response.status === 401 || response.status === 403) type = 'configuration';
    else if (response.status === 429) type = 'limitation';
    
    throw new NabooPayApiError(`NabooPay API Error: ${response.status}`, response.status, type);
  }

  // Read response with bounded size
  let text = '';
  const reader = response.body?.getReader();
  if (!reader) throw new NabooPayApiError('Empty response from NabooPay', 500, 'invalide');
  
  let bytesRead = 0;
  const maxBytes = 64 * 1024; // 64 Kio
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytesRead += value.length;
    if (bytesRead > maxBytes) {
      reader.cancel();
      throw new NabooPayApiError('Response too large', 500, 'invalide');
    }
    text += new TextDecoder().decode(value, { stream: true });
  }
  
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new NabooPayApiError('Invalid JSON from NabooPay', 500, 'invalide');
  }

  try {
    return NabooPayTransactionResponseSchema.parse(json);
  } catch {
    throw new NabooPayApiError('Invalid schema from NabooPay', 500, 'invalide');
  }
}

/**
 * Verifies the X-Signature header from NabooPay webhook
 */
export async function verifyNabooPayWebhookSignature(payloadStr: string, signature: string): Promise<boolean> {
  const secretKey = process.env.NABOOPAY_WEBHOOK_SECRET;
  if (!secretKey) {
    throw new Error('NABOOPAY_WEBHOOK_SECRET is not defined in environment variables');
  }

  if (!signature || signature.length !== 64 || !/^[0-9a-f]{64}$/i.test(signature)) {
    return false;
  }

  const expectedSignature = crypto.createHmac('sha256', secretKey)
    .update(payloadStr)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}
