import { z } from 'zod';

/**
 * Zod validator for entity_relationships table
 * Owner: unknown
 */
export const EntityRelationshipsSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  chitty_id: z.string(),
  source_entity_type: z.string(),
  source_entity_id: z.string().uuid(),
  target_entity_type: z.string(),
  target_entity_id: z.string().uuid(),
  relationship_type: z.string(),
  relationship_subtype: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  strength_score: z.number().optional().nullable(),
  confidence_score: z.number().optional().nullable(),
  supporting_evidence_ids: z.array(z.string()).optional().nullable(),
  supporting_fact_ids: z.array(z.string()).optional().nullable(),
  contradicting_evidence_ids: z.array(z.string()).optional().nullable(),
  discovered_by: z.string().optional().nullable(),
  discovery_method: z.string().optional().nullable(),
  ai_model_version: z.string().optional().nullable(),
  legal_relevance: z.string().optional().nullable(),
  potential_conflicts: z.boolean().optional().nullable(),
  relationship_start_date: z.union([z.date(), z.string()]).optional().nullable(),
  relationship_end_date: z.union([z.date(), z.string()]).optional().nullable(),
  valid_from: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  valid_to: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  status: z.string().optional().nullable(),
  verified: z.boolean().optional().nullable(),
  verified_by: z.string().uuid().optional().nullable(),
  verified_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  updated_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  created_by: z.string().uuid().optional().nullable(),
  updated_by: z.string().uuid().optional().nullable(),
});

/**
 * Validator for inserting into entity_relationships
 */
export const EntityRelationshipsSchemaInsert = EntityRelationshipsSchema.omit({
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
 * Validator for updating entity_relationships
 */
export const EntityRelationshipsSchemaUpdate = EntityRelationshipsSchema.partial().required({ id: true });

export type EntityRelationships = z.infer<typeof EntityRelationshipsSchema>;
export type EntityRelationshipsInsert = z.infer<typeof EntityRelationshipsSchemaInsert>;
export type EntityRelationshipsUpdate = z.infer<typeof EntityRelationshipsSchemaUpdate>;