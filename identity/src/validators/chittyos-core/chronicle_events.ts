import { z } from 'zod';

/**
 * Zod validator for chronicle_events table
 * Owner: chittychronicle
 */
export const ChronicleEventsSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  timestamp: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  service: z.string(),
  action: z.string(),
  user_id: z.string().optional().nullable(),
  user_email: z.string().optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
  related_events: z.array(z.string()).optional().nullable(),
  triggered_by: z.string().optional().nullable(),
  integrations: z.array(z.string()).optional().nullable(),
  status: z.string().optional().nullable(),
  error_message: z.string().optional().nullable(),
  search_vector: z.any().optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  updated_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
});

/**
 * Validator for inserting into chronicle_events
 */
export const ChronicleEventsSchemaInsert = ChronicleEventsSchema.omit({
  id: true,
  timestamp: true,
  created_at: true,
  updated_at: true
}).extend({
  id: z.string().uuid().optional().nullable(),
  timestamp: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  updated_at: z.union([z.date(), z.string().datetime()]).optional().nullable()
});

/**
 * Validator for updating chronicle_events
 */
export const ChronicleEventsSchemaUpdate = ChronicleEventsSchema.partial().required({ id: true });

export type ChronicleEvents = z.infer<typeof ChronicleEventsSchema>;
export type ChronicleEventsInsert = z.infer<typeof ChronicleEventsSchemaInsert>;
export type ChronicleEventsUpdate = z.infer<typeof ChronicleEventsSchemaUpdate>;