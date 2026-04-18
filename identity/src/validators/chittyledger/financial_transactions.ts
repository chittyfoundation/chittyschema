import { z } from 'zod';
import { TransactionType, TransactionStatus } from './enums.js';

/**
 * Zod validator for financial_transactions table
 * Owner: chittyledger
 */
export const FinancialTransactionsSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  transaction_id: z.string(),
  user_id: z.string().uuid().optional().nullable(),
  case_id: z.string().uuid().optional().nullable(),
  transaction_type: z.nativeEnum(TransactionType),
  amount: z.number(),
  currency: z.string().optional().nullable(),
  status: z.nativeEnum(TransactionStatus).optional().nullable(),
  payment_method: z.string().optional().nullable(),
  payment_provider_id: z.string().optional().nullable(),
  payment_provider_response: z.record(z.any()).optional().nullable(),
  description: z.string().optional().nullable(),
  invoice_url: z.string().optional().nullable(),
  receipt_url: z.string().optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
  processed_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  updated_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
});

/**
 * Validator for inserting into financial_transactions
 */
export const FinancialTransactionsSchemaInsert = FinancialTransactionsSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
}).extend({
  id: z.string().uuid().optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  updated_at: z.union([z.date(), z.string().datetime()]).optional().nullable()
});

/**
 * Validator for updating financial_transactions
 */
export const FinancialTransactionsSchemaUpdate = FinancialTransactionsSchema.partial().required({ id: true });

export type FinancialTransactions = z.infer<typeof FinancialTransactionsSchema>;
export type FinancialTransactionsInsert = z.infer<typeof FinancialTransactionsSchemaInsert>;
export type FinancialTransactionsUpdate = z.infer<typeof FinancialTransactionsSchemaUpdate>;