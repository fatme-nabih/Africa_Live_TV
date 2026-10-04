import { NabooPayApiError } from './naboopay';
export function paymentCreationFailureStatus(error: unknown) {
  // Transport errors, invalid success payloads and server failures can all
  // occur after acceptance. Only a definite rejection permits a new order.
  return error instanceof NabooPayApiError &&
    ['validation', 'configuration', 'limitation'].includes(error.type)
    ? 'failed' as const : 'reconciliation_required' as const;
}
