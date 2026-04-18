import { z } from 'zod';

/**
 * Zod validator for invoices table
 * Owner: chittyledger
 */
export const InvoicesSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  invoice_number: z.string(),
  user_id: z.string().uuid(),
  case_id: z.string().uuid().optional().nullable(),
  amount: z.number(),
  currency: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  due_date: z.union([z.date(), z.string()]).optional().nullable(),
  paid_date: z.union([z.date(), z.string()]).optional().nullable(),
  line_items: z.record(z.any()),
  notes: z.string().optional().nullable(),
  payment_link: z.string().optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  updated_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
});

/**
 * Validator for inserting into invoices
 */
export const InvoicesSchemaInsert = InvoicesSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
}).extend({
  id: z.string().uuid().optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  updated_at: z.union([z.date(), z.string().datetime()]).optional().nullable()
});

/**
 * Validator for updating invoices
 */
export const InvoicesSchemaUpdate = InvoicesSchema.partial().required({ id: true });

export type Invoices = z.infer<typeof InvoicesSchema>;
export type InvoicesInsert = z.infer<typeof InvoicesSchemaInsert>;
export type InvoicesUpdate = z.infer<typeof InvoicesSchemaUpdate>;