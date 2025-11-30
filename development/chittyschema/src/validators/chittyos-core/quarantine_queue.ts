import { z } from 'zod';

/**
 * Zod validator for quarantine_queue table
 * Owner: unknown
 */
export const QuarantineQueueSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  source: z.string(),
  source_file_id: z.string(),
  source_path: z.string().optional().nullable(),
  filename: z.string(),
  filesize: z.number().int().optional().nullable(),
  mime_type: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  quality_result: z.record(z.any()),
  confidence: z.number().optional().nullable(),
  issues: z.record(z.any()).optional().nullable(),
  status: z.string().optional().nullable(),
  reviewed_by: z.string().optional().nullable(),
  reviewed_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  reviewer_notes: z.string().optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  updated_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
});

/**
 * Validator for inserting into quarantine_queue
 */
export const QuarantineQueueSchemaInsert = QuarantineQueueSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
}).extend({
  id: z.string().uuid().optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  updated_at: z.union([z.date(), z.string().datetime()]).optional().nullable()
});

/**
 * Validator for updating quarantine_queue
 */
export const QuarantineQueueSchemaUpdate = QuarantineQueueSchema.partial().required({ id: true });

export type QuarantineQueue = z.infer<typeof QuarantineQueueSchema>;
export type QuarantineQueueInsert = z.infer<typeof QuarantineQueueSchemaInsert>;
export type QuarantineQueueUpdate = z.infer<typeof QuarantineQueueSchemaUpdate>;