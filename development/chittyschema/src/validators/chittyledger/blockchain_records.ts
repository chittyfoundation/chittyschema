import { z } from 'zod';
import { BlockchainNetwork } from './enums.js';

/**
 * Zod validator for blockchain_records table
 * Owner: chittychain
 */
export const BlockchainRecordsSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  record_id: z.string(),
  blockchain_network: z.nativeEnum(BlockchainNetwork),
  transaction_hash: z.string(),
  block_number: z.number().int().optional().nullable(),
  block_timestamp: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  contract_address: z.string().optional().nullable(),
  from_address: z.string(),
  to_address: z.string().optional().nullable(),
  gas_used: z.number().int().optional().nullable(),
  gas_price: z.number().int().optional().nullable(),
  entity_type: z.string(),
  entity_id: z.string().uuid(),
  metadata_uri: z.string().optional().nullable(),
  metadata_hash: z.string().optional().nullable(),
  proof_data: z.record(z.any()).optional().nullable(),
  minted_by: z.string().uuid().optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
});

/**
 * Validator for inserting into blockchain_records
 */
export const BlockchainRecordsSchemaInsert = BlockchainRecordsSchema.omit({
  id: true,
  created_at: true
}).extend({
  id: z.string().uuid().optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable()
});

/**
 * Validator for updating blockchain_records
 */
export const BlockchainRecordsSchemaUpdate = BlockchainRecordsSchema.partial().required({ id: true });

export type BlockchainRecords = z.infer<typeof BlockchainRecordsSchema>;
export type BlockchainRecordsInsert = z.infer<typeof BlockchainRecordsSchemaInsert>;
export type BlockchainRecordsUpdate = z.infer<typeof BlockchainRecordsSchemaUpdate>;