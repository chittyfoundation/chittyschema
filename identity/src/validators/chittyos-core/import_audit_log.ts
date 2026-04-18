import { z } from 'zod';

/**
 * Zod validator for import_audit_log table
 * Owner: unknown
 */
export const ImportAuditLogSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  file_id: z.string(),
  filename: z.string().optional().nullable(),
  stage: z.string(),
  status: z.string(),
  details: z.record(z.any()).optional().nullable(),
  error_message: z.string().optional().nullable(),
  imported_to: z.array(z.string()).optional().nullable(),
  chronicle_event_id: z.string().uuid().optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
});

/**
 * Validator for inserting into import_audit_log
 */
export const ImportAuditLogSchemaInsert = ImportAuditLogSchema.omit({
  id: true,
  created_at: true
}).extend({
  id: z.string().uuid().optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable()
});

/**
 * Validator for updating import_audit_log
 */
export const ImportAuditLogSchemaUpdate = ImportAuditLogSchema.partial().required({ id: true });

export type ImportAuditLog = z.infer<typeof ImportAuditLogSchema>;
export type ImportAuditLogInsert = z.infer<typeof ImportAuditLogSchemaInsert>;
export type ImportAuditLogUpdate = z.infer<typeof ImportAuditLogSchemaUpdate>;