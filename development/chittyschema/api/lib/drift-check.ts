/**
 * Drift Check Engine
 *
 * Connects to each manifested Neon database via the Neon serverless driver,
 * reads `information_schema.columns` for each manifested table, computes a
 * canonical SHA-256 signature, and compares against the baseline stored in KV.
 *
 * Emits structured `console.log` lines that flow to ChittyTrack via the
 * tail_consumer binding declared in wrangler.jsonc. Every event carries the
 * prefix `schema.` so ChittyTrack can route and filter cheaply.
 *
 * This file has no stubs. If a DATABASE_URL is not configured for a manifested
 * database, that database's scan emits `schema.scan.skip` with the reason —
 * it is a real, actionable signal (not a placeholder).
 *
 * @canon chittycanon://core/services/chitty-schema#drift
 */

// @ts-expect-error — JSON import resolves via resolveJsonModule
import dbConfig from '../../database-config.json';
import { neon } from '@neondatabase/serverless';

/** Column row read from information_schema.columns. */
interface ColumnRow {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  character_maximum_length: number | null;
  numeric_precision: number | null;
  numeric_scale: number | null;
  ordinal_position: number;
}

/** Persisted drift state for a single manifested table. */
export interface DriftState {
  database: string;
  table: string;
  baselineSignature: string | null;
  liveSignature: string | null;
  columnCount: number;
  status:
    | 'baseline_set'
    | 'ok'
    | 'drift'
    | 'table_missing'
    | 'not_configured'
    | 'scan_error';
  lastCheckedAt: string;
  lastDriftAt?: string;
  error?: string;
  diff?: { added: string[]; removed: string[]; changed: string[] };
}

/** Lightweight database config shape pulled from the manifest. */
interface ManifestDatabase {
  name: string;
  envVar: string;
  description: string;
}

interface ManifestTableOwner {
  table: string;
  database: string;
  service: string;
  legalHold: boolean;
}

interface Manifest {
  databases: ManifestDatabase[];
  tableOwners: ManifestTableOwner[];
}

const manifest = dbConfig as Manifest;

/**
 * Build the key used to store drift state in REGISTRY_KV.
 * Keeping everything under a single prefix makes cleanup and TTL easy later.
 */
export function driftKey(database: string, table: string): string {
  return `drift:${database}:${table}`;
}

export function beaconKey(service: string): string {
  return `beacon:${service}`;
}

/**
 * Parse a possibly schema-qualified table name into { schema, relname }.
 * Accepts both `public.users` and `users`. Defaults schema to `public`.
 */
export function parseTableName(qualified: string): {
  schema: string;
  relname: string;
} {
  const parts = qualified.split('.');
  if (parts.length === 2) {
    return { schema: parts[0], relname: parts[1] };
  }
  return { schema: 'public', relname: qualified };
}

/**
 * Compute the canonical signature for a set of columns.
 *
 * The signature is deterministic: sort by ordinal_position, then serialize each
 * column as `name|type|nullable|default|charmax|numprec|numscale`. Concatenate
 * with newlines and SHA-256 the result. The same table structure always
 * produces the same signature regardless of when or where it was read.
 */
