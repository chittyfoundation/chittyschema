import { z } from 'zod';

/**
 * Zod validator for gdpr_data_subjects table
 * Owner: unknown
 */
export const GdprDataSubjectsSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  person_id: z.string().uuid().optional().nullable(),
  external_identifier: z.string().optional().nullable(),
  lawful_basis: z.string(),
  lawful_basis_details: z.string().optional().nullable(),
  consent_status: z.string().optional().nullable(),
  consent_date: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  consent_method: z.string().optional().nullable(),
  consent_evidence: z.record(z.any()).optional().nullable(),
  right_to_access_requested: z.boolean().optional().nullable(),
  right_to_rectification_requested: z.boolean().optional().nullable(),
  right_to_erasure_requested: z.boolean().optional().nullable(),
  right_to_portability_requested: z.boolean().optional().nullable(),
  right_to_object_requested: z.boolean().optional().nullable(),
  data_categories: z.array(z.string()).optional().nullable(),
  processing_purposes: z.array(z.string()).optional().nullable(),
  data_retention_period: z.any().optional().nullable(),
  data_sources: z.array(z.string()).optional().nullable(),
  third_party_recipients: z.array(z.string()).optional().nullable(),
  international_transfers: z.boolean().optional().nullable(),
  transfer_safeguards: z.string().optional().nullable(),
  erasure_completed: z.boolean().optional().nullable(),
  erasure_completed_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  rectification_completed: z.boolean().optional().nullable(),
  rectification_completed_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  updated_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  created_by: z.string().uuid().optional().nullable(),
  updated_by: z.string().uuid().optional().nullable(),
});

/**
 * Validator for inserting into gdpr_data_subjects
 */
export const GdprDataSubjectsSchemaInsert = GdprDataSubjectsSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
}).extend({
  id: z.string().uuid().optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  updated_at: z.union([z.date(), z.string().datetime()]).optional().nullable()
});

/**
 * Validator for updating gdpr_data_subjects
 */
export const GdprDataSubjectsSchemaUpdate = GdprDataSubjectsSchema.partial().required({ id: true });

export type GdprDataSubjects = z.infer<typeof GdprDataSubjectsSchema>;
export type GdprDataSubjectsInsert = z.infer<typeof GdprDataSubjectsSchemaInsert>;
export type GdprDataSubjectsUpdate = z.infer<typeof GdprDataSubjectsSchemaUpdate>;