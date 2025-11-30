import { z } from 'zod';

/**
 * Zod validator for contradictions table
 * Owner: chittyledger
 */
export const ContradictionsSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  fact_a_id: z.string().uuid(),
  fact_b_id: z.string().uuid(),
  contradiction_type: z.string(),
  severity: z.string(),
  explanation: z.string().optional().nullable(),
  detected_by: z.string().optional().nullable(),
  detected_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  resolved: z.boolean().optional().nullable(),
  resolution_notes: z.string().optional().nullable(),
});

/**
 * Validator for inserting into contradictions
 */
export const ContradictionsSchemaInsert = ContradictionsSchema.omit({
  id: true,
  detected_at: true
}).extend({
  id: z.string().uuid().optional().nullable(),
  detected_at: z.union([z.date(), z.string().datetime()]).optional().nullable()
});

/**
 * Validator for updating contradictions
 */
export const ContradictionsSchemaUpdate = ContradictionsSchema.partial().required({ id: true });

export type Contradictions = z.infer<typeof ContradictionsSchema>;
export type ContradictionsInsert = z.infer<typeof ContradictionsSchemaInsert>;
export type ContradictionsUpdate = z.infer<typeof ContradictionsSchemaUpdate>;