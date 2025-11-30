import { z } from 'zod';

/**
 * Zod validator for people table
 * Owner: unknown
 */
export const PeopleSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  chitty_id: z.string(),
  first_name: z.string().optional().nullable(),
  middle_name: z.string().optional().nullable(),
  last_name: z.string().optional().nullable(),
  legal_name: z.string(),
  aliases: z.array(z.string()).optional().nullable(),
  entity_type: z.string(),
  sub_type: z.string().optional().nullable(),
  ssn: z.string().optional().nullable(),
  ein: z.string().optional().nullable(),
  foreign_id: z.string().optional().nullable(),
  date_of_birth: z.union([z.date(), z.string()]).optional().nullable(),
  date_of_incorporation: z.union([z.date(), z.string()]).optional().nullable(),
  date_of_dissolution: z.union([z.date(), z.string()]).optional().nullable(),
  place_of_birth_id: z.string().uuid().optional().nullable(),
  incorporation_place_id: z.string().uuid().optional().nullable(),
  primary_address_id: z.string().uuid().optional().nullable(),
  parent_entity_id: z.string().uuid().optional().nullable(),
  status: z.string().optional().nullable(),
  verification_status: z.string().optional().nullable(),
  verification_method: z.string().optional().nullable(),
  verified_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  verified_by: z.string().uuid().optional().nullable(),
  gdpr_lawful_basis: z.string().optional().nullable(),
  gdpr_consent_status: z.string().optional().nullable(),
  gdpr_deleted: z.boolean().optional().nullable(),
  gdpr_deleted_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  retention_period: z.any().optional().nullable(),
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
 * Validator for inserting into people
 */
export const PeopleSchemaInsert = PeopleSchema.omit({
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
 * Validator for updating people
 */
export const PeopleSchemaUpdate = PeopleSchema.partial().required({ id: true });

export type People = z.infer<typeof PeopleSchema>;
export type PeopleInsert = z.infer<typeof PeopleSchemaInsert>;
export type PeopleUpdate = z.infer<typeof PeopleSchemaUpdate>;