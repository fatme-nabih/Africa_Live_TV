export type NabooPayMethod = 'wave' | 'orange_money' | 'free_money' | 'visa' | 'mastercard';

export interface NabooPayTransactionPayload {
  order_id: string;
  method_of_payment: NabooPayMethod[];
  selected_payment_method?: string;
  amount: number;
  fees: number;
  currency: string;
  customer: {
    first_name: string;
    last_name: string;
    phone: string;
    created_at: string;
  };
  transaction_status: 'pending' | 'completed' | 'failed' | 'canceled';
  products?: {
    name: string;
    price: number;
    quantity: number;
    description?: string;
  }[];
  is_escrow: boolean;
  is_merchant: boolean;
  fees_customer_side: boolean;
  success_url: string;
  error_url: string;
  created_at: string;
  updated_at: string;
  paid_at?: string;
}

export interface NabooPayTransactionRequest {
  method_of_payment: NabooPayMethod[];
  products: {
    name: string;
    price: number;
    quantity: number;
    description: string;
  }[];
  customer: {
    first_name: string;
    last_name: string;
    phone: string;
    created_at: string | Date;
  };
  success_url: string;
  error_url: string;
  is_escrow?: boolean;
  is_merchant?: boolean;
  fees_customer_side?: boolean;
}

export interface NabooPayTransactionResponse {
  checkout_url: string;
  order_id: string;
}

/**
 * Creates a transaction in NabooPay API v2
 */
export async function createNabooPayTransaction(request: NabooPayTransactionRequest, checkoutAttemptId?: string): Promise<NabooPayTransactionResponse> {
  const apiKey = process.env.NABOOPAY_API_KEY;
  if (!apiKey) {
    throw new Error('NABOOPAY_API_KEY is not defined in environment variables');
  }

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 10000);

  try {
    const response = await fetch('https://api.naboopay.com/api/v2/transactions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        ...request,
        order_id: checkoutAttemptId,
        is_escrow: request.is_escrow ?? false,
        is_merchant: request.is_merchant ?? false,
        fees_customer_side: request.fees_customer_side ?? true,
      }),
      signal: abortController.signal,
    });

    if (!response.ok) {
      // Don't log full response text to avoid leaking secrets/PII
      console.error(`NabooPay API Error: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to create NabooPay transaction: ${response.status} ${response.statusText}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeoutId);
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

  // Use SubtleCrypto to verify HMAC SHA256
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secretKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );

  const signatureBytes = await crypto.subtle.sign(
    'HMAC',
    key,
    enc.encode(payloadStr)
  );

  const hashArray = Array.from(new Uint8Array(signatureBytes));
  const expectedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return signature === expectedSignature;
}
