/**
 * Case General Schema (case_general.*)
 *
 * General case repository for standard cases not requiring specialized schemas
 * - cases: Simplified case tracking
 * - documents: Document repository
 *
 * Used for simpler cases that don't need the full legal.* schema complexity
 */

export * from './cases';
export * from './documents';

// Re-export for convenience
export type {
  GeneralCase,
  GeneralCaseInsert,
  GeneralCaseUpdate,
  GeneralCaseQueryOptions,
  GeneralCaseStatus,
  GeneralCaseType,
} from './cases';

export type {
  GeneralDocument,
  GeneralDocumentInsert,
  GeneralDocumentUpdate,
  GeneralDocumentQueryOptions,
  GeneralDocumentType,
  GeneralDocumentStatus,
} from './documents';
