import { z } from 'zod';

/**
 * Zod validator for case_parties table
 * Owner: unknown
 */
export const CasePartiesSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  case_id: z.string().uuid(),
  person_id: z.string().uuid(),
  role: z.string(),
  party_number: z.number().int().optional().nullable(),
  status: z.string().optional().nullable(),
  service_address_id: z.string().uuid().optional().nullable(),
  service_method: z.string().optional().nullable(),
  served_date: z.union([z.date(), z.string()]).optional().nullable(),
  served_by: z.string().uuid().optional().nullable(),
  counsel_id: z.string().uuid().optional().nullable(),
  pro_se: z.boolean().optional().nullable(),
  added_date: z.union([z.date(), z.string()]).optional().nullable(),
  removed_date: z.union([z.date(), z.string()]).optional().nullable(),
  notes: z.string().optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
});

/**
 * Validator for inserting into case_parties
 */
export const CasePartiesSchemaInsert = CasePartiesSchema.omit({
  id: true,
  created_at: true
}).extend({
  id: z.string().uuid().optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable()
});

/**
 * Validator for updating case_parties
 */
export const CasePartiesSchemaUpdate = CasePartiesSchema.partial().required({ id: true });

export type CaseParties = z.infer<typeof CasePartiesSchema>;
export type CasePartiesInsert = z.infer<typeof CasePartiesSchemaInsert>;
export type CasePartiesUpdate = z.infer<typeof CasePartiesSchemaUpdate>;