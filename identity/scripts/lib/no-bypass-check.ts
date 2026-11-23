/**
 * Pure comparison logic for check-no-bypass-connections.
 *
 * Removal gate for the scope write-lock triggers (chittyschema PR #92 / #94):
 * the trigger-dropping migration may only be applied when no Hyperdrive config
 * pointing at chittyos-core connects as a role that could bypass them.
 *
 * No I/O here. Passwords are never part of the input shape.
 */

export const CORE_ENDPOINT_ID = 'ep-green-water-ael1lksw';

export const SCOPE_TABLES = [
  'scopes',
  'scope_parties',
  'scope_events',
  'scope_artifacts',
  'scope_external_refs',
] as const;

export interface HyperdriveConfig {
  id?: string;
  name: string;
  origin: { host: string; database?: string; user: string };
}

export interface RolesData {
  roles: Array<{ rolname: string; rolsuper: boolean; rolbypassrls: boolean }>;
  /** Owners of the scope tables that exist in the target (absent tables are simply missing). */
  tables: Array<{ table: string; owner: string }>;
  /** pg_has_role(role, target, 'MEMBER') for every target = table owners + superuser/BYPASSRLS roles. */
  member_of: Array<{ role: string; target: string; is_member: boolean }>;
}

export interface Finding {
  config: string;
  role: string;
  reasons: string[];
}

export interface Verdict {
  pass: boolean;
  matched: string[];
  /** Configs on a different Neon endpoint (ignored). */
  otherNeon: string[];
  /** Unclassifiable configs excluded via --ignore-config, as "name (id)". Always printed. */
  ignored: string[];
  findings: Finding[];
  /** Fail-closed conditions (nothing matched, role absent, scopes missing). */
  errors: string[];
}

/** Single read-only statement producing a RolesData document. */
export const ROLES_SQL = `
WITH owners AS (
  SELECT c.relname AS tbl, pg_get_userbyid(c.relowner) AS owner
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r','p')
    AND c.relname IN ('scopes','scope_parties','scope_events','scope_artifacts','scope_external_refs')
), targets AS (
  SELECT owner AS rolname FROM owners
  UNION SELECT rolname FROM pg_roles WHERE rolsuper OR rolbypassrls
)
SELECT json_build_object(
  'roles', (SELECT COALESCE(json_agg(json_build_object('rolname', rolname, 'rolsuper', rolsuper, 'rolbypassrls', rolbypassrls) ORDER BY rolname), '[]'::json) FROM pg_roles WHERE rolname !~ '^pg_'),
  'tables', (SELECT COALESCE(json_agg(json_build_object('table', tbl, 'owner', owner) ORDER BY tbl), '[]'::json) FROM owners),
  'member_of', (SELECT COALESCE(json_agg(json_build_object('role', r.rolname, 'target', t.rolname, 'is_member', pg_has_role(r.rolname, t.rolname, 'MEMBER')) ORDER BY r.rolname, t.rolname), '[]'::json)
                FROM pg_roles r CROSS JOIN targets t WHERE r.rolname !~ '^pg_' AND r.rolname <> t.rolname)
) AS result`;

export type HostClass = 'target' | 'other-neon' | 'unclassifiable';

const NEON_SUFFIX = '[a-z0-9-]+(?:\\.[a-z0-9-]+)*\\.neon\\.tech';

