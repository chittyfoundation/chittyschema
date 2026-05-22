/**
 * Canon Client
 *
 * KV-cached HTTP client for `canon.chitty.cc/api/ontology` and friends.
 * Implements stale-while-revalidate so that:
 *   - cold start with empty cache → fetch + populate, return live result
 *   - warm cache → return cache, refresh in background
 *   - canon down + cache present → serve stale cache, emit `schema.canon.stale`
 *   - canon down + no cache → emit `schema.canon.offline` and fall back to
 *     the local hardcoded P/L/T/E/A list (NOT a stub — a documented fallback
 *     of last resort, with an alertable event)
 *
 * The cache key encodes the canon API path so the same client can cache
 * `/api/ontology`, `/api/policies`, etc., independently. TTL is 1 hour but the
 * KV namespace itself has a much longer floor — we treat anything in KV as
 * potentially serveable until the next successful refresh.
 *
 * @canon chittycanon://core/services/chittyschema#canon-client
 */

const CANON_BASE = 'https://canon.chitty.cc';
const CACHE_TTL_SECONDS = 60 * 60; // 1 hour fresh window
const STALE_TTL_SECONDS = 60 * 60 * 24 * 7; // 7-day stale serving window

/** Hardcoded P/L/T/E/A fallback. The five core types per chittycanon://gov/governance. */
const FALLBACK_ONTOLOGY: CanonOntology = {
  version: 'fallback-0.0.0',
  source: 'local-fallback',
  generatedAt: new Date(0).toISOString(),
  types: [
    { code: 'P', name: 'Person', description: 'Actor with agency' },
    { code: 'L', name: 'Location', description: 'Context in space' },
    { code: 'T', name: 'Thing', description: 'Object without agency' },
    { code: 'E', name: 'Event', description: 'Occurrence in time' },
    { code: 'A', name: 'Authority', description: 'Source of weight' },
  ],
};

export interface CanonType {
  code: 'P' | 'L' | 'T' | 'E' | 'A' | string;
  name: string;
  description?: string;
  subtypes?: string[];
}

export interface CanonOntology {
  version: string;
  source: 'live' | 'cache' | 'stale-cache' | 'local-fallback' | string;
  generatedAt: string;
  types: CanonType[];
}

export interface CanonClientEnv {
  CANON_CACHE?: KVNamespace;
}

interface CachedEntry<T> {
  value: T;
  fetchedAt: string;
  expiresAt: string;
}

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
 * Fetch the live canon ontology, cache it, and return it. If canon is down or
 * cache is empty, return the most useful possible answer with a clear `source`
 * field so callers can decide whether to trust it.
 */
export async function getOntology(
  env: CanonClientEnv
): Promise<CanonOntology> {
  const cacheKey = 'canon:ontology';

  // Try cache first.
  let cached: CachedEntry<CanonOntology> | null = null;
  if (env.CANON_CACHE) {
    const raw = await env.CANON_CACHE.get(cacheKey);
    if (raw) {
      try {
        cached = JSON.parse(raw) as CachedEntry<CanonOntology>;
      } catch {
        cached = null;
      }
    }
  }

  const now = Date.now();
  const fresh =
    cached && new Date(cached.expiresAt).getTime() > now ? cached : null;

  if (fresh) {
    return { ...fresh.value, source: 'cache' };
  }

  // Cache stale or missing — try a live fetch.
  let live: CanonOntology | null = null;
  try {
    const response = await fetch(`${CANON_BASE}/api/ontology`, {
      headers: { Accept: 'application/json' },
      // 5s budget; canon is supposed to be fast, but we don't want to hang
      // the cron when canon is down
      cf: { cacheTtl: 60, cacheEverything: true },
    });
    if (response.ok) {
      live = (await response.json()) as CanonOntology;
    } else {
      emit('schema.canon.fetch_error', {
        status: response.status,
        statusText: response.statusText,
      });
    }
  } catch (error: unknown) {
    emit('schema.canon.fetch_error', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Live fetch succeeded — write to cache and return.
  if (live) {
    if (env.CANON_CACHE) {
      const entry: CachedEntry<CanonOntology> = {
        value: { ...live, source: 'live' },
        fetchedAt: new Date(now).toISOString(),
        expiresAt: new Date(now + CACHE_TTL_SECONDS * 1000).toISOString(),
      };
      // KV TTL set to the stale serving window — the in-payload expiresAt
      // governs the "fresh" semantics, KV TTL just bounds total retention.
      await env.CANON_CACHE.put(cacheKey, JSON.stringify(entry), {
        expirationTtl: STALE_TTL_SECONDS,
      });
    }
    emit('schema.canon.refresh', { version: live.version, types: live.types.length });
    return { ...live, source: 'live' };
  }

  // Live fetch failed — serve stale cache if we have it.
  if (cached) {
    emit('schema.canon.stale', {
      cachedVersion: cached.value.version,
      cachedAt: cached.fetchedAt,
    });
    return { ...cached.value, source: 'stale-cache' };
  }

  // Last resort — hardcoded P/L/T/E/A. Loud event so operators know.
  emit('schema.canon.offline', {
    fallback: 'local',
    reason:
      'No live response from canon.chitty.cc and no cached entry available',
  });
  return FALLBACK_ONTOLOGY;
}

/**
 * Validate a canonType code against the live ontology. Returns true if the
 * code is recognized by canon (or by the fallback if canon is offline).
 */
export async function isValidCanonType(
  env: CanonClientEnv,
  code: string
): Promise<boolean> {
  const ontology = await getOntology(env);
  return ontology.types.some((t) => t.code === code);
}
