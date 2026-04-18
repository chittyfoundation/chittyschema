import { z } from 'zod';

/**
 * Zod validator for discovery_cache_metadata table
 * Owner: chittydiscovery
 */
export const DiscoveryCacheMetadataSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  cache_key: z.string(),
  last_synced_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  sync_source: z.string().optional().nullable(),
  record_count: z.number().int().optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  updated_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
});

/**
 * Validator for inserting into discovery_cache_metadata
 */
export const DiscoveryCacheMetadataSchemaInsert = DiscoveryCacheMetadataSchema.omit({
  id: true,
  last_synced_at: true,
  created_at: true,
  updated_at: true
}).extend({
  id: z.string().uuid().optional().nullable(),
  last_synced_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  updated_at: z.union([z.date(), z.string().datetime()]).optional().nullable()
});

/**
 * Validator for updating discovery_cache_metadata
 */
export const DiscoveryCacheMetadataSchemaUpdate = DiscoveryCacheMetadataSchema.partial().required({ id: true });

export type DiscoveryCacheMetadata = z.infer<typeof DiscoveryCacheMetadataSchema>;
export type DiscoveryCacheMetadataInsert = z.infer<typeof DiscoveryCacheMetadataSchemaInsert>;
export type DiscoveryCacheMetadataUpdate = z.infer<typeof DiscoveryCacheMetadataSchemaUpdate>;