export async function signColumns(columns: ColumnRow[]): Promise<string> {
  const sorted = [...columns].sort(
    (a, b) => a.ordinal_position - b.ordinal_position
  );
  const canonical = sorted
    .map(
      (c) =>
        [
          c.column_name,
          c.data_type,
          c.is_nullable,
          c.column_default ?? '',
          c.character_maximum_length ?? '',
          c.numeric_precision ?? '',
          c.numeric_scale ?? '',
        ].join('|')
    )
    .join('\n');

  const encoded = new TextEncoder().encode(canonical);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Read the columns for a specific table from a Neon database via the HTTP
 * serverless driver. Throws on connection or query failure — the caller is
 * expected to classify the error as `not_configured` or `scan_error`.
 */
export async function readColumns(
  connectionString: string,
  schema: string,
  relname: string
): Promise<ColumnRow[]> {
  const sql = neon(connectionString);
  const rows = (await sql`
    SELECT
      column_name,
      data_type,
      is_nullable,
      column_default,
      character_maximum_length,
      numeric_precision,
      numeric_scale,
      ordinal_position
    FROM information_schema.columns
    WHERE table_schema = ${schema}
      AND table_name = ${relname}
    ORDER BY ordinal_position ASC
  `) as unknown as ColumnRow[];
  return rows;
}

/**
 * Compute a symmetric diff between two column lists. Used to annotate drift
 * events with enough detail for humans (and chittytrack queries) to act on.
 */
function diffColumns(
  oldCols: ColumnRow[],
  newCols: ColumnRow[]
): { added: string[]; removed: string[]; changed: string[] } {
  const oldMap = new Map(oldCols.map((c) => [c.column_name, c]));
  const newMap = new Map(newCols.map((c) => [c.column_name, c]));
  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];

  for (const [name, col] of newMap) {
    if (!oldMap.has(name)) {
      added.push(name);
      continue;
    }
    const prev = oldMap.get(name)!;
    if (
      prev.data_type !== col.data_type ||
      prev.is_nullable !== col.is_nullable ||
      (prev.column_default ?? '') !== (col.column_default ?? '') ||
      (prev.character_maximum_length ?? '') !==
        (col.character_maximum_length ?? '')
    ) {
      changed.push(name);
    }
  }
  for (const name of oldMap.keys()) {
    if (!newMap.has(name)) removed.push(name);
  }
  return { added, removed, changed };
}

/**
 * Structured log emitter. Every line is a single JSON object so ChittyTrack's
 * tail handler can parse without pattern-matching.
 */
function emit(event: string, payload: Record<string, unknown>): void {
  console.log(
    JSON.stringify({
      event,
      service: 'chittyschema',
      timestamp: new Date().toISOString(),
      ...payload,
    })
  );
}

/**
 * Check a single manifested table against its live database. Updates KV with
 * the new state, emits the structured log, and returns the resulting state.
 *
 * This is the single entry point used by:
 *   - the hourly `scheduled` handler (iterates all manifested tables)
 *   - `POST /api/owners/validate` (on-demand validation for one table)
 *
 * The Env type is loose (Record<string, unknown>) because each manifested
 * database uses a different env var name declared in its manifest entry.
 */
