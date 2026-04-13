/**
 * ChittySchema API - Runtime Schema Validation Service
 * Deployed at: schema.chitty.cc
 *
 * Provides:
 * - Runtime validation for all ChittyOS services
 * - Schema discovery and metadata
 * - Type generation for multiple languages
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { validateRoute } from './routes/validate';
import { tablesRoute } from './routes/tables';
import { generateRoute } from './routes/generate';
import { registryRoute } from './routes/registry';
import { ownersRoute } from './routes/owners';
import { metaRoute } from './routes/meta';
import { checkTable } from './lib/drift-check';
import { enqueueFullScan, type DriftScanMessage } from './lib/queue-producer';
import { handleDriftScanBatch } from './lib/queue-consumer';
import { validateManifest } from './lib/meta-validator';
// @ts-expect-error JSON import
import dbConfig from '../database-config.json';

/**
 * Worker bindings. The database-connection secrets are typed as `unknown`
 * because each manifested Neon database uses a different env-var name
 * declared in database-config.json `databases[].envVar`. They are expected
 * to be injected via `wrangler secret put <NAME>`.
 *
 * Cloudflare resources (provisioned via the platform, not via secrets):
 *   REGISTRY_KV         — existing service-registration KV (PR #5 baseline)
 *   BEACON_STORE        — service deployment announcements (PR H)
 *   CANON_CACHE         — cached canon.chitty.cc ontology (PR H, awaits PR C)
 *   CANONICAL_SCHEMAS   — R2 bucket for JSON Schemas served at /meta/* (PR H+J)
 *   DRIFT_ARCHIVE       — R2 bucket for compliance drift retention (PR H)
 *   DRIFT_QUEUE         — Cloudflare Queue producer for fan-out scans (PR H)
 */
type Bindings = {
  ENVIRONMENT: string;
  REGISTRY_KV?: KVNamespace;
  BEACON_STORE?: KVNamespace;
  CANON_CACHE?: KVNamespace;
  CANONICAL_SCHEMAS?: R2Bucket;
  DRIFT_ARCHIVE?: R2Bucket;
  DRIFT_QUEUE?: Queue<DriftScanMessage>;
} & Record<string, unknown>;

const app = new Hono<{ Bindings: Bindings }>();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: ['https://chitty.cc', 'https://*.chitty.cc'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['X-Request-ID'],
  maxAge: 86400,
  credentials: true
}));

// Health check — served at both /health (ChittyOS standard) and /api/health (legacy).
const healthHandler = (c: any) =>
  c.json({
    status: 'ok',
    service: 'chittyschema',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT || 'development',
  });
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// Service status metadata — ChittyOS standard GET /api/v1/status
app.get('/api/v1/status', (c) => {
  return c.json({
    service: 'chittyschema',
    canonicalUri: 'chittycanon://core/services/chitty-schema',
    tier: 0,
    domain: 'schema.chitty.cc',
    version: '1.0.0',
    environment: c.env.ENVIRONMENT || 'development',
    stack: 'Hono + Cloudflare Workers',
    bindings: {
      REGISTRY_KV: !!c.env.REGISTRY_KV,
      BEACON_STORE: !!c.env.BEACON_STORE,
      CANON_CACHE: !!c.env.CANON_CACHE,
      CANONICAL_SCHEMAS: !!c.env.CANONICAL_SCHEMAS,
      DRIFT_ARCHIVE: !!c.env.DRIFT_ARCHIVE,
      DRIFT_QUEUE: !!c.env.DRIFT_QUEUE,
    },
    timestamp: new Date().toISOString(),
  });
});

