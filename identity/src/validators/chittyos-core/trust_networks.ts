import { z } from 'zod';

/**
 * Zod validator for trust_networks table
 * Owner: chittyscore
 */
export const TrustNetworksSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  identity_a: z.string().uuid(),
  identity_b: z.string().uuid(),
  trust_score: z.number().int(),
  relationship: z.string(),
  metadata: z.record(z.any()).optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  updated_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
});

/**
 * Validator for inserting into trust_networks
 */
export const TrustNetworksSchemaInsert = TrustNetworksSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
}).extend({
  id: z.string().uuid().optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  updated_at: z.union([z.date(), z.string().datetime()]).optional().nullable()
});

/**
 * Validator for updating trust_networks
 */
export const TrustNetworksSchemaUpdate = TrustNetworksSchema.partial().required({ id: true });

export type TrustNetworks = z.infer<typeof TrustNetworksSchema>;
export type TrustNetworksInsert = z.infer<typeof TrustNetworksSchemaInsert>;
export type TrustNetworksUpdate = z.infer<typeof TrustNetworksSchemaUpdate>;