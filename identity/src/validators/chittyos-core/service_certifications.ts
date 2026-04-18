import { z } from 'zod';

/**
 * Zod validator for service_certifications table
 * Owner: unknown
 */
export const ServiceCertificationsSchema = z.object({
  chitty_id: z.string(),
  registration_chitty_id: z.string(),
  certificate_id: z.string(),
  chitty_cert_id: z.string().optional().nullable(),
  issued_at: z.union([z.date(), z.string().datetime()]),
  expires_at: z.union([z.date(), z.string().datetime()]),
  issuer: z.string().optional().nullable(),
  certificate_type: z.string().optional().nullable(),
  /** Cryptographic signature from ChittyCert (delegated CA from ChittyTrust root). */
  signature: z.string(),
  status: z.string().optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
});

/**
 * Validator for inserting into service_certifications
 */
export const ServiceCertificationsSchemaInsert = ServiceCertificationsSchema.omit({
  created_at: true
}).extend({
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable()
});

/**
 * Validator for updating service_certifications
 */
export const ServiceCertificationsSchemaUpdate = ServiceCertificationsSchema.partial();

export type ServiceCertifications = z.infer<typeof ServiceCertificationsSchema>;
export type ServiceCertificationsInsert = z.infer<typeof ServiceCertificationsSchemaInsert>;
export type ServiceCertificationsUpdate = z.infer<typeof ServiceCertificationsSchemaUpdate>;