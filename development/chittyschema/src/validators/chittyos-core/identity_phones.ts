import { z } from 'zod';

/**
 * Zod validator for identity_phones table
 * Owner: unknown
 */
export const IdentityPhonesSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  identity_id: z.string().uuid(),
  phone_number: z.string(),
  verified: z.boolean().optional().nullable(),
  verified_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  primary_phone: z.boolean().optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  updated_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
});

/**
 * Validator for inserting into identity_phones
 */
export const IdentityPhonesSchemaInsert = IdentityPhonesSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
}).extend({
  id: z.string().uuid().optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  updated_at: z.union([z.date(), z.string().datetime()]).optional().nullable()
});

/**
 * Validator for updating identity_phones
 */
export const IdentityPhonesSchemaUpdate = IdentityPhonesSchema.partial().required({ id: true });

export type IdentityPhones = z.infer<typeof IdentityPhonesSchema>;
export type IdentityPhonesInsert = z.infer<typeof IdentityPhonesSchemaInsert>;
export type IdentityPhonesUpdate = z.infer<typeof IdentityPhonesSchemaUpdate>;