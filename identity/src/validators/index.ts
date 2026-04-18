/**
 * ChittySchema - Validators for ChittyOS Ecosystem
 *
 * Usage:
 * import { chittyledger, chittyos_core } from '@chittyos/schema/validators';
 *
 * const result = chittyledger.EvidenceSchema.safeParse(data);
 * const identityResult = chittyos_core.IdentitiesSchema.safeParse(data);
 */

export * as chittyledger from './chittyledger/index.js';
export * as chittyos_core from './chittyos-core/index.js';
