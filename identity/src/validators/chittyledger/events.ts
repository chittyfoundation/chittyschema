import { z } from 'zod';

/**
 * Zod validator for events table
 * Owner: unknown
 */
export const EventsSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  chitty_id: z.string(),
  name: z.string(),
  description: z.string().optional().nullable(),
  event_type: z.string(),
  sub_type: z.string().optional().nullable(),
  start_time: z.union([z.date(), z.string().datetime()]),
  end_time: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  timezone: z.string().optional().nullable(),
  duration_minutes: z.number().int().optional().nullable(),
  primary_person_id: z.string().uuid().optional().nullable(),
  secondary_person_id: z.string().uuid().optional().nullable(),
  witness_ids: z.array(z.string()).optional().nullable(),
  location_id: z.string().uuid().optional().nullable(),
  related_thing_ids: z.array(z.string()).optional().nullable(),
  parent_event_id: z.string().uuid().optional().nullable(),
  sequence_number: z.number().int().optional().nullable(),
  amount: z.number().optional().nullable(),
  currency: z.string().optional().nullable(),
  from_account_id: z.string().uuid().optional().nullable(),
  to_account_id: z.string().uuid().optional().nullable(),
  legal_significance: z.string().optional().nullable(),
  statutory_deadline: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  status: z.string().optional().nullable(),
  outcome: z.string().optional().nullable(),
  outcome_details: z.record(z.any()).optional().nullable(),
  evidence_ids: z.array(z.string()).optional().nullable(),
  document_ids: z.array(z.string()).optional().nullable(),
  is_confidential: z.boolean().optional().nullable(),
  confidentiality_level: z.string().optional().nullable(),
  verification_status: z.string().optional().nullable(),
  verified_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  verified_by: z.string().uuid().optional().nullable(),
  valid_from: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  valid_to: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  version_number: z.number().int().optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  updated_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  created_by: z.string().uuid().optional().nullable(),
  updated_by: z.string().uuid().optional().nullable(),
});

/**
 * Validator for inserting into events
 */
export const EventsSchemaInsert = EventsSchema.omit({
  id: true,
  valid_from: true,
  created_at: true,
  updated_at: true
}).extend({
  id: z.string().uuid().optional().nullable(),
  valid_from: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  updated_at: z.union([z.date(), z.string().datetime()]).optional().nullable()
});

/**
 * Validator for updating events
 */
export const EventsSchemaUpdate = EventsSchema.partial().required({ id: true });

export type Events = z.infer<typeof EventsSchema>;
export type EventsInsert = z.infer<typeof EventsSchemaInsert>;
export type EventsUpdate = z.infer<typeof EventsSchemaUpdate>;