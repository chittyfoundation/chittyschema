import { z } from 'zod';

/**
 * Zod validator for registrations table
 * Owner: chittyauth
 */
export const RegistrationsSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  chitty_id: z.string(),
  email: z.string(),
  name: z.string(),
  registered_at: z.number().int(),
  verified_at: z.number().int().optional().nullable(),
  verification_method: z.string().optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
});

/**
 * Validator for inserting into registrations
 */
export const RegistrationsSchemaInsert = RegistrationsSchema.omit({
  id: true,
  created_at: true
}).extend({
  id: z.string().uuid().optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable()
});

/**
 * Validator for updating registrations
 */
export const RegistrationsSchemaUpdate = RegistrationsSchema.partial().required({ id: true });

export type Registrations = z.infer<typeof RegistrationsSchema>;
export type RegistrationsInsert = z.infer<typeof RegistrationsSchemaInsert>;
export type RegistrationsUpdate = z.infer<typeof RegistrationsSchemaUpdate>;