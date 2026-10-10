import type { z } from 'zod';
import type { checkoutResponseSchema } from './payment-contracts';

export type CheckoutStatus = z.infer<typeof checkoutResponseSchema>['status'];
export function isTerminalCheckout(status: CheckoutStatus) {
  return ['completed', 'failed', 'canceled', 'refunded'].includes(status);
}

export function checkoutAction(status: CheckoutStatus, checkoutUrl: string | null) {
  if (isTerminalCheckout(status)) return 'finished' as const;
  if (status === 'pending' && checkoutUrl) return 'checkout' as const;
  return 'track' as const;
}

export function actionableCheckoutUrl(status: CheckoutStatus, url: string | null) {
  return checkoutAction(status, url) === 'checkout' ? url : null;
}

export function safeCheckoutDestination(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') ||
      !(url.hostname === 'checkout.naboopay.com' || url.hostname.endsWith('.naboopay.com'))) return null;
    return url.href;
  } catch { return null; }
}
