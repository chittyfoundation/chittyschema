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
import { checkTable } from './lib/drift-check';
import { enqueueFullScan, type DriftScanMessage } from './lib/queue-producer';
import { handleDriftScanBatch } from './lib/queue-consumer';

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
  origin: ['https://chitty.cc', 'https://*.chitty.cc', 'https://*.replit.app'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['X-Request-ID'],
  maxAge: 86400,
  credentials: true
}));

// Health check
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'chittyschema',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT || 'development'
  });
});

// Root endpoint - API documentation
app.get('/', (c) => {
  return c.json({
    service: 'ChittySchema API',
    description: 'Runtime schema validation and type generation for ChittyOS',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/health',
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

// API Routes
app.route('/api/validate', validateRoute);
app.route('/api/tables', tablesRoute);
app.route('/api/generate', generateRoute);
app.route('/api/registry', registryRoute);
app.route('/api/owners', ownersRoute);

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
