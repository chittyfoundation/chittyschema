/**
 * @chittyos/schema-client — attachable auto-syncing schema node.
 * @canon chittycanon://core/services/chittyschema#client
 */
export { attach } from './attach.js';
export type {
  AttachOptions,
  AttachedSchema,
  AttachMode,
  DriftEvent,
  ValidateResponse,
  ComplianceCheck,
  ComplianceBucket,
  ComplianceItem,
  OverallStatus,
  Badge,
} from './types.js';

// Canonical tool-schema normalizer (de-nester) — single source of truth shared
// by the ChittySchema worker route and ch1tty's local fallback.
export {
  normalizeToolSchema,
  normalizeSchema,
  envelopeDepth,
  ENVELOPE_KEYS,
} from './normalize.js';
export type { JsonSchema } from './normalize.js';

// Canonical tool-schema client.
export { ToolsClient } from './tools-client.js';
export type {
  CanonicalTool,
  ResolvedToolSchema,
  ToolSchemaSource,
  ToolsClientOptions,
} from './tools-client.js';

// Canonical entity-type ontology client (P/L/T/E/A) — canon/ontology path.
export { OntologyClient } from './ontology-client.js';
export type {
  Ontology,
  OntologyType,
  OntologySource,
  OntologyClientOptions,
  CoreTypeCode,
} from './ontology-client.js';
