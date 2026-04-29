/**
 * Fractal scope projector — shared library.
 *
 * Projects local service lifecycle events into the canonical `scopes`
 * table in ChittyOS-Core (Neon). Uses the fractal scope primitive from
 * migration 002_fractal_scopes.sql — self-similar via parent_scope_id,
 * lifecycle via scope_status enum, domain taxonomy via scope_type.
 *
 * Fire-and-forget via waitUntil so local app flows remain authoritative.
 * Fall-open: no CHITTYOS_CORE_DATABASE_URL = silent no-op.
 *
 * Usage:
 *   import { scopeLog, projectScope } from '@chittyos/schema/scope-projector';
 *
 *   // In a Hono route handler:
 *   scopeLog(c, {
 *     source: 'evidence.chitty.cc',
 *     creator: 'service:evidence.chitty.cc',
 *     externalId: caseId,
 *     scopeType: 'legal_case',
 *     characterization: 'Case',
 *     title: `Case ${caseNumber}`,
 *     localStatus: 'active',
 *   }, { CHITTYOS_CORE_DATABASE_URL: env.CHITTYOS_CORE_DATABASE_URL });
 *
 * @canon: chittycanon://gov/governance#core-types
 */

import { neon, Pool } from '@neondatabase/serverless';

// -- Canonical scope_status enum (002_fractal_scopes.sql) -----------------

export type ScopeStatus =
  | 'new'
  | 'active'
  | 'waiting'
  | 'escalated'
  | 'paused'
  | 'resolved'
  | 'closed'
  | 'archived';

// -- Canonical scope_characterization enum --------------------------------

export type ScopeCharacterization =
  | 'Case'
  | 'Session'
  | 'Transaction'
  | 'Incident'
  | 'Project'
  | 'Engagement';

// -- Canonical scope_type vocabulary --------------------------------------
// Free-text by schema design, but services SHOULD use these registered
// values for cross-service querying. New domains add entries here — zero DDL.
// @canon: chittycanon://gov/governance#fractal-scope-types

export const SCOPE_TYPES = {
  // Finance domain (chittyfinance)
  maintenance_request: 'maintenance_request',
  expense_approval: 'expense_approval',
  billing_cycle: 'billing_cycle',
  payment_processing: 'payment_processing',
  financial_review: 'financial_review',

  // Legal domain (chittyevidence, chittyresolution)
  legal_case: 'legal_case',
  evidence_chain: 'evidence_chain',
  dispute: 'dispute',
  mediation: 'mediation',
  compliance_review: 'compliance_review',

  // Operations domain (chittytrace, chittyproof)
  trace_investigation: 'trace_investigation',
  proof_session: 'proof_session',
  audit_trail: 'audit_trail',

  // Service domain (chittyreception, chittyconcierge)
  intake_session: 'intake_session',
  engagement: 'engagement',
  onboarding: 'onboarding',

  // Platform domain (chittycommand, chittydiscovery)
  project: 'project',
  discovery_scan: 'discovery_scan',
  deployment: 'deployment',

  // Context domain (chittycontextual)
  context_session: 'context_session',
  conversation: 'conversation',
} as const;

export type ScopeType = (typeof SCOPE_TYPES)[keyof typeof SCOPE_TYPES];

// -- Public interface for callers -----------------------------------------

export interface ScopeProjection {
  /** Service origin — e.g. 'evidence.chitty.cc'. Used for upsert dedup. */
  source: string;
  /** Creator identity — e.g. 'service:evidence.chitty.cc' */
  creator: string;
  /** Local workflow ID — becomes external_id for upsert dedup */
  externalId: string;
  /** Domain taxonomy. Use SCOPE_TYPES values for interop. */
  scopeType: string;
  /** Canonical characterization */
  characterization?: ScopeCharacterization;
  /** Display title */
  title: string;
  /** Optional summary/description */
  summary?: string | null;
  /** Local workflow status — mapped to canonical scope_status */
  localStatus: string;
  /** Optional status reason */
  statusReason?: string;
  /** Optional parent scope ID for nesting */
  parentScopeId?: string;
  /** Domain-specific state (stored in metadata JSONB) */
  metadata?: Record<string, unknown>;
}

export interface ScopeEnv {
  /** Direct Neon connection string (for Express/non-Workers runtimes) */
  CHITTYOS_CORE_DATABASE_URL?: string;
  /** Hyperdrive binding for Core (cross-service aggregation) */
  CHITTYOS_CORE_DB?: { connectionString: string };
  /** Hyperdrive binding for the service's own DB (authoritative local scopes) */
  SERVICE_SCOPE_DB?: { connectionString: string };
  /** Direct Neon connection string for the service's own DB (Express fallback) */
  SERVICE_SCOPE_DATABASE_URL?: string;
}

// -- Default status mapping -----------------------------------------------
// Services can override with their own mapper via statusMapper option.

const DEFAULT_STATUS_MAP: Record<string, ScopeStatus> = {
  // Common lifecycle terms
  new: 'new',
  created: 'new',
  requested: 'new',
  pending: 'new',
  draft: 'new',

  active: 'active',
  approved: 'active',
  in_progress: 'active',
  open: 'active',
  investigating: 'active',

  waiting: 'waiting',
  blocked: 'waiting',
  on_hold: 'waiting',
  pending_review: 'waiting',

  escalated: 'escalated',

  paused: 'paused',
  suspended: 'paused',

  resolved: 'resolved',
  completed: 'resolved',
  verified: 'resolved',

  closed: 'closed',
  rejected: 'closed',
  cancelled: 'closed',
  dismissed: 'closed',

  archived: 'archived',
};

/**
 * Map a local status string to the canonical scope_status enum.
 * Falls back to 'new' for unknown values.
 */
