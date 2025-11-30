import { z } from 'zod';

/**
 * Zod validator for identities table
 * Owner: chittyid
 */
export const IdentitiesSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  did: z.string(),
  biometric_hash: z.string(),
  public_key: z.string(),
  metadata: z.record(z.any()).optional().nullable(),
  status: z.string().optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  updated_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
});

/**
 * Validator for inserting into identities
 */
export const IdentitiesSchemaInsert = IdentitiesSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
}).extend({
  id: z.string().uuid().optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  updated_at: z.union([z.date(), z.string().datetime()]).optional().nullable()
});

/**
 * Validator for updating identities
 */
export const IdentitiesSchemaUpdate = IdentitiesSchema.partial().required({ id: true });

export type Identities = z.infer<typeof IdentitiesSchema>;
export type IdentitiesInsert = z.infer<typeof IdentitiesSchemaInsert>;
export type IdentitiesUpdate = z.infer<typeof IdentitiesSchemaUpdate>;