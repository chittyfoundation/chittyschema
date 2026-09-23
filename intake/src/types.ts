// @chittyos/schema/intake — types mirroring migration 003_intake_ledger.sql (chittysync_intake).
// schemaVersion is decoupled from the package version.
import { z } from "zod";

export const SCHEMA_VERSION = "1.0.0";

const sha256 = z.string().regex(/^[a-f0-9]{64}$/);

export const IntakeState = z.enum(["staging", "processed", "filed", "errored"]);
export type IntakeState = z.infer<typeof IntakeState>;

export const IntakeTransition = z.enum(["PREPARED", "PRIMARY_COMMITTED", "PUBLISHED", "ABORTED"]);
export type IntakeTransition = z.infer<typeof IntakeTransition>;

export const IntakeItem = z.object({
  id: z.string().uuid(),
  source_system: z.string(),
  source_account: z.string(),
  drive_file_id: z.string(),
  sha256,
  file_name: z.string().nullable().optional(),
  mime_type: z.string().nullable().optional(),
  size_bytes: z.number().int().nonnegative().nullable().optional(),
  state: IntakeState,
  created_at: z.string(),
  updated_at: z.string(),
});
export type IntakeItem = z.infer<typeof IntakeItem>;

export const IntakeEvent = z.object({
  id: z.number().int(),
  item_id: z.string().uuid(),
  transition: IntakeTransition,
  sha256,
  file_name_hash: sha256,
  // Phase 1: Google Sheets authority (not a Neon chain_position)
  source_sheet_row: z.number().int().nullable().optional(),
  source_previous_event_hash: sha256.nullable().optional(),
  source_event_hash: sha256,
  payload: z.record(z.unknown()).default({}),
  created_at: z.string(),
});
export type IntakeEvent = z.infer<typeof IntakeEvent>;

export const IntakeConfig = z.object({
  id: z.string().uuid(),
  key: z.string(),
  value: z.record(z.unknown()).default({}),
  created_at: z.string(),
  updated_at: z.string(),
});
export type IntakeConfig = z.infer<typeof IntakeConfig>;
