import { z } from 'zod';

/**
 * Zod validator for audit_logs table
 * Owner: shared
 */
export const AuditLogsSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  identity_id: z.string().uuid().optional().nullable(),
  action: z.string(),
  resource_type: z.string(),
  resource_id: z.string().uuid().optional().nullable(),
  details: z.record(z.any()).optional().nullable(),
  ip_address: z.string().ip().optional().nullable(),
  user_agent: z.string().optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
});

/**
 * Validator for inserting into audit_logs
 */
export const AuditLogsSchemaInsert = AuditLogsSchema.omit({
  id: true,
  created_at: true
}).extend({
  id: z.string().uuid().optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable()
});

/**
 * Validator for updating audit_logs
 */
export const AuditLogsSchemaUpdate = AuditLogsSchema.partial().required({ id: true });

export type AuditLogs = z.infer<typeof AuditLogsSchema>;
export type AuditLogsInsert = z.infer<typeof AuditLogsSchemaInsert>;
export type AuditLogsUpdate = z.infer<typeof AuditLogsSchemaUpdate>;