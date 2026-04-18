import { z } from 'zod';

/**
 * Zod validator for verification_tasks table
 * Owner: unknown
 */
export const VerificationTasksSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  chitty_id: z.string(),
  task_type: z.string(),
  task_subtype: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  subject_type: z.string(),
  subject_id: z.string().uuid(),
  assigned_to: z.string().uuid().optional().nullable(),
  assigned_by: z.string().uuid().optional().nullable(),
  priority: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  workflow_stage: z.string().optional().nullable(),
  due_date: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  started_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  completed_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  estimated_hours: z.number().optional().nullable(),
  actual_hours: z.number().optional().nullable(),
  verification_method: z.string().optional().nullable(),
  required_authorities: z.array(z.string()).optional().nullable(),
  required_evidence: z.array(z.string()).optional().nullable(),
  verification_criteria: z.record(z.any()).optional().nullable(),
  result: z.string().optional().nullable(),
  result_confidence: z.number().optional().nullable(),
  result_details: z.record(z.any()).optional().nullable(),
  findings: z.string().optional().nullable(),
  recommendations: z.string().optional().nullable(),
  reviewed_by: z.string().uuid().optional().nullable(),
  reviewed_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  approved_by: z.string().uuid().optional().nullable(),
  approved_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  follow_up_required: z.boolean().optional().nullable(),
  follow_up_tasks: z.array(z.string()).optional().nullable(),
  escalation_reason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  updated_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  created_by: z.string().uuid().optional().nullable(),
  updated_by: z.string().uuid().optional().nullable(),
});

/**
 * Validator for inserting into verification_tasks
 */
export const VerificationTasksSchemaInsert = VerificationTasksSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
}).extend({
  id: z.string().uuid().optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  updated_at: z.union([z.date(), z.string().datetime()]).optional().nullable()
});

/**
 * Validator for updating verification_tasks
 */
export const VerificationTasksSchemaUpdate = VerificationTasksSchema.partial().required({ id: true });

export type VerificationTasks = z.infer<typeof VerificationTasksSchema>;
export type VerificationTasksInsert = z.infer<typeof VerificationTasksSchemaInsert>;
export type VerificationTasksUpdate = z.infer<typeof VerificationTasksSchemaUpdate>;