export function normalizeHost(host: string): string {
  return host.trim().toLowerCase().replace(/\.$/, '');
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Every config is exactly one of: target (Neon grammar for the target endpoint),
 * other-neon (Neon grammar for any other ep-... endpoint), or unclassifiable
 * (IP, custom host, non-Neon host) which the gate refuses unless ignored explicitly.
 */
export function classifyHost(host: string, endpoint: string): HostClass {
  const h = normalizeHost(host);
  const target = new RegExp(`^${escapeRegex(endpoint.toLowerCase())}(-pooler)?\\.${NEON_SUFFIX}$`);
  if (target.test(h)) return 'target';
  if (new RegExp(`^ep-[a-z0-9-]+?(-pooler)?\\.${NEON_SUFFIX}$`).test(h)) return 'other-neon';
  return 'unclassifiable';
}

export interface EvaluateOptions {
  /** Hyperdrive config ids explicitly excluded from the unclassifiable refusal. */
  ignoreConfigs?: string[];
}

export function evaluate(
  configs: HyperdriveConfig[],
  data: RolesData,
  endpoint: string = CORE_ENDPOINT_ID,
  opts: EvaluateOptions = {},
): Verdict {
  const errors: string[] = [];
  const findings: Finding[] = [];
  const ignoreIds = new Set(opts.ignoreConfigs ?? []);

  const matched: HyperdriveConfig[] = [];
  const otherNeon: string[] = [];
  const ignored: string[] = [];
  const usedIgnores = new Set<string>();
  for (const c of configs) {
    const cls = classifyHost(c.origin.host, endpoint);
    if (cls === 'target') matched.push(c);
    else if (cls === 'other-neon') otherNeon.push(c.name);
    else if (c.id !== undefined && ignoreIds.has(c.id)) {
      usedIgnores.add(c.id);
      ignored.push(`${c.name} (${c.id})`);
    } else {
      errors.push(
        `config ${c.name}${c.id ? ` (${c.id})` : ''}: host ${JSON.stringify(c.origin.host)} is unclassifiable ` +
          `(not a Neon host); it may reach the target database. Re-run with --ignore-config <id> only if verified unrelated`,
      );
    }
  }
  for (const id of ignoreIds) {
    if (!usedIgnores.has(id)) {
      errors.push(`--ignore-config ${id} does not match any unclassifiable config (typo, stale, or it is a Neon-host config that cannot be ignored)`);
    }
  }
  if (matched.length === 0) {
    errors.push(`no Hyperdrive config matches target endpoint ${endpoint}`);
  }
  if (!data.tables.some((t) => t.table === 'scopes')) {
    errors.push('table "scopes" is missing from the target database');
  }

  const owners = new Set(data.tables.map((t) => t.owner));
  const privileged = new Set(
    data.roles.filter((r) => r.rolsuper || r.rolbypassrls).map((r) => r.rolname),
  );
  const guarded = new Set([...owners, ...privileged]);

  for (const cfg of matched) {
    const user = cfg.origin.user;
    const role = data.roles.find((r) => r.rolname === user);
    if (!role) {
      errors.push(`config ${cfg.name}: role ${user} is absent from roles data`);
      continue;
    }
    const reasons: string[] = [];
    if (role.rolsuper) reasons.push('superuser');
    if (role.rolbypassrls) reasons.push('BYPASSRLS');
    const owned = data.tables.filter((t) => t.owner === user).map((t) => t.table);
    if (owned.length) reasons.push(`owns ${owned.join(', ')}`);
    for (const m of data.member_of) {
      if (m.role === user && m.is_member && guarded.has(m.target)) {
        reasons.push(`member of ${owners.has(m.target) ? 'owner' : 'privileged'} role ${m.target}`);
      }
    }
    if (reasons.length) findings.push({ config: cfg.name, role: user, reasons });
  }

  return {
    pass: errors.length === 0 && findings.length === 0,
    matched: matched.map((c) => c.name),
    otherNeon,
    ignored,
    findings,
    errors,
  };
}

function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

/** Validate untrusted JSON into the typed shapes; throws on any mismatch. */
export function parseHyperdrive(json: unknown): HyperdriveConfig[] {
  if (!Array.isArray(json)) throw new Error('hyperdrive data must be an array');
  return json.map((c, i) => {
    if (!isObj(c) || typeof c.name !== 'string' || !isObj(c.origin) ||
        typeof c.origin.host !== 'string' || typeof c.origin.user !== 'string') {
      throw new Error(`hyperdrive config #${i} lacks name/origin.host/origin.user`);
    }
    return {
      id: typeof c.id === 'string' ? c.id : undefined,
      name: c.name,
      origin: {
        host: c.origin.host,
        database: typeof c.origin.database === 'string' ? c.origin.database : undefined,
        user: c.origin.user,
      },
    };
  });
}

export function parseRoles(json: unknown): RolesData {
  if (!isObj(json) || !Array.isArray(json.roles) || !Array.isArray(json.tables) || !Array.isArray(json.member_of)) {
    throw new Error('roles data must have roles[], tables[], member_of[]');
  }
  const ok =
    json.roles.every((r) => isObj(r) && typeof r.rolname === 'string' && typeof r.rolsuper === 'boolean' && typeof r.rolbypassrls === 'boolean') &&
    json.tables.every((t) => isObj(t) && typeof t.table === 'string' && typeof t.owner === 'string') &&
    json.member_of.every((m) => isObj(m) && typeof m.role === 'string' && typeof m.target === 'string' && typeof m.is_member === 'boolean');
  if (!ok) throw new Error('roles data has malformed entries');
  return json as unknown as RolesData;
}

/** Cloudflare list-response paging metadata (only the fields used). */
export interface ResultInfo {
  total_count?: number;
  total_pages?: number;
}

export interface PageState {
  page: number;
  perPage: number;
  maxPages: number;
  /** Configs fetched so far, including the page just read. */
  fetched: number;
  /** Size of the page just read. */
  lastLen: number;
  resultInfo?: ResultInfo;
}

export type PageDecision = { action: 'continue' } | { action: 'done' } | { action: 'error'; reason: string };

/**
 * Decide after each page whether to continue, stop, or fail closed.
 * Never stops silently on truncation: a full last page at the ceiling, or a
 * fetched count that disagrees with total_count, is an error.
 */
export function decidePage(s: PageState): PageDecision {
  const total = s.resultInfo?.total_count;
  const pages = s.resultInfo?.total_pages;
  if (typeof total === 'number') {
    if (s.fetched === total) return { action: 'done' };
    if (s.fetched > total) return { action: 'error', reason: `fetched ${s.fetched} configs but API total_count is ${total}` };
    if (s.lastLen === 0) return { action: 'error', reason: `fetched ${s.fetched} of ${total} configs and the next page was empty` };
  } else if (typeof pages === 'number' && s.page >= pages) {
    return { action: 'done' };
  } else if (typeof pages !== 'number' && s.lastLen < s.perPage) {
    return { action: 'done' };
  }
  if (s.page >= s.maxPages) {
    return { action: 'error', reason: `page ceiling ${s.maxPages} reached with more configs possibly remaining (${s.fetched} fetched); refusing to truncate` };
  }
  return { action: 'continue' };
}
