import { z } from 'zod';

/**
 * Zod validator for discovered_services table
 * Owner: chittydiscovery
 */
export const DiscoveredServicesSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  service_name: z.string(),
  service_type: z.string(),
  /** Unique ChittyID for the service in DID format (did:chitty:...) */
  chitty_id: z.string(),
  endpoint: z.string(),
  version: z.string().optional().nullable(),
  health_check_url: z.string().optional().nullable(),
  /** Service metadata including capabilities, region, tags, etc. */
  metadata: z.record(z.any()).optional().nullable(),
  /** Last time the service was seen or announced itself */
  last_seen_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  first_discovered_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  /** How the service was discovered: mdns (local), workers (Durable Objects), registry (ChittyRegistry), cache (KV) */
  discovery_method: z.string(),
  /** Current service status: active, inactive, unknown, error */
  status: z.string().optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  updated_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
});

/**
 * Validator for inserting into discovered_services
 */
export const DiscoveredServicesSchemaInsert = DiscoveredServicesSchema.omit({
  id: true,
  last_seen_at: true,
  first_discovered_at: true,
  created_at: true,
  updated_at: true
}).extend({
  id: z.string().uuid().optional().nullable(),
  last_seen_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  first_discovered_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  updated_at: z.union([z.date(), z.string().datetime()]).optional().nullable()
});

/**
 * Validator for updating discovered_services
 */
export const DiscoveredServicesSchemaUpdate = DiscoveredServicesSchema.partial().required({ id: true });

export type DiscoveredServices = z.infer<typeof DiscoveredServicesSchema>;
export type DiscoveredServicesInsert = z.infer<typeof DiscoveredServicesSchemaInsert>;
export type DiscoveredServicesUpdate = z.infer<typeof DiscoveredServicesSchemaUpdate>;