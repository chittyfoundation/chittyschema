/**
 * Tool-schema survey + normalization pass (offline, no production writes).
 *
 * Reads the real aggregated MCP tool surface captured in
 * chittymcp/mcp_primitives.json, runs every tool's inputSchema through the
 * shared ChittySchema de-nester (clients/schema-client — the single source of
 * truth), and reports which tools are "jacked" (envelope-wrapper nesting),
 * their max depth, and before/after pairs.
 *
 * Registration into a tool surface is OPT-IN and dev-only:
 *   --register <baseUrl>   POST each canonical tool to <baseUrl>/api/tools/register
 * Refuses to target schema.chitty.cc (production) unless --allow-prod is also
 * passed. By default it does NOT write anywhere — it only surveys + prints.
 *
 * Usage:
 *   node survey-normalize.mjs
 *   node survey-normalize.mjs --register http://127.0.0.1:8787
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  normalizeToolSchema,
  envelopeDepth,
} from './clients/schema-client/dist/index.js';

const PRIMITIVES = '/home/ubuntu/projects/github.com/CHITTYOS/chittymcp/mcp_primitives.json';

const args = process.argv.slice(2);
const registerIdx = args.indexOf('--register');
const registerBase = registerIdx >= 0 ? args[registerIdx + 1] : null;
const allowProd = args.includes('--allow-prod');

if (registerBase && /schema\.chitty\.cc/.test(registerBase) && !allowProd) {
  console.error('Refusing to register against production (schema.chitty.cc) without --allow-prod.');
  process.exit(2);
}

function collectTools(data) {
  const out = [];
  for (const [server, cfg] of Object.entries(data.mcpServers ?? {})) {
    if (Array.isArray(cfg.tools)) {
      for (const t of cfg.tools) {
        if (t?.inputSchema) out.push({ server, name: t.name, description: t.description, inputSchema: t.inputSchema });
      }
    }
  }
  return out;
}

async function main() {
  if (!fs.existsSync(PRIMITIVES)) {
    console.error(`Source not found: ${PRIMITIVES}`);
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(PRIMITIVES, 'utf8'));
  const tools = collectTools(data);

  let maxDepth = 0;
  const jacked = [];
  for (const tool of tools) {
    const depth = envelopeDepth(tool.inputSchema);
    if (depth > maxDepth) maxDepth = depth;
    if (depth > 0) jacked.push({ ...tool, depth });
  }

  console.log(`Surveyed ${tools.length} tools with schemas across ${new Set(tools.map((t) => t.server)).size} server(s).`);
  console.log(`Max envelope-wrapper depth: ${maxDepth}`);
  console.log(`Jacked (depth >= 1): ${jacked.length}`);

  const examples = (jacked.length ? jacked : tools).slice(0, 3);
  for (const ex of examples) {
    console.log(`\n--- ${ex.server}/${ex.name} (depth=${envelopeDepth(ex.inputSchema)}) ---`);
    console.log('BEFORE:', JSON.stringify(ex.inputSchema));
    console.log('AFTER :', JSON.stringify(normalizeToolSchema(ex.inputSchema)));
  }

  if (registerBase) {
    console.log(`\nRegistering canonical tools to ${registerBase}/api/tools/register ...`);
    for (const tool of tools) {
      const res = await fetch(`${registerBase.replace(/\/+$/, '')}/api/tools/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ server: tool.server, name: tool.name, description: tool.description, inputSchema: tool.inputSchema }),
      });
      console.log(`${res.ok ? 'OK ' : 'ERR'} ${tool.server}/${tool.name} -> ${res.status}`);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
