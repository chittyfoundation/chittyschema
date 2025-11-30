/**
 * ChittyOS Schema - Central Hub for Schema Distribution
 *
 * This package provides TypeScript types for all ChittyOS databases.
 *
 * Usage:
 *
 * ```typescript
 * import { chittyledger, chittyos_core } from '@chittyos/schema';
 *
 * // Use comprehensive organized types
 * const person: chittyledger.Foundational.People = { ... };
 * const evidence: chittyledger.Evidence.EvidenceItems = { ... };
 * const case: chittyledger.Legal.LegalCase = { ... };
 *
 * // Or use auto-generated types
 * const identity: chittyos_core.Identities = { ... };
 * ```
 */

// Re-export all generated types
export * from './types/index.js';
