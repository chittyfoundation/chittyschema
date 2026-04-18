import { z } from 'zod';

/**
 * Zod validator for audit_log table
 * Owner: chittyledger
 */
export const AuditLogSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  event_type: z.string(),
  entity_type: z.string(),
  entity_id: z.string().uuid().optional().nullable(),
  user_id: z.string().uuid().optional().nullable(),
  action: z.string(),
  old_value: z.record(z.any()).optional().nullable(),
  new_value: z.record(z.any()).optional().nullable(),
  ip_address: z.string().ip().optional().nullable(),
  user_agent: z.string().optional().nullable(),
  timestamp: z.union([z.date(), z.string().datetime()]).optional().nullable(),
});

/**
 * Validator for inserting into audit_log
 */
export const AuditLogSchemaInsert = AuditLogSchema.omit({
  id: true,
  timestamp: true
}).extend({
  id: z.string().uuid().optional().nullable(),
  timestamp: z.union([z.date(), z.string().datetime()]).optional().nullable()
});

/**
 * Validator for updating audit_log
 */
export const AuditLogSchemaUpdate = AuditLogSchema.partial().required({ id: true });

export type AuditLog = z.infer<typeof AuditLogSchema>;
export type AuditLogInsert = z.infer<typeof AuditLogSchemaInsert>;
export type AuditLogUpdate = z.infer<typeof AuditLogSchemaUpdate>;