import { z } from 'zod';

/**
 * Zod validator for credentials table
 * Owner: chittyid
 */
export const CredentialsSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  identity_id: z.string().uuid(),
  type: z.string(),
  issuer_did: z.string(),
  credential_data: z.record(z.any()),
  qr_code: z.string().optional().nullable(),
  nfc_data: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  issued_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  expires_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
});

/**
 * Validator for inserting into credentials
 */
export const CredentialsSchemaInsert = CredentialsSchema.omit({
  id: true,
  issued_at: true,
  created_at: true
}).extend({
  id: z.string().uuid().optional().nullable(),
  issued_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable()
});

/**
 * Validator for updating credentials
 */
export const CredentialsSchemaUpdate = CredentialsSchema.partial().required({ id: true });

export type Credentials = z.infer<typeof CredentialsSchema>;
export type CredentialsInsert = z.infer<typeof CredentialsSchemaInsert>;
export type CredentialsUpdate = z.infer<typeof CredentialsSchemaUpdate>;