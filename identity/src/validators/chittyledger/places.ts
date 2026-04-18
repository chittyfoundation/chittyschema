import { z } from 'zod';

/**
 * Zod validator for places table
 * Owner: unknown
 */
export const PlacesSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  chitty_id: z.string(),
  name: z.string(),
  place_type: z.string(),
  sub_type: z.string().optional().nullable(),
  street_address: z.string().optional().nullable(),
  unit_number: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state_province: z.string().optional().nullable(),
  postal_code: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  coordinates: z.any().optional().nullable(),
  elevation: z.number().optional().nullable(),
  timezone: z.string().optional().nullable(),
  parent_place_id: z.string().uuid().optional().nullable(),
  jurisdiction_level: z.string().optional().nullable(),
  jurisdiction_code: z.string().optional().nullable(),
  court_type: z.string().optional().nullable(),
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
 * Validator for inserting into places
 */
export const PlacesSchemaInsert = PlacesSchema.omit({
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
 * Validator for updating places
 */
export const PlacesSchemaUpdate = PlacesSchema.partial().required({ id: true });

export type Places = z.infer<typeof PlacesSchema>;
export type PlacesInsert = z.infer<typeof PlacesSchemaInsert>;
export type PlacesUpdate = z.infer<typeof PlacesSchemaUpdate>;