import { z } from 'zod';

/**
 * Zod validator for atomic_facts table
 * Owner: chittyledger
 */
export const AtomicFactsSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  chitty_id: z.string(),
  evidence_id: z.string().uuid().optional().nullable(),
  case_id: z.string().uuid(),
  asserted_by: z.string().uuid().optional().nullable(),
  fact_text: z.string(),
  fact_type: z.string(),
  related_person_id: z.string().uuid().optional().nullable(),
  related_place_id: z.string().uuid().optional().nullable(),
  related_thing_id: z.string().uuid().optional().nullable(),
  related_event_id: z.string().uuid().optional().nullable(),
  related_authority_id: z.string().uuid().optional().nullable(),
  location_in_document: z.string().optional().nullable(),
  page_number: z.number().int().optional().nullable(),
  line_number: z.number().int().optional().nullable(),
  timestamp_in_media: z.any().optional().nullable(),
  classification_level: z.string(),
  certainty_level: z.string().optional().nullable(),
  weight: z.number().optional().nullable(),
  credibility_factors: z.array(z.string()).optional().nullable(),
  bias_indicators: z.array(z.string()).optional().nullable(),
  supports_fact_ids: z.array(z.string()).optional().nullable(),
  contradicts_fact_ids: z.array(z.string()).optional().nullable(),
  temporal_sequence: z.number().int().optional().nullable(),
  logical_dependency_ids: z.array(z.string()).optional().nullable(),
  verified: z.boolean().optional().nullable(),
  verified_by: z.string().uuid().optional().nullable(),
  verified_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  verification_method: z.string().optional().nullable(),
  discoverable: z.boolean().optional().nullable(),
  privileged: z.boolean().optional().nullable(),
  privilege_type: z.string().optional().nullable(),
  extracted_by_ai: z.boolean().optional().nullable(),
  ai_confidence_score: z.number().optional().nullable(),
  ai_model_version: z.string().optional().nullable(),
  human_reviewed: z.boolean().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  legal_elements: z.array(z.string()).optional().nullable(),
  fact_date: z.union([z.date(), z.string()]).optional().nullable(),
  fact_time: z.any().optional().nullable(),
  duration: z.any().optional().nullable(),
  valid_from: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  valid_to: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  version_number: z.number().int().optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  updated_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  created_by: z.string().uuid().optional().nullable(),
  updated_by: z.string().uuid().optional().nullable(),
});

/**
 * Validator for inserting into atomic_facts
 */
export const AtomicFactsSchemaInsert = AtomicFactsSchema.omit({
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
 * Validator for updating atomic_facts
 */
export const AtomicFactsSchemaUpdate = AtomicFactsSchema.partial().required({ id: true });

export type AtomicFacts = z.infer<typeof AtomicFactsSchema>;
export type AtomicFactsInsert = z.infer<typeof AtomicFactsSchemaInsert>;
export type AtomicFactsUpdate = z.infer<typeof AtomicFactsSchemaUpdate>;