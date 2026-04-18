/**
 * Schema Owner Manifest Routes
 *
 * GET /api/owners                     — full manifest (optionally filtered)
 * GET /api/owners/:table               — lookup single table (all databases)
 * GET /api/owners/:database/:table     — lookup table in a specific database
 * GET /api/owners/summary              — rollup counts by service / database / canonType / legalHold
 *
 * Query parameters for GET /api/owners:
 *   ?database=<name>        Filter by authoring database
 *   ?service=<name>         Filter by authoring service
 *   ?repo=<org/repo>        Filter by authoring repo
 *   ?canonType=<P|L|T|E|A>  Filter by canonical ontology type
 *   ?legalHold=true|false   Filter by legal-hold flag
 *
 * The manifest is sourced from database-config.json `tableOwners[]`.
 * See `../../database-config.json` and the top-level OPS.md for the policy.
 *
 * @canon chittycanon://core/services/chitty-schema#owners
 */

import { Hono } from 'hono';
// @ts-expect-error - JSON import resolves via resolveJsonModule
import dbConfig from '../../../database-config.json';
import {
  checkTable,
  driftKey,
  beaconKey,
  type DriftState,
} from '../lib/drift-check';
import { validate as validateMeta } from '../lib/meta-validator';

export interface TableOwner {
  table: string;
  database: string;
  service: string;
  repo: string;
  authoringFile: string;
  canonType?: 'P' | 'L' | 'T' | 'E' | 'A';
  semver: string;
  legalHold: boolean;
  stewards?: string;
  notes?: string;
}

interface DatabaseConfig {
  databases: Array<{
    name: string;
    description: string;
    envVar: string;
    owner: string;
    services: string[];
    tables: Record<string, string>;
  }>;
  tableOwners: TableOwner[];
}

/**
 * Beacon announcement persisted in KV when a service calls POST /beacon on
 * deploy. Used to detect "live DB moved but authoring service didn't deploy"
 * situations, which are almost always drift problems.
 */
export interface ServiceBeacon {
  service: string;
  version: string;
  gitSha?: string;
  lastMigration?: string;
  deployedAt: string;
  receivedAt: string;
  environment?: string;
}

type Env = {
  ENVIRONMENT?: string;
  REGISTRY_KV?: KVNamespace;
  BEACON_STORE?: KVNamespace;
  CANON_CACHE?: KVNamespace;
  CANONICAL_SCHEMAS?: R2Bucket;
  DRIFT_ARCHIVE?: R2Bucket;
} & Record<string, unknown>;

const config = dbConfig as DatabaseConfig;

/**
 * Reverse-lookup: given a table name, return any entries that match.
 * Multiple matches are possible when the same table name exists in multiple
 * databases (e.g. `documents` in both chittyevidence-db and chittyconnect).
 */
function findByTable(table: string): TableOwner[] {
  return (config.tableOwners || []).filter((t) => t.table === table);
}

function findByTableAndDatabase(
  table: string,
  database: string
): TableOwner | undefined {
  return (config.tableOwners || []).find(
    (t) => t.table === table && t.database === database
  );
}

const app = new Hono<{ Bindings: Env }>();

/**
 * Full manifest, optionally filtered by query parameters.
 */