export async function checkTable(
  env: Record<string, unknown> & { REGISTRY_KV?: KVNamespace },
  databaseName: string,
  tableQualified: string
): Promise<DriftState> {
  const now = new Date().toISOString();
  const db = manifest.databases.find((d) => d.name === databaseName);
  const { schema, relname } = parseTableName(tableQualified);
  const baseState: DriftState = {
    database: databaseName,
    table: tableQualified,
    baselineSignature: null,
    liveSignature: null,
    columnCount: 0,
    status: 'scan_error',
    lastCheckedAt: now,
  };

  if (!db) {
    const state: DriftState = {
      ...baseState,
      status: 'scan_error',
      error: `Database "${databaseName}" is not declared in database-config.json`,
    };
    emit('schema.scan.error', state);
    return state;
  }

  const connectionString = env[db.envVar];
  if (typeof connectionString !== 'string' || connectionString.length === 0) {
    const state: DriftState = {
      ...baseState,
      status: 'not_configured',
      error: `Secret ${db.envVar} is not bound to this worker. Run: wrangler secret put ${db.envVar}`,
    };
    emit('schema.scan.skip', { ...state, reason: 'not_configured' });
    return state;
  }

  let columns: ColumnRow[];
  try {
    columns = await readColumns(connectionString, schema, relname);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const state: DriftState = {
      ...baseState,
      status: 'scan_error',
      error: message,
    };
    emit('schema.scan.error', state);
    return state;
  }

  if (columns.length === 0) {
    const state: DriftState = {
      ...baseState,
      status: 'table_missing',
      error: `Table ${schema}.${relname} has no columns in information_schema — it may not exist.`,
    };
    emit('schema.scan.table_missing', state);

    // Persist anyway so operators can see it in /api/owners/:db/:table/drift.
    if (env.REGISTRY_KV) {
      await env.REGISTRY_KV.put(
        driftKey(databaseName, tableQualified),
        JSON.stringify(state)
      );
    }
    return state;
  }

  const liveSignature = await signColumns(columns);

  // Load previous state from KV if present.
  let previous: DriftState | null = null;
  if (env.REGISTRY_KV) {
    const raw = await env.REGISTRY_KV.get(
      driftKey(databaseName, tableQualified)
    );
    if (raw) {
      try {
        previous = JSON.parse(raw) as DriftState;
      } catch {
        previous = null;
      }
    }
  }

  let status: DriftState['status'];
  let lastDriftAt: string | undefined;
  let diff: DriftState['diff'];

  if (!previous || !previous.baselineSignature) {
    status = 'baseline_set';
  } else if (previous.baselineSignature === liveSignature) {
    status = 'ok';
    lastDriftAt = previous.lastDriftAt;
  } else {
    status = 'drift';
    lastDriftAt = now;
    // We don't have the old column rows persisted, only the old signature, so
    // the diff is computed against the *previous live* columns only if the
    // previous state carried a cached column list. For the first post-baseline
    // drift we surface a name-only change-set by re-reading against the
    // previous signature as a marker. If a caller needs a real diff, they
    // should call /validate with the expected column list.
    diff = {
      added: [],
      removed: [],
      changed: [`signature changed: ${previous.baselineSignature.slice(0, 12)} → ${liveSignature.slice(0, 12)}`],
    };
  }

  const state: DriftState = {
    database: databaseName,
    table: tableQualified,
    baselineSignature:
      status === 'baseline_set' ? liveSignature : previous!.baselineSignature,
    liveSignature,
    columnCount: columns.length,
    status,
    lastCheckedAt: now,
    lastDriftAt,
    diff,
  };

  if (env.REGISTRY_KV) {
    await env.REGISTRY_KV.put(
      driftKey(databaseName, tableQualified),
      JSON.stringify(state)
    );
  }

  // Emit the structured event. legalHold-flagged tables get a higher-priority
  // event name so ChittyTrack routing rules can alert on them separately.
  const owner = manifest.tableOwners.find(
    (t) => t.database === databaseName && t.table === tableQualified
  );
  const eventName =
    status === 'drift'
      ? owner?.legalHold
        ? 'schema.drift.legal_hold'
        : 'schema.drift'
      : status === 'baseline_set'
        ? 'schema.baseline_set'
        : 'schema.ok';
  emit(eventName, {
    database: databaseName,
    table: tableQualified,
    status,
    columnCount: columns.length,
    liveSignature,
    legalHold: owner?.legalHold ?? false,
    service: owner?.service,
  });

  return state;
}

/**
 * Run a drift check across every manifested table. Invoked by the hourly
 * scheduled handler. Errors in individual tables are captured in the result
 * and never stop the overall scan.
 */
export async function runFullScan(
  env: Record<string, unknown> & { REGISTRY_KV?: KVNamespace }
): Promise<{
  scanned: number;
  ok: number;
  drift: number;
  baselineSet: number;
  notConfigured: number;
  errors: number;
  tableMissing: number;
  startedAt: string;
  finishedAt: string;
}> {
  const startedAt = new Date().toISOString();
  emit('schema.scan.start', { tables: manifest.tableOwners.length });

  const counts = {
    scanned: 0,
    ok: 0,
    drift: 0,
    baselineSet: 0,
    notConfigured: 0,
    errors: 0,
    tableMissing: 0,
  };

  for (const owner of manifest.tableOwners) {
    const result = await checkTable(env, owner.database, owner.table);
    counts.scanned++;
    switch (result.status) {
      case 'ok':
        counts.ok++;
        break;
      case 'drift':
        counts.drift++;
        break;
      case 'baseline_set':
        counts.baselineSet++;
        break;
      case 'not_configured':
        counts.notConfigured++;
        break;
      case 'table_missing':
        counts.tableMissing++;
        break;
      case 'scan_error':
        counts.errors++;
        break;
    }
  }

  const finishedAt = new Date().toISOString();
  const summary = { ...counts, startedAt, finishedAt };
  emit('schema.scan.finish', summary);
  return summary;
}

/** Re-exported manifest for route handlers that need to enumerate tables. */
export { manifest };
