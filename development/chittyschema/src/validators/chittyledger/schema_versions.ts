import { z } from 'zod';

/**
 * Zod validator for schema_versions table
 * Owner: unknown
 */
export const SchemaVersionsSchema = z.object({
  version: z.string(),
  applied_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  migration_script: z.string().optional().nullable(),
  rollback_script: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

/**
 * Validator for inserting into schema_versions
 */
export const SchemaVersionsSchemaInsert = SchemaVersionsSchema.omit({
  applied_at: true
}).extend({
  applied_at: z.union([z.date(), z.string().datetime()]).optional().nullable()
});

/**
 * Validator for updating schema_versions
 */
export const SchemaVersionsSchemaUpdate = SchemaVersionsSchema.partial();

export type SchemaVersions = z.infer<typeof SchemaVersionsSchema>;
export type SchemaVersionsInsert = z.infer<typeof SchemaVersionsSchemaInsert>;
export type SchemaVersionsUpdate = z.infer<typeof SchemaVersionsSchemaUpdate>;