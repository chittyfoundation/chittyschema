import { z } from 'zod';

/**
 * Zod validator for cases table
 * Owner: chittyledger
 */
export const CasesSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  chitty_id: z.string(),
  docket_number: z.string(),
  title: z.string(),
  case_type: z.string(),
  sub_type: z.string().optional().nullable(),
  jurisdiction_id: z.string().uuid().optional().nullable(),
  venue_id: z.string().uuid().optional().nullable(),
  judge_name: z.string().optional().nullable(),
  courtroom: z.string().optional().nullable(),
  lead_counsel_id: z.string().uuid().optional().nullable(),
  opposing_counsel_id: z.string().uuid().optional().nullable(),
  filing_date: z.union([z.date(), z.string()]).optional().nullable(),
  answer_due_date: z.union([z.date(), z.string()]).optional().nullable(),
  discovery_deadline: z.union([z.date(), z.string()]).optional().nullable(),
  motion_deadline: z.union([z.date(), z.string()]).optional().nullable(),
  trial_date: z.union([z.date(), z.string()]).optional().nullable(),
  status_conference_date: z.union([z.date(), z.string()]).optional().nullable(),
  estimated_value: z.number().optional().nullable(),
  actual_settlement: z.number().optional().nullable(),
  attorney_fees: z.number().optional().nullable(),
  court_costs: z.number().optional().nullable(),
  status: z.string().optional().nullable(),
  resolution_type: z.string().optional().nullable(),
  resolution_date: z.union([z.date(), z.string()]).optional().nullable(),
  is_confidential: z.boolean().optional().nullable(),
  confidentiality_level: z.string().optional().nullable(),
  sealed_portions: z.record(z.any()).optional().nullable(),
  parent_case_id: z.string().uuid().optional().nullable(),
  related_case_ids: z.array(z.string()).optional().nullable(),
  governing_law_ids: z.array(z.string()).optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  updated_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  created_by: z.string().uuid().optional().nullable(),
  updated_by: z.string().uuid().optional().nullable(),
});

/**
 * Validator for inserting into cases
 */
export const CasesSchemaInsert = CasesSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
}).extend({
  id: z.string().uuid().optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  updated_at: z.union([z.date(), z.string().datetime()]).optional().nullable()
});

/**
 * Validator for updating cases
 */
export const CasesSchemaUpdate = CasesSchema.partial().required({ id: true });

export type Cases = z.infer<typeof CasesSchema>;
export type CasesInsert = z.infer<typeof CasesSchemaInsert>;
export type CasesUpdate = z.infer<typeof CasesSchemaUpdate>;