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
import dbConfig from '../../database-config.json';

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

const app = new Hono();

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
