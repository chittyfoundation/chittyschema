import { z } from 'zod';

/**
 * Zod validator for event_store table
 * Owner: unknown
 */
export const EventStoreSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  chitty_id: z.string(),
  aggregate_id: z.string().uuid(),
  aggregate_type: z.string(),
  event_type: z.string(),
  event_data: z.record(z.any()),
  event_version: z.number().int(),
  correlation_id: z.string().uuid().optional().nullable(),
  causation_id: z.string().uuid().optional().nullable(),
  user_id: z.string().uuid().optional().nullable(),
  ip_address: z.string().ip().optional().nullable(),
  user_agent: z.string().optional().nullable(),
  timestamp: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
  event_hash: z.string(),
  previous_hash: z.string().optional().nullable(),
});

/**
 * Validator for inserting into event_store
 */
export const EventStoreSchemaInsert = EventStoreSchema.omit({
  id: true,
  timestamp: true
}).extend({
  id: z.string().uuid().optional().nullable(),
  timestamp: z.union([z.date(), z.string().datetime()]).optional().nullable()
});

/**
 * Validator for updating event_store
 */
export const EventStoreSchemaUpdate = EventStoreSchema.partial().required({ id: true });

export type EventStore = z.infer<typeof EventStoreSchema>;
export type EventStoreInsert = z.infer<typeof EventStoreSchemaInsert>;
export type EventStoreUpdate = z.infer<typeof EventStoreSchemaUpdate>;