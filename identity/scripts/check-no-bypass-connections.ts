#!/usr/bin/env tsx
/**
 * check-no-bypass-connections
 *
 * Removal gate for the scope write-lock triggers (chittyschema PR #92 / #94).
 * The migration that drops those triggers may only be applied once this
 * exits 0 against production.
 *
 * Refuses (exit 1) when any Hyperdrive config pointing at chittyos-core
 * connects as a role that is superuser, has BYPASSRLS, owns a scope table,
 * or is a member of an owning/privileged role. Fails closed (exit 2) on
 * missing inputs or any HTTP/parse error.
 *
 * Usage:
 *   CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... DATABASE_URL=... \
 *     npm run check:no-bypass
 *   npm run check:no-bypass -- --hyperdrive-json h.json --roles-json r.json \
 *     [--target-endpoint ep-xxxx] [--ignore-config <id> ...]
 *
 * Read-only: one GET to the Cloudflare API and one SELECT in a READ ONLY
 * transaction. Passwords and connection strings are never read or printed.
 *
 * Exit codes: 0 pass, 1 refuse, 2 blocked/error.
 */

import { readFileSync } from 'node:fs';
import pg from 'pg';
import {
  CORE_ENDPOINT_ID,
  ROLES_SQL,
  decidePage,
  evaluate,
  parseHyperdrive,
  parseRoles,
  type HyperdriveConfig,
  type ResultInfo,
  type RolesData,
} from './lib/no-bypass-check';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function argAll(name: string): string[] {
  const out: string[] = [];
  process.argv.forEach((a, i) => {
    if (a === name) {
      const v = process.argv[i + 1];
      if (v === undefined || v.startsWith('--')) blocked(`${name} requires a value`);
      out.push(v);
    }
  });
  return out;
}

function blocked(msg: string): never {
  console.error(`REFUSED (fail-closed): ${msg}`);
  process.exit(2);
}

async function fetchHyperdrive(): Promise<HyperdriveConfig[]> {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!token || !account) {
    console.error('POLICY_BLOCKED_CHITTYCONNECT_UNAVAILABLE: CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID not set');
    process.exit(2);
  }
  const all: unknown[] = [];
  const PER_PAGE = 100;
  const MAX_PAGES = 50;
  for (let page = 1; ; page++) {
    const url = `https://api.cloudflare.com/client/v4/accounts/${account}/hyperdrive/configs?per_page=${PER_PAGE}&page=${page}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Cloudflare API returned HTTP ${res.status}`);
    const body = (await res.json()) as { success?: boolean; result?: unknown; result_info?: ResultInfo };
    if (body.success === false || !Array.isArray(body.result)) throw new Error('Cloudflare API response not successful');
    all.push(...body.result);
    const d = decidePage({
      page,
      perPage: PER_PAGE,
      maxPages: MAX_PAGES,
      fetched: all.length,
      lastLen: body.result.length,
      resultInfo: body.result_info,
    });
    if (d.action === 'error') throw new Error(`Hyperdrive pagination: ${d.reason}`);
    if (d.action === 'done') break;
  }
  // Only the non-secret fields leave this function.
  return parseHyperdrive(
    all.map((c) => {
      const o = c as { id?: string; name?: string; origin?: { host?: string; database?: string; user?: string } };
      return { id: o.id, name: o.name, origin: { host: o.origin?.host, database: o.origin?.database, user: o.origin?.user } };
    }),
  );
}

async function fetchRoles(): Promise<RolesData> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('POLICY_BLOCKED_CHITTYCONNECT_UNAVAILABLE: DATABASE_URL not set');
    process.exit(2);
  }
  const client = new pg.Client({ connectionString: url });
  try {
    await client.connect();
    await client.query('BEGIN READ ONLY');
    const res = await client.query(ROLES_SQL);
    await client.query('ROLLBACK');
    return parseRoles(res.rows[0]?.result);
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function main(): Promise<void> {
  const hdFile = arg('--hyperdrive-json');
  const rolesFile = arg('--roles-json');
  const endpoint = arg('--target-endpoint') ?? CORE_ENDPOINT_ID;
  const ignoreConfigs = argAll('--ignore-config');

  // Check env up front so a missing input is reported before any I/O.
  if (!hdFile && (!process.env.CLOUDFLARE_API_TOKEN || !process.env.CLOUDFLARE_ACCOUNT_ID)) {
    console.error('POLICY_BLOCKED_CHITTYCONNECT_UNAVAILABLE: CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID not set');
    process.exit(2);
  }
  if (!rolesFile && !process.env.DATABASE_URL) {
    console.error('POLICY_BLOCKED_CHITTYCONNECT_UNAVAILABLE: DATABASE_URL not set');
    process.exit(2);
  }

  let configs: HyperdriveConfig[];
  let roles: RolesData;
  try {
    configs = hdFile ? parseHyperdrive(JSON.parse(readFileSync(hdFile, 'utf-8'))) : await fetchHyperdrive();
    roles = rolesFile ? parseRoles(JSON.parse(readFileSync(rolesFile, 'utf-8'))) : await fetchRoles();
  } catch (e) {
    const db = process.env.DATABASE_URL;
    let msg = e instanceof Error ? e.message : String(e);
    if (db) msg = msg.split(db).join('[redacted]');
    blocked(msg);
  }

  const v = evaluate(configs, roles, endpoint, { ignoreConfigs });
  console.log(`target endpoint ${endpoint}: ${v.matched.length} matching config(s): ${v.matched.join(', ') || '(none)'}`);
  console.log(`other Neon endpoint config(s) ignored: ${v.otherNeon.length}`);
  for (const i of v.ignored) console.log(`IGNORED via --ignore-config: ${i}`);
  for (const e of v.errors) console.error(`REFUSED: ${e}`);
  for (const f of v.findings) console.error(`REFUSED: config ${f.config} connects as role ${f.role}: ${f.reasons.join('; ')}`);
  if (v.pass) {
    console.log('PASS: no matching config connects as a bypass-capable role');
    return;
  }
  process.exit(v.errors.length && !v.findings.length ? 2 : 1);
}

main().catch((e) => blocked(e instanceof Error ? e.message : String(e)));
