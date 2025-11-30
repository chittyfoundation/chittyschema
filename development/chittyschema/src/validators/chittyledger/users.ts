import { z } from 'zod';

/**
 * Zod validator for users table
 * Owner: chittyledger
 */
export const UsersSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  chitty_id: z.string(),
  email: z.string(),
  password_hash: z.string().optional().nullable(),
  two_fa_secret: z.string().optional().nullable(),
  two_fa_enabled: z.boolean().optional().nullable(),
  role: z.string(),
  permissions: z.array(z.string()).optional().nullable(),
  bar_number: z.string().optional().nullable(),
  license_state: z.string().optional().nullable(),
  license_expiration: z.union([z.date(), z.string()]).optional().nullable(),
  last_login: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  login_count: z.number().int().optional().nullable(),
  failed_login_attempts: z.number().int().optional().nullable(),
  account_locked: z.boolean().optional().nullable(),
  account_locked_until: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  linked_person_id: z.string().uuid().optional().nullable(),
  trust_score: z.number().optional().nullable(),
  verified: z.boolean().optional().nullable(),
  verified_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  verified_by: z.string().uuid().optional().nullable(),
  current_session_id: z.string().optional().nullable(),
  session_data: z.record(z.any()).optional().nullable(),
  preferences: z.record(z.any()).optional().nullable(),
  status: z.string().optional().nullable(),
  gdpr_deleted: z.boolean().optional().nullable(),
  gdpr_deleted_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  updated_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  created_by: z.string().uuid().optional().nullable(),
  updated_by: z.string().uuid().optional().nullable(),
});

/**
 * Validator for inserting into users
 */
export const UsersSchemaInsert = UsersSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
}).extend({
  id: z.string().uuid().optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  updated_at: z.union([z.date(), z.string().datetime()]).optional().nullable()
});

/**
 * Validator for updating users
 */
export const UsersSchemaUpdate = UsersSchema.partial().required({ id: true });

export type Users = z.infer<typeof UsersSchema>;
export type UsersInsert = z.infer<typeof UsersSchemaInsert>;
export type UsersUpdate = z.infer<typeof UsersSchemaUpdate>;