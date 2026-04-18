import { z } from 'zod';

/**
 * Zod validator for spatial_ref_sys table
 * Owner: unknown
 */
export const SpatialRefSysSchema = z.object({
  srid: z.number().int(),
  auth_name: z.string().optional().nullable(),
  auth_srid: z.number().int().optional().nullable(),
  srtext: z.string().optional().nullable(),
  proj4text: z.string().optional().nullable(),
});

/**
 * Validator for inserting into spatial_ref_sys
 */
export const SpatialRefSysSchemaInsert = SpatialRefSysSchema;

/**
 * Validator for updating spatial_ref_sys
 */
export const SpatialRefSysSchemaUpdate = SpatialRefSysSchema.partial();

export type SpatialRefSys = z.infer<typeof SpatialRefSysSchema>;
export type SpatialRefSysInsert = z.infer<typeof SpatialRefSysSchemaInsert>;
export type SpatialRefSysUpdate = z.infer<typeof SpatialRefSysSchemaUpdate>;