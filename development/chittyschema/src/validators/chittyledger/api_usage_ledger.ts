import { z } from 'zod';

/**
 * Zod validator for api_usage_ledger table
 * Owner: chittyledger
 */
export const ApiUsageLedgerSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  request_id: z.string(),
  user_id: z.string().uuid().optional().nullable(),
  api_key_hash: z.string().optional().nullable(),
  endpoint: z.string(),
  method: z.string(),
  status_code: z.number().int().optional().nullable(),
  response_time_ms: z.number().int().optional().nullable(),
  request_size_bytes: z.number().int().optional().nullable(),
  response_size_bytes: z.number().int().optional().nullable(),
  ip_address: z.string().ip().optional().nullable(),
  user_agent: z.string().optional().nullable(),
  referer: z.string().optional().nullable(),
  error_message: z.string().optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
  timestamp: z.union([z.date(), z.string().datetime()]).optional().nullable(),
});

/**
 * Validator for inserting into api_usage_ledger
 */
export const ApiUsageLedgerSchemaInsert = ApiUsageLedgerSchema.omit({
  id: true,
  timestamp: true
}).extend({
  id: z.string().uuid().optional().nullable(),
  timestamp: z.union([z.date(), z.string().datetime()]).optional().nullable()
});

/**
 * Validator for updating api_usage_ledger
 */
export const ApiUsageLedgerSchemaUpdate = ApiUsageLedgerSchema.partial().required({ id: true });

export type ApiUsageLedger = z.infer<typeof ApiUsageLedgerSchema>;
export type ApiUsageLedgerInsert = z.infer<typeof ApiUsageLedgerSchemaInsert>;
export type ApiUsageLedgerUpdate = z.infer<typeof ApiUsageLedgerSchemaUpdate>;