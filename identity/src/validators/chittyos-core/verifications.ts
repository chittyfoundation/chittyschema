import { z } from 'zod';

/**
 * Zod validator for verifications table
 * Owner: chittyverify
 */
export const VerificationsSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  identity_id: z.string().uuid(),
  credential_id: z.string().uuid().optional().nullable(),
  methods: z.array(z.string()),
  result: z.boolean(),
  trust_score: z.number().int(),
  confidence: z.number().optional().nullable(),
  risk_factors: z.record(z.any()).optional().nullable(),
  location: z.any().optional().nullable(),
  ip_address: z.string().ip().optional().nullable(),
  user_agent: z.string().optional().nullable(),
  verified_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
});

/**
 * Validator for inserting into verifications
 */
export const VerificationsSchemaInsert = VerificationsSchema.omit({
  id: true,
  verified_at: true
}).extend({
  id: z.string().uuid().optional().nullable(),
  verified_at: z.union([z.date(), z.string().datetime()]).optional().nullable()
});

/**
 * Validator for updating verifications
 */
export const VerificationsSchemaUpdate = VerificationsSchema.partial().required({ id: true });

export type Verifications = z.infer<typeof VerificationsSchema>;
export type VerificationsInsert = z.infer<typeof VerificationsSchemaInsert>;
export type VerificationsUpdate = z.infer<typeof VerificationsSchemaUpdate>;