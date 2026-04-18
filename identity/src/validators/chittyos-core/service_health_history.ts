import { z } from 'zod';

/**
 * Zod validator for service_health_history table
 * Owner: chittydiscovery
 */
export const ServiceHealthHistorySchema = z.object({
  id: z.string().uuid().optional().nullable(),
  service_id: z.string().uuid(),
  checked_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  healthy: z.boolean(),
  latency_ms: z.number().int().optional().nullable(),
  error_message: z.string().optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
});

/**
 * Validator for inserting into service_health_history
 */
export const ServiceHealthHistorySchemaInsert = ServiceHealthHistorySchema.omit({
  id: true,
  checked_at: true,
  created_at: true
}).extend({
  id: z.string().uuid().optional().nullable(),
  checked_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable()
});

/**
 * Validator for updating service_health_history
 */
export const ServiceHealthHistorySchemaUpdate = ServiceHealthHistorySchema.partial().required({ id: true });

export type ServiceHealthHistory = z.infer<typeof ServiceHealthHistorySchema>;
export type ServiceHealthHistoryInsert = z.infer<typeof ServiceHealthHistorySchemaInsert>;
export type ServiceHealthHistoryUpdate = z.infer<typeof ServiceHealthHistorySchemaUpdate>;