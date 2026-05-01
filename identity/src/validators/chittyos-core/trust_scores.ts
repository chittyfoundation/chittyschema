import { z } from 'zod';

/**
 * Zod validator for trust_scores table
 * Owner: chittyscore
 * Source of truth: production schema in chittyos-core (project restless-grass-40598426)
 *
 * Column families:
 *   - Pre-TY/VY/RY (legacy, retained until consumers migrate): base_score 0..40,
 *     history_score 0..30, network_score 0..20, risk_penalty 0..10, final_score 0..100
 *   - TY/VY/RY (canonical, added by 004_trust_scores_ty_vy_ry.sql, applied 2026-05-01):
 *     ty_score / vy_score / ry_score in [0, 1]
 *   - Reckoning metadata: signal_count, reckoned_at, anchor_tx_hash
 */
export const TrustScoresSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  identity_id: z.string().uuid(),

  // Pre-TY/VY/RY scoring (DB-level CHECK constraints enforce ranges)
  base_score: z.number().int().min(0).max(40),
  history_score: z.number().int().min(0).max(30),
  network_score: z.number().int().min(0).max(20),
  risk_penalty: z.number().int().min(0).max(10),
  final_score: z.number().int().min(0).max(100),

  calculation_details: z.record(z.any()).optional().nullable(),
  calculated_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),

  // TY/VY/RY canonical scoring (numeric(5,4), nullable, default 0)
  ty_score: z.number().min(0).max(1).optional().nullable(),
  vy_score: z.number().min(0).max(1).optional().nullable(),
  ry_score: z.number().min(0).max(1).optional().nullable(),
  signal_count: z.number().int().min(0).optional().nullable(),
  reckoned_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  anchor_tx_hash: z.string().max(66).optional().nullable(),
});

/**
 * Validator for inserting into trust_scores
 */
export const TrustScoresSchemaInsert = TrustScoresSchema.omit({
  id: true,
  calculated_at: true,
  reckoned_at: true,
}).extend({
  id: z.string().uuid().optional().nullable(),
  calculated_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  reckoned_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
});

/**
 * Validator for updating trust_scores
 */
export const TrustScoresSchemaUpdate = TrustScoresSchema.partial().required({ id: true });

export type TrustScores = z.infer<typeof TrustScoresSchema>;
export type TrustScoresInsert = z.infer<typeof TrustScoresSchemaInsert>;
export type TrustScoresUpdate = z.infer<typeof TrustScoresSchemaUpdate>;
