/**
 * R2 Archive Helper
 *
 * Long-term, immutable storage for drift events and daily manifest snapshots.
 * Backed by the `chittyschema-drift-archive` R2 bucket. Used for compliance
 * retention beyond ChittyTrack's typical 3-day window — legal-hold tables
 * need 7-year retention per the Step 2 ops runbook proposal.
 *
 * Key layout:
 *   drift/{YYYY}/{MM}/{DD}/{database}/{table}/{ISO8601-with-ms}.json
 *   snapshot/{YYYY}/{MM}/{DD}/manifest.json
 *   snapshot/{YYYY}/{MM}/{DD}/{database}/{table}.signature.json
 *
 * @canon chittycanon://core/services/chittyschema#archive
 */

import type { DriftState } from './drift-check';

export interface R2ArchiveEnv {
  DRIFT_ARCHIVE?: R2Bucket;
}

function isoDateParts(iso: string): { y: string; m: string; d: string } {
  const date = new Date(iso);
  return {
    y: String(date.getUTCFullYear()),
    m: String(date.getUTCMonth() + 1).padStart(2, '0'),
    d: String(date.getUTCDate()).padStart(2, '0'),
  };
}

function safeKey(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Persist a drift event to the archive bucket. Idempotent: the key encodes
 * the timestamp to milliseconds so two scans of the same table produce two
 * archive entries (which is correct — every scan is its own observation).
 */
export async function archiveDriftEvent(
  env: R2ArchiveEnv,
  state: DriftState
): Promise<{ stored: boolean; key?: string; reason?: string }> {
  if (!env.DRIFT_ARCHIVE) {
    return { stored: false, reason: 'DRIFT_ARCHIVE binding not configured' };
  }

  const { y, m, d } = isoDateParts(state.lastCheckedAt);
  const stamp = state.lastCheckedAt.replace(/[:.]/g, '-');
  const key = `drift/${y}/${m}/${d}/${safeKey(state.database)}/${safeKey(state.table)}/${stamp}.json`;

  await env.DRIFT_ARCHIVE.put(key, JSON.stringify(state), {
    httpMetadata: { contentType: 'application/json' },
    customMetadata: {
      database: state.database,
      table: state.table,
      status: state.status,
      legalHold: state.diff ? '1' : '0',
    },
  });

  return { stored: true, key };
}

/**
 * Persist a full daily manifest snapshot. Called once per day (or on request)
 * to give legal a verifiable point-in-time view of who owned which table.
 */
export async function snapshotManifest(
  env: R2ArchiveEnv,
  manifest: unknown
): Promise<{ stored: boolean; key?: string; reason?: string }> {
  if (!env.DRIFT_ARCHIVE) {
    return { stored: false, reason: 'DRIFT_ARCHIVE binding not configured' };
  }

  const { y, m, d } = isoDateParts(new Date().toISOString());
  const key = `snapshot/${y}/${m}/${d}/manifest.json`;

  await env.DRIFT_ARCHIVE.put(key, JSON.stringify(manifest, null, 2), {
    httpMetadata: { contentType: 'application/json' },
  });

  return { stored: true, key };
}
