import { z } from 'zod';

/**
 * Zod validator for service_validations table
 * Owner: unknown
 */
export const ServiceValidationsSchema = z.object({
  chitty_id: z.string(),
  registration_chitty_id: z.string().optional().nullable(),
  service_name: z.string(),
  /** Full validation output. Schema: {"errors": [...], "warnings": [...], "requirements_met": [...], "requirements_failed": [...]}. */
  validation_result: z.record(z.any()),
  passed: z.boolean(),
  requirements_version: z.string(),
  validated_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
});

/**
 * Validator for inserting into service_validations
 */
export const ServiceValidationsSchemaInsert = ServiceValidationsSchema.omit({
  validated_at: true
}).extend({
  validated_at: z.union([z.date(), z.string().datetime()]).optional().nullable()
});

/**
 * Validator for updating service_validations
 */
export const ServiceValidationsSchemaUpdate = ServiceValidationsSchema.partial();

export type ServiceValidations = z.infer<typeof ServiceValidationsSchema>;
export type ServiceValidationsInsert = z.infer<typeof ServiceValidationsSchemaInsert>;
export type ServiceValidationsUpdate = z.infer<typeof ServiceValidationsSchemaUpdate>;