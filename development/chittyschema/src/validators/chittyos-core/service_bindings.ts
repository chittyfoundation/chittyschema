import { z } from 'zod';

/**
 * Zod validator for service_bindings table
 * Owner: unknown
 */
export const ServiceBindingsSchema = z.object({
  chitty_id: z.string(),
  registration_chitty_id: z.string(),
  /** Ecosystem service type: "chronicle" (audit), "registry" (directory), "discovery" (service mesh). */
  binding_type: z.string(),
  binding_chitty_id: z.string().optional().nullable(),
  url: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  bound_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  error_message: z.string().optional().nullable(),
  retry_count: z.number().int().optional().nullable(),
  last_retry_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  updated_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
});

/**
 * Validator for inserting into service_bindings
 */
export const ServiceBindingsSchemaInsert = ServiceBindingsSchema.omit({
  created_at: true,
  updated_at: true
}).extend({
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  updated_at: z.union([z.date(), z.string().datetime()]).optional().nullable()
});

/**
 * Validator for updating service_bindings
 */
export const ServiceBindingsSchemaUpdate = ServiceBindingsSchema.partial();

export type ServiceBindings = z.infer<typeof ServiceBindingsSchema>;
export type ServiceBindingsInsert = z.infer<typeof ServiceBindingsSchemaInsert>;
export type ServiceBindingsUpdate = z.infer<typeof ServiceBindingsSchemaUpdate>;