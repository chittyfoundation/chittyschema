import { z } from 'zod';

/**
 * Zod validator for service_registration_events table
 * Owner: unknown
 */
export const ServiceRegistrationEventsSchema = z.object({
  chitty_id: z.string(),
  registration_chitty_id: z.string(),
  /** Lifecycle event: submitted, validated, certified, published, bound_*, revoked, suspended, reactivated, deleted. */
  event_type: z.string(),
  previous_status: z.string().optional().nullable(),
  new_status: z.string(),
  actor_chitty_id: z.string().optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
});

/**
 * Validator for inserting into service_registration_events
 */
export const ServiceRegistrationEventsSchemaInsert = ServiceRegistrationEventsSchema.omit({
  created_at: true
}).extend({
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable()
});

/**
 * Validator for updating service_registration_events
 */
export const ServiceRegistrationEventsSchemaUpdate = ServiceRegistrationEventsSchema.partial();

export type ServiceRegistrationEvents = z.infer<typeof ServiceRegistrationEventsSchema>;
export type ServiceRegistrationEventsInsert = z.infer<typeof ServiceRegistrationEventsSchemaInsert>;
export type ServiceRegistrationEventsUpdate = z.infer<typeof ServiceRegistrationEventsSchemaUpdate>;