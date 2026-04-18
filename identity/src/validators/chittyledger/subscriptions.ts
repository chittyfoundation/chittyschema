import { z } from 'zod';
import { SubscriptionStatus } from './enums.js';

/**
 * Zod validator for subscriptions table
 * Owner: chittyledger
 */
export const SubscriptionsSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  subscription_id: z.string(),
  user_id: z.string().uuid(),
  plan_name: z.string(),
  plan_price: z.number(),
  billing_cycle: z.string(),
  status: z.nativeEnum(SubscriptionStatus).optional().nullable(),
  stripe_subscription_id: z.string().optional().nullable(),
  current_period_start: z.union([z.date(), z.string()]),
  current_period_end: z.union([z.date(), z.string()]),
  cancel_at_period_end: z.boolean().optional().nullable(),
  cancelled_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  trial_start: z.union([z.date(), z.string()]).optional().nullable(),
  trial_end: z.union([z.date(), z.string()]).optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  updated_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
});

/**
 * Validator for inserting into subscriptions
 */
export const SubscriptionsSchemaInsert = SubscriptionsSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
}).extend({
  id: z.string().uuid().optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  updated_at: z.union([z.date(), z.string().datetime()]).optional().nullable()
});

/**
 * Validator for updating subscriptions
 */
export const SubscriptionsSchemaUpdate = SubscriptionsSchema.partial().required({ id: true });

export type Subscriptions = z.infer<typeof SubscriptionsSchema>;
export type SubscriptionsInsert = z.infer<typeof SubscriptionsSchemaInsert>;
export type SubscriptionsUpdate = z.infer<typeof SubscriptionsSchemaUpdate>;