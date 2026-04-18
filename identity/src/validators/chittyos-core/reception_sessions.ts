import { z } from 'zod';

/**
 * Zod validator for reception_sessions table
 * Owner: chittyreception
 */
export const ReceptionSessionsSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  identity_id: z.string().uuid(),
  phone_number: z.string(),
  status: z.string().optional().nullable(),
  context: z.record(z.any()).optional().nullable(),
  ai_summary: z.string().optional().nullable(),
  last_interaction_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  updated_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
});

/**
 * Validator for inserting into reception_sessions
 */
export const ReceptionSessionsSchemaInsert = ReceptionSessionsSchema.omit({
  id: true,
  last_interaction_at: true,
  created_at: true,
  updated_at: true
}).extend({
  id: z.string().uuid().optional().nullable(),
  last_interaction_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  updated_at: z.union([z.date(), z.string().datetime()]).optional().nullable()
});

/**
 * Validator for updating reception_sessions
 */
export const ReceptionSessionsSchemaUpdate = ReceptionSessionsSchema.partial().required({ id: true });

export type ReceptionSessions = z.infer<typeof ReceptionSessionsSchema>;
export type ReceptionSessionsInsert = z.infer<typeof ReceptionSessionsSchemaInsert>;
export type ReceptionSessionsUpdate = z.infer<typeof ReceptionSessionsSchemaUpdate>;