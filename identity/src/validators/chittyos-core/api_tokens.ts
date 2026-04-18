import { z } from 'zod';

/**
 * Zod validator for api_tokens table
 * Owner: chittyauth
 */
export const ApiTokensSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  identity_id: z.string().uuid().optional().nullable(),
  token_hash: z.string(),
  name: z.string(),
  scopes: z.array(z.string()).optional().nullable(),
  status: z.string().optional().nullable(),
  last_used_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  expires_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  /** Token type: bearer (JWT) or certificate (mTLS) */
  type: z.string().optional().nullable(),
  /** PEM-encoded X.509 certificate for mTLS authentication */
  certificate_pem: z.string().optional().nullable(),
  /** Certificate serial number for revocation checking */
  certificate_serial: z.string().optional().nullable(),
  /** SHA-256 fingerprint of the certificate */
  certificate_fingerprint: z.string().optional().nullable(),
});

/**
 * Validator for inserting into api_tokens
 */
export const ApiTokensSchemaInsert = ApiTokensSchema.omit({
  id: true,
  created_at: true
}).extend({
  id: z.string().uuid().optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable()
});

/**
 * Validator for updating api_tokens
 */
export const ApiTokensSchemaUpdate = ApiTokensSchema.partial().required({ id: true });

export type ApiTokens = z.infer<typeof ApiTokensSchema>;
export type ApiTokensInsert = z.infer<typeof ApiTokensSchemaInsert>;
export type ApiTokensUpdate = z.infer<typeof ApiTokensSchemaUpdate>;