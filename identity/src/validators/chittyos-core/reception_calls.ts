import { z } from 'zod';

/**
 * Zod validator for reception_calls table
 * Owner: chittyreception
 */
export const ReceptionCallsSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  identity_id: z.string().uuid(),
  call_id: z.string(),
  direction: z.string(),
  from_number: z.string(),
  to_number: z.string(),
  status: z.string().optional().nullable(),
  duration_seconds: z.number().int().optional().nullable(),
  recording_url: z.string().optional().nullable(),
  transcription: z.string().optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
  started_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  answered_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  ended_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  updated_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
});

/**
 * Validator for inserting into reception_calls
 */
export const ReceptionCallsSchemaInsert = ReceptionCallsSchema.omit({
  id: true,
  started_at: true,
  created_at: true,
  updated_at: true
}).extend({
  id: z.string().uuid().optional().nullable(),
  started_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  updated_at: z.union([z.date(), z.string().datetime()]).optional().nullable()
});

/**
 * Validator for updating reception_calls
 */
export const ReceptionCallsSchemaUpdate = ReceptionCallsSchema.partial().required({ id: true });

export type ReceptionCalls = z.infer<typeof ReceptionCallsSchema>;
export type ReceptionCallsInsert = z.infer<typeof ReceptionCallsSchemaInsert>;
export type ReceptionCallsUpdate = z.infer<typeof ReceptionCallsSchemaUpdate>;