// Root endpoint - API documentation
app.get('/', (c) => {
  return c.json({
    service: 'ChittySchema API',
    description: 'Runtime schema validation and type generation for ChittyOS',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      healthLegacy: 'GET /api/health',
      status: 'GET /api/v1/status',
      validate: 'POST /api/validate',
      validateBulk: 'POST /api/validate/bulk',
      listTables: 'GET /api/tables',
      getTable: 'GET /api/tables/:name',
      getColumns: 'GET /api/tables/:name/columns',
      getRelationships: 'GET /api/tables/:name/relationships',
      getOwnership: 'GET /api/ownership/:service',
      listOwners: 'GET /api/owners',
      ownerSummary: 'GET /api/owners/summary',
      ownerByTable: 'GET /api/owners/:table',
      ownerByDbTable: 'GET /api/owners/:database/:table',
      announceDeployment: 'POST /api/owners/announce',
      announcementsList: 'GET /api/owners/announcements',
      validateTable: 'POST /api/owners/validate',
      tableDrift: 'GET /api/owners/:database/:table/drift',
      listMetaSchemas: 'GET /meta',
      getMetaSchema: 'GET /meta/:name',
      generatePython: 'GET /api/generate/python/:table',
      generateTypeScript: 'GET /api/generate/typescript/:table',
      generateZod: 'GET /api/generate/zod/:table',
      registry: 'GET /api/registry',
      registerService: 'POST /api/registry/register',
      validateService: 'POST /api/registry/validate/:serviceName',
      getServiceBadge: 'GET /api/registry/:serviceName/badge',
      getServiceCompliance: 'GET /api/registry/:serviceName/compliance'
    },
    documentation: 'https://github.com/chittyfoundation/chittyschema',
    databases: {
      'chittyos-core': '19 tables (identities, credentials, trust_scores, etc.)',
      'chittyledger': '24 tables (evidence, cases, blockchain_records, etc.)'
    }
  });
});

// Cold-start guard: validate the bundled manifest against its meta-schema
// before serving any traffic. If the manifest is structurally invalid we
// return 503 from every route until the build is corrected. Loud failure
// is the whole point of meta-validation.
const manifestValidation = validateManifest(dbConfig);
if (!manifestValidation.valid) {
  console.error(
    JSON.stringify({
      event: 'schema.meta.manifest_invalid',
      service: 'chittyschema',
      timestamp: new Date().toISOString(),
      errorCount: manifestValidation.errors.length,
      errors: manifestValidation.errors.slice(0, 10),
    })
  );
  app.all('*', (c) =>
    c.json(
      {
        success: false,
        error: 'database-config.json failed meta-schema validation at cold start',
        validation: manifestValidation,
      },
      503
    )
  );
}

// API Routes
app.route('/api/validate', validateRoute);
app.route('/api/tables', tablesRoute);
app.route('/api/generate', generateRoute);
app.route('/api/registry', registryRoute);
app.route('/api/owners', ownersRoute);
app.route('/meta', metaRoute);

// Ownership lookup
app.get('/api/ownership/:service', (c) => {
  const service = c.req.param('service');

  // Load database config
  const dbConfig = require('../database-config.json');

  const tables: string[] = [];

  dbConfig.databases.forEach((db: any) => {
    Object.entries(db.tables).forEach(([table, owner]) => {
      if (owner === service) {
        tables.push(table);
      }
    });
  });

  return c.json({
    service,
    tables,
    count: tables.length
  });
});

// 404 handler
app.notFound((c) => {
  return c.json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
    availableEndpoints: [
      '/api/health',
      '/api/validate',
      '/api/tables',
      '/api/generate/python/:table'
    ]
  }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('API Error:', err);
  return c.json({
    error: 'Internal Server Error',
    message: err.message,
    timestamp: new Date().toISOString()
  }, 500);
});

/**
 * Default export carries three handlers:
 *
 *   fetch     — HTTP request handler (the Hono app)
 *   scheduled — cron-triggered fan-out (publishes one queue message per
 *               manifested table; the queue handler does the real work)
 *   queue     — drains the DRIFT_QUEUE; per-message drift checks with
 *               automatic retries and DLQ routing
 *
 * The scheduled→queue split means a single hourly tick takes seconds (not
 * minutes), individual table failures don't block the scan, and Cloudflare
 * Queues handles backpressure + retries for free. If DRIFT_QUEUE is unbound
 * (e.g. local dev), `enqueueFullScan` falls back to inline iteration via
 * `checkTable` so the cron stays useful.
 */
export default {
  fetch: app.fetch,

  async scheduled(
    _controller: ScheduledController,
    env: Bindings,
    ctx: ExecutionContext
  ): Promise<void> {
    ctx.waitUntil(
      enqueueFullScan(env, 'cron', async (database, table) => {
        await checkTable(env, database, table);
      })
    );
  },

  async queue(
    batch: MessageBatch<DriftScanMessage>,
    env: Bindings
  ): Promise<void> {
    await handleDriftScanBatch(batch, env);
  },
};
