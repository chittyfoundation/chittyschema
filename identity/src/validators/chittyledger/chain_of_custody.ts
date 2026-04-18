import { z } from 'zod';

/**
 * Zod validator for chain_of_custody table
 * Owner: chittyledger
 */
export const ChainOfCustodySchema = z.object({
  id: z.string().uuid().optional().nullable(),
  evidence_id: z.string().uuid(),
  action: z.string(),
  performed_by: z.string().uuid(),
  ip_address: z.string().ip().optional().nullable(),
  user_agent: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
  timestamp: z.union([z.date(), z.string().datetime()]).optional().nullable(),
});

/**
 * Validator for inserting into chain_of_custody
 */
export const ChainOfCustodySchemaInsert = ChainOfCustodySchema.omit({
  id: true,
  timestamp: true
}).extend({
  id: z.string().uuid().optional().nullable(),
  timestamp: z.union([z.date(), z.string().datetime()]).optional().nullable()
});

/**
 * Validator for updating chain_of_custody
 */
export const ChainOfCustodySchemaUpdate = ChainOfCustodySchema.partial().required({ id: true });

export type ChainOfCustody = z.infer<typeof ChainOfCustodySchema>;
export type ChainOfCustodyInsert = z.infer<typeof ChainOfCustodySchemaInsert>;
export type ChainOfCustodyUpdate = z.infer<typeof ChainOfCustodySchemaUpdate>;