app.get('/', (c) => {
  try {
    const database = c.req.query('database');
    const service = c.req.query('service');
    const repo = c.req.query('repo');
    const canonType = c.req.query('canonType');
    const legalHold = c.req.query('legalHold');

    let owners = config.tableOwners || [];

    if (database) owners = owners.filter((t) => t.database === database);
    if (service) owners = owners.filter((t) => t.service === service);
    if (repo) owners = owners.filter((t) => t.repo === repo);
    if (canonType) owners = owners.filter((t) => t.canonType === canonType);
    if (legalHold !== undefined) {
      const want = legalHold === 'true';
      owners = owners.filter((t) => t.legalHold === want);
    }

    return c.json(
      {
        success: true,
        count: owners.length,
        totalInManifest: (config.tableOwners || []).length,
        filters: { database, service, repo, canonType, legalHold },
        owners,
      },
      200,
      {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return c.json({ success: false, error: message }, 500);
  }
});

/**
 * Rollup summary. Useful for dashboards and drift reports.
 * MUST come before `/:table` so Hono doesn't treat "summary" as a table name.
 */
app.get('/summary', (c) => {
  const owners = config.tableOwners || [];

  const byDatabase: Record<string, number> = {};
  const byService: Record<string, number> = {};
  const byCanonType: Record<string, number> = {};
  let legalHoldCount = 0;

  for (const owner of owners) {
    byDatabase[owner.database] = (byDatabase[owner.database] || 0) + 1;
    byService[owner.service] = (byService[owner.service] || 0) + 1;
    if (owner.canonType) {
      byCanonType[owner.canonType] = (byCanonType[owner.canonType] || 0) + 1;
    }
    if (owner.legalHold) legalHoldCount++;
  }

  return c.json(
    {
      success: true,
      totalManifestedTables: owners.length,
      totalDatabases: config.databases.length,
      legalHoldCount,
      byDatabase,
      byService,
      byCanonType,
      canonTypes: {
        P: 'Person',
        L: 'Location',
        T: 'Thing',
        E: 'Event',
        A: 'Authority',
      },
      source: 'chittyschema://core/owners',
      generatedAt: new Date().toISOString(),
    },
    200,
    {
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
    }
  );
});

/**
 * Service deployment announcement endpoint. Any service that owns manifested
 * tables should POST here on deploy, announcing what version it's running and
 * what migration it last applied.
 *
 * Renamed from /beacon in PR H to disambiguate from the existing
 * `chittybeacon` Worker (which is a health *poller*, not a deploy *receiver*).
 * The /beacon path is kept as an alias for one release window — see below.
 *
 * State is keyed by service name and kept in `BEACON_STORE` KV (split out
 * from REGISTRY_KV in PR H so the two governance surfaces stay decoupled).
 *
 * Body: { service, version, gitSha?, lastMigration?, deployedAt?, environment? }
 */
async function handleAnnouncePost(c: Parameters<Parameters<typeof app.post>[1]>[0]) {
  const kv = c.env.BEACON_STORE || c.env.REGISTRY_KV;
  if (!kv) {
    return c.json(
      {
        success: false,
        error: 'Neither BEACON_STORE nor REGISTRY_KV binding is configured',
      },
      503
    );
  }

  let body: Partial<ServiceBeacon>;
  try {
    body = await c.req.json<Partial<ServiceBeacon>>();
  } catch {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  // Meta-schema validation: enforce service-announcement.schema.json on
  // every incoming request. Replaces the ad-hoc field check from PR H.
  const announceValidation = validateMeta('service-announcement', body);
  if (!announceValidation.valid) {
    return c.json(
      {
        success: false,
        error: 'service-announcement schema validation failed',
        validation: announceValidation,
      },
      400
    );
  }

  const now = new Date().toISOString();
  const announcement: ServiceBeacon = {
    service: body.service!,
    version: body.version!,
    gitSha: body.gitSha,
    lastMigration: body.lastMigration,
    deployedAt: body.deployedAt || now,
    receivedAt: now,
    environment: body.environment || c.env.ENVIRONMENT,
  };

  await kv.put(beaconKey(announcement.service), JSON.stringify(announcement));

  // Emit structured event so ChittyTrack can display a "who deployed what"
  // timeline. Low priority — informational, never alertable.
  console.log(
    JSON.stringify({
      event: 'schema.deployment.announced',
      service: 'chittyschema',
      timestamp: now,
      announcement,
    })
  );

  return c.json({ success: true, announcement }, 201);
}

async function handleAnnouncementsGet(c: Parameters<Parameters<typeof app.get>[1]>[0]) {
  const kv = c.env.BEACON_STORE || c.env.REGISTRY_KV;
  if (!kv) {
    return c.json(
      {
        success: false,
        error: 'Neither BEACON_STORE nor REGISTRY_KV binding is configured',
      },
      503
    );
  }

  const list = await kv.list({ prefix: 'beacon:' });
  const announcements: ServiceBeacon[] = [];
  for (const key of list.keys) {
    const value = await kv.get(key.name);
    if (value) {
      try {
        announcements.push(JSON.parse(value) as ServiceBeacon);
      } catch {
        /* skip malformed entry */
      }
    }
  }

  return c.json(
    {
      success: true,
      count: announcements.length,
      announcements: announcements.sort((a, b) =>
        b.receivedAt.localeCompare(a.receivedAt)
      ),
    },
    200,
    { 'Cache-Control': 'private, max-age=15' }
  );
}

// Canonical names introduced in PR H to avoid clashing with the deployed
// `chittybeacon` worker.
app.post('/announce', handleAnnouncePost);
app.get('/announcements', handleAnnouncementsGet);

// Backward-compatible aliases. Kept for one release window so any caller
// from PR #6 keeps working — slated for removal in a follow-up after
// chittymonitor switches over.
app.post('/beacon', handleAnnouncePost);
app.get('/beacons', handleAnnouncementsGet);

/**
 * Run a drift check on demand for one manifested table. Useful for:
 *   - GitHub webhook → ChittyTrack → here when an authoring push lands
 *   - CI jobs that want to confirm their migration matches the live DB
 *   - Manual operator runs during incident response
 *
 * Body: { database, table }
 */
app.post('/validate', async (c) => {
  let body: { database?: string; table?: string };
  try {
    body = await c.req.json<{ database?: string; table?: string }>();
  } catch {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  if (!body.database || !body.table) {
    return c.json(
      {
        success: false,
        error: 'Required fields: database, table',
      },
      400
    );
  }

  const owner = findByTableAndDatabase(body.table, body.database);
  if (!owner) {
    return c.json(
      {
        success: false,
        error: `No manifested owner for ${body.database}.${body.table}`,
      },
      404
    );
  }

  const state = await checkTable(c.env, body.database, body.table);
  const statusCode =
    state.status === 'drift'
      ? 409
      : state.status === 'scan_error' || state.status === 'table_missing'
        ? 502
        : 200;

  return c.json({ success: state.status !== 'scan_error', state }, statusCode);
});

/**
 * Read the latest drift state for a single table from KV. Safe to call from
 * dashboards — no database connection happens here.
 */
app.get('/:database/:table/drift', async (c) => {
  const database = c.req.param('database');
  const table = c.req.param('table');
  const kv = c.env.REGISTRY_KV;

  if (!kv) {
    return c.json(
      { success: false, error: 'REGISTRY_KV binding is not configured' },
      503
    );
  }

  const raw = await kv.get(driftKey(database, table));
  if (!raw) {
    return c.json(
      {
        success: false,
        error: `No drift state recorded for ${database}.${table}`,
        hint: 'Run POST /api/owners/validate or wait for the next scheduled scan.',
      },
      404
    );
  }

  let state: DriftState;
  try {
    state = JSON.parse(raw) as DriftState;
  } catch {
    return c.json(
      { success: false, error: 'Corrupt drift state in KV' },
      500
    );
  }

  return c.json(
    { success: true, state },
    200,
    { 'Cache-Control': 'public, max-age=30' }
  );
});

/**
 * Table lookup scoped to a specific database. This disambiguates the
 * namespace collisions (e.g. `documents` in chittyevidence-db vs chittyconnect).
 */
app.get('/:database/:table', (c) => {
  const database = c.req.param('database');
  const table = c.req.param('table');

  const owner = findByTableAndDatabase(table, database);

  if (!owner) {
    return c.json(
      {
        success: false,
        error: `No owner entry for ${database}.${table}`,
      },
      404
    );
  }

  return c.json(
    { success: true, owner },
    200,
    { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' }
  );
});

/**
 * Single-table lookup across all databases. Returns an array because
 * the same table name can exist in multiple databases.
 */
app.get('/:table', (c) => {
  const table = c.req.param('table');
  const matches = findByTable(table);

  if (matches.length === 0) {
    return c.json(
      {
        success: false,
        error: `Table not found in manifest: ${table}`,
        hint: 'Use GET /api/owners to list all manifested tables.',
      },
      404
    );
  }

  return c.json(
    {
      success: true,
      table,
      count: matches.length,
      collision: matches.length > 1,
      owners: matches,
    },
    200,
    { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' }
  );
});

export { app as ownersRoute };
