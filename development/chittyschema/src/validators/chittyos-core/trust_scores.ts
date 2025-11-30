import { z } from 'zod';

/**
 * Zod validator for trust_scores table
 * Owner: chittyscore
 */
export const TrustScoresSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  identity_id: z.string().uuid(),
  base_score: z.number().int(),
  history_score: z.number().int(),
  network_score: z.number().int(),
  risk_penalty: z.number().int(),
  final_score: z.number().int(),
  calculation_details: z.record(z.any()).optional().nullable(),
  calculated_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
});

/**
 * Validator for inserting into trust_scores
 */
export const TrustScoresSchemaInsert = TrustScoresSchema.omit({
  id: true,
  calculated_at: true
}).extend({
  id: z.string().uuid().optional().nullable(),
  calculated_at: z.union([z.date(), z.string().datetime()]).optional().nullable()
});

/**
 * Validator for updating trust_scores
 */
export const TrustScoresSchemaUpdate = TrustScoresSchema.partial().required({ id: true });

export type TrustScores = z.infer<typeof TrustScoresSchema>;
export type TrustScoresInsert = z.infer<typeof TrustScoresSchemaInsert>;
export type TrustScoresUpdate = z.infer<typeof TrustScoresSchemaUpdate>;