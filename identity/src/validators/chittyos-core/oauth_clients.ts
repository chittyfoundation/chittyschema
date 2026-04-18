import { z } from 'zod';

/**
 * Zod validator for oauth_clients table
 * Owner: chittyauth
 */
export const OauthClientsSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  client_id: z.string(),
  client_secret_hash: z.string(),
  name: z.string(),
  redirect_uris: z.record(z.any()).optional().nullable(),
  allowed_scopes: z.record(z.any()).optional().nullable(),
  status: z.string().optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
});

/**
 * Validator for inserting into oauth_clients
 */
export const OauthClientsSchemaInsert = OauthClientsSchema.omit({
  id: true,
  created_at: true
}).extend({
  id: z.string().uuid().optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable()
});

/**
 * Validator for updating oauth_clients
 */
export const OauthClientsSchemaUpdate = OauthClientsSchema.partial().required({ id: true });

export type OauthClients = z.infer<typeof OauthClientsSchema>;
export type OauthClientsInsert = z.infer<typeof OauthClientsSchemaInsert>;
export type OauthClientsUpdate = z.infer<typeof OauthClientsSchemaUpdate>;