import { z } from 'zod';

/**
 * Zod validator for things table
 * Owner: unknown
 */
export const ThingsSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  chitty_id: z.string(),
  name: z.string(),
  description: z.string().optional().nullable(),
  thing_type: z.string(),
  sub_type: z.string().optional().nullable(),
  serial_number: z.string().optional().nullable(),
  model_number: z.string().optional().nullable(),
  manufacturer: z.string().optional().nullable(),
  year_manufactured: z.number().int().optional().nullable(),
  physical_condition: z.string().optional().nullable(),
  current_owner_id: z.string().uuid().optional().nullable(),
  ownership_type: z.string().optional().nullable(),
  ownership_percentage: z.number().optional().nullable(),
  current_value: z.number().optional().nullable(),
  currency: z.string().optional().nullable(),
  valuation_date: z.union([z.date(), z.string()]).optional().nullable(),
  valuation_method: z.string().optional().nullable(),
  acquisition_date: z.union([z.date(), z.string()]).optional().nullable(),
  acquisition_cost: z.number().optional().nullable(),
  current_location_id: z.string().uuid().optional().nullable(),
  file_hash: z.string().optional().nullable(),
  file_size: z.number().int().optional().nullable(),
  mime_type: z.string().optional().nullable(),
  media_url: z.string().optional().nullable(),
  account_number: z.string().optional().nullable(),
  routing_number: z.string().optional().nullable(),
  institution_name: z.string().optional().nullable(),
  institution_id: z.string().optional().nullable(),
  chain_of_custody_required: z.boolean().optional().nullable(),
  is_confidential: z.boolean().optional().nullable(),
  confidentiality_level: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
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
 * Validator for inserting into things
 */
export const ThingsSchemaInsert = ThingsSchema.omit({
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
 * Validator for updating things
 */
export const ThingsSchemaUpdate = ThingsSchema.partial().required({ id: true });

export type Things = z.infer<typeof ThingsSchema>;
export type ThingsInsert = z.infer<typeof ThingsSchemaInsert>;
export type ThingsUpdate = z.infer<typeof ThingsSchemaUpdate>;