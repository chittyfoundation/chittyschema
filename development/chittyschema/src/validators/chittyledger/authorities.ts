import { z } from 'zod';

/**
 * Zod validator for authorities table
 * Owner: unknown
 */
export const AuthoritiesSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  chitty_id: z.string(),
  title: z.string(),
  citation: z.string().optional().nullable(),
  authority_type: z.string(),
  sub_type: z.string().optional().nullable(),
  issuing_authority: z.string(),
  jurisdiction_id: z.string().uuid().optional().nullable(),
  court_level: z.string().optional().nullable(),
  effective_date: z.union([z.date(), z.string()]).optional().nullable(),
  expiration_date: z.union([z.date(), z.string()]).optional().nullable(),
  decision_date: z.union([z.date(), z.string()]).optional().nullable(),
  publication_date: z.union([z.date(), z.string()]).optional().nullable(),
  parent_authority_id: z.string().uuid().optional().nullable(),
  hierarchy_level: z.number().int().optional().nullable(),
  precedential_value: z.string().optional().nullable(),
  full_text: z.string().optional().nullable(),
  summary: z.string().optional().nullable(),
  key_holdings: z.array(z.string()).optional().nullable(),
  cites_authorities: z.array(z.string()).optional().nullable(),
  cited_by_authorities: z.array(z.string()).optional().nullable(),
  amended_by_authorities: z.array(z.string()).optional().nullable(),
  superseded_by_authority: z.string().uuid().optional().nullable(),
  status: z.string().optional().nullable(),
  url: z.string().optional().nullable(),
  access_level: z.string().optional().nullable(),
  verification_status: z.string().optional().nullable(),
  verified_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  verified_by: z.string().uuid().optional().nullable(),
  valid_from: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  valid_to: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  version_number: z.number().int().optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  updated_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  created_by: z.string().uuid().optional().nullable(),
  updated_by: z.string().uuid().optional().nullable(),
});

/**
 * Validator for inserting into authorities
 */
export const AuthoritiesSchemaInsert = AuthoritiesSchema.omit({
  id: true,
  valid_from: true,
  created_at: true,
  updated_at: true
}).extend({
  id: z.string().uuid().optional().nullable(),
  valid_from: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  updated_at: z.union([z.date(), z.string().datetime()]).optional().nullable()
});

/**
 * Validator for updating authorities
 */
export const AuthoritiesSchemaUpdate = AuthoritiesSchema.partial().required({ id: true });

export type Authorities = z.infer<typeof AuthoritiesSchema>;
export type AuthoritiesInsert = z.infer<typeof AuthoritiesSchemaInsert>;
export type AuthoritiesUpdate = z.infer<typeof AuthoritiesSchemaUpdate>;