export function toScopeStatus(
  localStatus: string,
  customMap?: Record<string, ScopeStatus>,
): ScopeStatus {
  const map = customMap
    ? { ...DEFAULT_STATUS_MAP, ...customMap }
    : DEFAULT_STATUS_MAP;
  return map[localStatus] ?? 'new';
}

/**
 * Upsert a scope row in chittyos-core's public.scopes table.
 *
 * Uses the unique index on (source, external_id) for idempotent upsert.
 * On conflict (same workflow projected again), updates status + metadata.
 * The DB trigger `trg_scopes_transitions` auto-logs state changes to
 * scope_events — no manual event inserts needed.
 */
/**
 * Execute a scope upsert against a single database connection.
 */
async function upsertScope(
  connStr: string,
  usePool: boolean,
  query: string,
  params: unknown[],
  label: string,
): Promise<void> {
  try {
    if (usePool) {
      const pool = new Pool({ connectionString: connStr });
      await pool.query(query, params);
    } else {
      const sql = neon(connStr);
      await sql(query, params);
    }
  } catch (err) {
    console.warn(`[scope-projector:${label}] upsert failed:`, err);
  }
}

/**
 * Project a scope into the service's own DB (authoritative) AND Core (aggregation).
 *
 * Fractal: the same scopes table exists at every level. The service DB is the
 * source of truth for its own scopes. Core aggregates all services' scopes for
 * cross-service queryability.
 *
 * Either or both targets may be absent — writes to whichever is configured.
 */
export async function projectScope(
  projection: ScopeProjection,
  env: ScopeEnv,
  options?: { statusMapper?: Record<string, ScopeStatus> },
): Promise<void> {
  const status = toScopeStatus(projection.localStatus, options?.statusMapper);
  const characterization = projection.characterization ?? 'Project';
  const metadata = JSON.stringify({
    localStatus: projection.localStatus,
    ...(projection.metadata ?? {}),
  });

  const query = `
    INSERT INTO public.scopes (
      canon_type, characterization, scope_type, status, status_reason,
      creator_id, current_agent_id, title, summary,
      source, external_id, parent_scope_id, metadata
    ) VALUES (
      'E', $1::scope_characterization, $2, $3::scope_status, $4,
      $5, $5, $6, $7, $8, $9, $10::uuid, $11::jsonb
    )
    ON CONFLICT (source, external_id)
      WHERE external_id IS NOT NULL AND deleted_at IS NULL
    DO UPDATE SET
      status = $3::scope_status,
      status_reason = $4,
      current_agent_id = $5,
      title = $6,
      summary = $7,
      metadata = $11::jsonb
  `;

  const params = [
    characterization,
    projection.scopeType,
    status,
    projection.statusReason ?? null,
    projection.creator,
    projection.title,
    projection.summary ?? null,
    projection.source,
    projection.externalId,
    projection.parentScopeId ?? null,
    metadata,
  ];

  // Write to service's own DB (authoritative) and Core (aggregation) in parallel
  const writes: Promise<void>[] = [];

  // Service DB — authoritative source of truth
  const serviceConn = env.SERVICE_SCOPE_DB?.connectionString ?? env.SERVICE_SCOPE_DATABASE_URL;
  if (serviceConn) {
    writes.push(upsertScope(serviceConn, !!env.SERVICE_SCOPE_DB, query, params, `${projection.source}:local`));
  }

  // Core DB — cross-service aggregation
  const coreConn = env.CHITTYOS_CORE_DB?.connectionString ?? env.CHITTYOS_CORE_DATABASE_URL;
  if (coreConn) {
    writes.push(upsertScope(coreConn, !!env.CHITTYOS_CORE_DB, query, params, `${projection.source}:core`));
  }

  if (writes.length > 0) {
    await Promise.all(writes);
  }
}

/**
 * Fire-and-forget scope projection via executionCtx.waitUntil.
 *
 * Works with Hono's context object or any object with an executionCtx
 * that provides waitUntil. Silently degrades in non-Workers runtimes.
 */
export function scopeLog(
  c: { executionCtx: { waitUntil(p: Promise<unknown>): void } },
  projection: ScopeProjection,
  env: ScopeEnv,
  options?: { statusMapper?: Record<string, ScopeStatus> },
): void {
  const promise = projectScope(projection, env, options);
  try {
    c.executionCtx.waitUntil(promise);
  } catch {
    // Test environment / non-Workers runtime — swallow.
  }
}

/**
 * Create a pre-configured projector for a specific service.
 * Reduces boilerplate — callers only provide the varying fields.
 *
 * Usage:
 *   const log = createScopeProjector('evidence.chitty.cc');
 *
 *   // In route handler:
 *   log(c, env, {
 *     externalId: caseId,
 *     scopeType: SCOPE_TYPES.legal_case,
 *     characterization: 'Case',
 *     title: `Case ${caseNumber}`,
 *     localStatus: 'active',
 *   });
 */
export function createScopeProjector(
  serviceHost: string,
  defaults?: {
    characterization?: ScopeCharacterization;
    statusMapper?: Record<string, ScopeStatus>;
  },
) {
  const source = serviceHost;
  const creator = `service:${serviceHost}`;

  return function log(
    c: { executionCtx: { waitUntil(p: Promise<unknown>): void } },
    env: ScopeEnv,
    projection: Omit<ScopeProjection, 'source' | 'creator'> & {
      characterization?: ScopeCharacterization;
    },
  ): void {
    scopeLog(
      c,
      {
        ...projection,
        source,
        creator,
        characterization:
          projection.characterization ?? defaults?.characterization ?? 'Project',
      },
      env,
      { statusMapper: defaults?.statusMapper },
    );
  };
}
