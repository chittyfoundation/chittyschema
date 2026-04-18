import { z } from 'zod';

/**
 * Zod validator for oauth_authorization_codes table
 * Owner: chittyauth
 */
export const OauthAuthorizationCodesSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  code: z.string(),
  client_id: z.string(),
  redirect_uri: z.string(),
  scope: z.string(),
  identity_did: z.string().optional().nullable(),
  code_challenge: z.string().optional().nullable(),
  expires_at: z.union([z.date(), z.string().datetime()]),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
});

/**
 * Validator for inserting into oauth_authorization_codes
 */
export const OauthAuthorizationCodesSchemaInsert = OauthAuthorizationCodesSchema.omit({
  id: true,
  created_at: true
}).extend({
  id: z.string().uuid().optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable()
});

/**
 * Validator for updating oauth_authorization_codes
 */
export const OauthAuthorizationCodesSchemaUpdate = OauthAuthorizationCodesSchema.partial().required({ id: true });

export type OauthAuthorizationCodes = z.infer<typeof OauthAuthorizationCodesSchema>;
export type OauthAuthorizationCodesInsert = z.infer<typeof OauthAuthorizationCodesSchemaInsert>;
export type OauthAuthorizationCodesUpdate = z.infer<typeof OauthAuthorizationCodesSchemaUpdate>;