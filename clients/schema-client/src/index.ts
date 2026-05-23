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
