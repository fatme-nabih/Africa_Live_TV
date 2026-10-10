import { z } from 'zod';

export const checkoutRequestSchema = z.object({
  planCode: z.enum(['lumina_all_access_monthly', 'lumina_all_access_annual']),
  firstName: z.string().trim().min(1).max(50),
  lastName: z.string().trim().min(1).max(50),
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/),
  idempotencyKey: z.string().uuid(),
}).strict();

export const checkoutResponseSchema = z.object({
  checkout_url: z.string().url().nullable(),
  status: z.enum(['creating', 'pending', 'completed', 'failed', 'canceled', 'refunded', 'reconciliation_required']),
  checkout_attempt_id: z.string().min(1),
  idempotency_key: z.string().uuid().optional(),
}).strict();

export const checkoutStatusResponseSchema = z.object({
  status: z.enum(['creating', 'pending', 'completed', 'failed', 'canceled', 'refunded', 'reconciliation_required']),
  checkout_attempt_id: z.string().min(1),
  plan: z.enum(['lumina_all_access_monthly', 'lumina_all_access_annual']),
  amount: z.number().int().positive(),
  currency: z.literal('XOF'),
}).strict();
