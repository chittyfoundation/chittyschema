import { z } from 'zod';

/**
 * Zod validator for semantic_documents table
 * Owner: unknown
 */
export const SemanticDocumentsSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  doc_source: z.string(),
  external_id: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  body: z.string().optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
  embedding: z.any().optional().nullable(),
  search_vector: z.any().optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  updated_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
});

/**
 * Validator for inserting into semantic_documents
 */
export const SemanticDocumentsSchemaInsert = SemanticDocumentsSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
}).extend({
  id: z.string().uuid().optional().nullable(),
  created_at: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  updated_at: z.union([z.date(), z.string().datetime()]).optional().nullable()
});

/**
 * Validator for updating semantic_documents
 */
export const SemanticDocumentsSchemaUpdate = SemanticDocumentsSchema.partial().required({ id: true });

export type SemanticDocuments = z.infer<typeof SemanticDocumentsSchema>;
export type SemanticDocumentsInsert = z.infer<typeof SemanticDocumentsSchemaInsert>;
export type SemanticDocumentsUpdate = z.infer<typeof SemanticDocumentsSchemaUpdate>;