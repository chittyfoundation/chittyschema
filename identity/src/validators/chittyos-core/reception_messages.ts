import { z } from 'zod';

/**
 * Zod validator for reception_messages table
 * Owner: chittyreception
 */
export const ReceptionMessagesSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  identity_id: z.string().uuid(),
  message_id: z.string(),
  direction: z.string(),
  from_number: z.string(),
  to_number: z.string(),
  body: z.string(),
  status: z.string().optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  updated_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
});

/**
 * Validator for inserting into reception_messages
 */
export const ReceptionMessagesSchemaInsert = ReceptionMessagesSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
}).extend({
  id: z.string().uuid().optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  updated_at: z.union([z.date(), z.string().datetime()]).optional().nullable()
});

/**
 * Validator for updating reception_messages
 */
export const ReceptionMessagesSchemaUpdate = ReceptionMessagesSchema.partial().required({ id: true });

export type ReceptionMessages = z.infer<typeof ReceptionMessagesSchema>;
export type ReceptionMessagesInsert = z.infer<typeof ReceptionMessagesSchemaInsert>;
export type ReceptionMessagesUpdate = z.infer<typeof ReceptionMessagesSchemaUpdate>;