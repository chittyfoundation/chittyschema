import { z } from 'zod';

/**
 * Zod validator for evidence table
 * Owner: chittyledger
 */
export const EvidenceSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  chitty_id: z.string(),
  case_id: z.string().uuid(),
  thing_id: z.string().uuid(),
  evidence_number: z.string().optional().nullable(),
  evidence_type: z.string().optional().nullable(),
  evidence_tier: z.string(),
  weight: z.number().optional().nullable(),
  authentication_method: z.string().optional().nullable(),
  authenticated_by: z.string().uuid().optional().nullable(),
  authentication_date: z.union([z.date(), z.string()]).optional().nullable(),
  chain_of_custody_verified: z.boolean().optional().nullable(),
  custody_hash: z.string().optional().nullable(),
  minting_status: z.string().optional().nullable(),
  block_number: z.string().optional().nullable(),
  transaction_hash: z.string().optional().nullable(),
  offered_date: z.union([z.date(), z.string()]).optional().nullable(),
  admitted_date: z.union([z.date(), z.string()]).optional().nullable(),
  admissibility_ruling: z.string().optional().nullable(),
  exclusion_reason: z.string().optional().nullable(),
  foundation_witnesses: z.array(z.string()).optional().nullable(),
  foundation_authorities: z.array(z.string()).optional().nullable(),
  objections_raised: z.array(z.string()).optional().nullable(),
  objection_responses: z.array(z.string()).optional().nullable(),
  submitted_by: z.string().uuid().optional().nullable(),
  submission_date: z.union([z.date(), z.string()]).optional().nullable(),
  discovery_date: z.union([z.date(), z.string()]).optional().nullable(),
  production_request: z.string().optional().nullable(),
  content_summary: z.string().optional().nullable(),
  key_facts_extracted: z.array(z.string()).optional().nullable(),
  status: z.string().optional().nullable(),
  valid_from: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  valid_to: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  version_number: z.number().int().optional().nullable(),
  notes: z.string().optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  updated_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  created_by: z.string().uuid().optional().nullable(),
  updated_by: z.string().uuid().optional().nullable(),
});

/**
 * Validator for inserting into evidence
 */
export const EvidenceSchemaInsert = EvidenceSchema.omit({
  id: true,
  valid_from: true,
  created_at: true,
  updated_at: true
}).extend({
  id: z.string().uuid().optional().nullable(),
  valid_from: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  updated_at: z.union([z.date(), z.string().datetime()]).optional().nullable()
});

/**
 * Validator for updating evidence
 */
export const EvidenceSchemaUpdate = EvidenceSchema.partial().required({ id: true });

export type Evidence = z.infer<typeof EvidenceSchema>;
export type EvidenceInsert = z.infer<typeof EvidenceSchemaInsert>;
export type EvidenceUpdate = z.infer<typeof EvidenceSchemaUpdate>;