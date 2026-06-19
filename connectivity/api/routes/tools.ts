/**
 * ChittySchema canonical tool-schema surface.
 *
 * Holds the FLAT canonical JSON Schema per MCP tool, keyed `tool:{server}:{name}`
 * in REGISTRY_KV, mirroring the registry surface's Hono/KV style. On register,
 * the supplied (possibly "Russian-doll"-nested) inputSchema is run through the
 * shared de-nester (clients/schema-client/src/normalize.ts — the single source
 * of truth shared with ch1tty's local fallback) and the flattened result is
 * stored as `canonicalSchema` alongside the original for provenance.
 *
 * Routes:
 *   GET  /api/tools                  → list every canonical tool (all servers)
 *   GET  /api/tools/:server          → list canonical tools for one server
 *   GET  /api/tools/:server/:name    → one canonical tool
 *   POST /api/tools/register         → normalize + persist a canonical tool
 *   POST /api/tools/validate         → normalize a schema and report nesting
 *
 * @canon chittycanon://core/services/chittyschema#tool-schema-canon
 */

import { Hono } from 'hono';
// Single shared normalizer — same module ch1tty imports via @chittyos/schema-client.
import {
  normalizeToolSchema,
  envelopeDepth,
  type JsonSchema,
} from '../../../clients/schema-client/src/normalize.js';

type Bindings = {
  REGISTRY_KV?: KVNamespace;
};

/** Persisted canonical tool entry. */
interface ToolEntry {
  server: string;
  name: string;
  description: string;
  canonicalSchema: JsonSchema;
  originalSchema: JsonSchema;
  envelopeDepth: number;
  updated_at: string;
}

export const toolsRoute = new Hono<{ Bindings: Bindings }>();

// List every canonical tool across all servers.
toolsRoute.get('/', async (c) => {
  const kv = c.env.REGISTRY_KV;
  if (!kv) {
    return c.json({ success: false, error: 'REGISTRY_KV binding is not configured' }, 503);
  }

  const list = await kv.list({ prefix: 'tool:' });
  const tools: ToolEntry[] = [];
  for (const key of list.keys) {
    const value = await kv.get(key.name);
    if (value) {
      try {
        tools.push(JSON.parse(value) as ToolEntry);
      } catch {
        // Skip corrupt entries; never fail the whole listing.
      }
    }
  }

  return c.json({
    tools,
    count: tools.length,
    servers: [...new Set(tools.map((t) => t.server))].sort(),
  });
});

// List canonical tools for a single server.
toolsRoute.get('/:server', async (c) => {
  const kv = c.env.REGISTRY_KV;
  if (!kv) {
    return c.json({ success: false, error: 'REGISTRY_KV binding is not configured' }, 503);
  }

  const server = c.req.param('server');
  const list = await kv.list({ prefix: `tool:${server}:` });
  const tools: ToolEntry[] = [];
  for (const key of list.keys) {
    const value = await kv.get(key.name);
    if (value) {
      try {
        tools.push(JSON.parse(value) as ToolEntry);
      } catch {
        // Skip corrupt entries.
      }
    }
  }

  return c.json({ server, tools, count: tools.length });
});

// Get one canonical tool schema.
toolsRoute.get('/:server/:name', async (c) => {
  const kv = c.env.REGISTRY_KV;
  if (!kv) {
    return c.json({ success: false, error: 'REGISTRY_KV binding is not configured' }, 503);
  }

  const server = c.req.param('server');
  const name = c.req.param('name');
  const value = await kv.get(`tool:${server}:${name}`);
  if (!value) {
    return c.json({ error: 'Tool not found' }, 404);
  }
  return c.json(JSON.parse(value));
});

// Register (normalize + persist) a canonical tool schema.
toolsRoute.post('/register', async (c) => {
  const kv = c.env.REGISTRY_KV;
  if (!kv) {
    return c.json({ success: false, error: 'REGISTRY_KV binding is not configured' }, 503);
  }

  const body = await c.req.json<Partial<{
    server: string;
    name: string;
    description: string;
    inputSchema: JsonSchema;
  }>>().catch(() => ({}));

  if (!body.server || !body.name || !body.inputSchema) {
    return c.json(
      { error: 'Missing required fields', required: ['server', 'name', 'inputSchema'] },
      400,
    );
  }

  const original = body.inputSchema;
  const canonicalSchema = (normalizeToolSchema(original) ?? {}) as JsonSchema;

  const entry: ToolEntry = {
    server: body.server,
    name: body.name,
    description: body.description ?? '',
    canonicalSchema,
    originalSchema: original,
    envelopeDepth: envelopeDepth(original),
    updated_at: new Date().toISOString(),
  };

  await kv.put(`tool:${entry.server}:${entry.name}`, JSON.stringify(entry));

  return c.json({ success: true, tool: entry }, 201);
});

// Normalize a schema and report nesting without persisting.
toolsRoute.post('/validate', async (c) => {
  const body = await c.req.json<Partial<{ inputSchema: JsonSchema }>>().catch(() => ({}));
  if (!body.inputSchema) {
    return c.json({ error: 'Missing required field', required: ['inputSchema'] }, 400);
  }

  const original = body.inputSchema;
  const canonicalSchema = (normalizeToolSchema(original) ?? {}) as JsonSchema;
  const depth = envelopeDepth(original);

  return c.json({
    envelopeDepth: depth,
    jacked: depth > 0,
    originalSchema: original,
    canonicalSchema,
  });
});
