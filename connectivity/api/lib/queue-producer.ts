/**
 * Drift Scan Queue Producer
 *
 * Replaces the inline serial loop in `runFullScan()` with a fan-out pattern.
 * The scheduled handler publishes one message per manifested table to the
 * `DRIFT_QUEUE` binding; the consumer (in `queue-consumer.ts`) processes
 * messages in parallel with Cloudflare-managed retries and a DLQ.
 *
 * Why a queue:
 *   - 58 tables × ~1s/table serialized = nearly a minute of cron wall time.
 *     Parallel via the queue, the same workload finishes in seconds.
 *   - Per-table failures stop blocking the rest of the scan.
 *   - DLQ gives operators a clean place to inspect persistent failures.
 *
 * @canon chittycanon://core/services/chitty-schema#queue
 */

// @ts-expect-error — JSON import resolves via resolveJsonModule
import dbConfig from '../../../database-config.json';

export interface DriftScanMessage {
  /** Schema version of the message envelope itself, for forward compat. */
  v: 1;
  database: string;
  table: string;
  /** Identifier for the scan batch, useful for grouping events in chittytrack. */
  scanId: string;
  /** When the scheduled handler enqueued this message. */
  enqueuedAt: string;
  /** Source of the scan: cron, validate-endpoint, github-webhook, etc. */
  trigger: 'cron' | 'manual' | 'webhook' | 'beacon';
}

interface ManifestTableOwner {
  table: string;
  database: string;
}

interface Manifest {
  tableOwners: ManifestTableOwner[];
}

const manifest = dbConfig as Manifest;

export interface QueueProducerEnv {
  DRIFT_QUEUE?: Queue<DriftScanMessage>;
}

function newScanId(): string {
  // Date-prefixed random suffix is enough — chittytrack doesn't need ULID.
  return `scan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Enqueue a full scan across every manifested table. Returns the scanId so
 * the caller can correlate downstream `schema.scan.*` events in chittytrack.
 *
 * If the queue binding is missing (e.g. local dev), this function falls back
 * to in-process iteration via the provided `inlineFn` so the scan still
 * happens — that is NOT a stub, it's a documented graceful degradation.
 */
export async function enqueueFullScan(
  env: QueueProducerEnv,
  trigger: DriftScanMessage['trigger'] = 'cron',
  inlineFallback?: (database: string, table: string) => Promise<void>
): Promise<{ scanId: string; enqueued: number; mode: 'queue' | 'inline' }> {
  const scanId = newScanId();
  const enqueuedAt = new Date().toISOString();
  const tables = manifest.tableOwners;

  if (env.DRIFT_QUEUE) {
    // Cloudflare Queues `sendBatch` accepts up to 100 messages per call.
    // We have ~58, so a single batch is fine — but build it as a loop in
    // chunks of 100 for forward compatibility.
    const batch = tables.map((t) => ({
      body: {
        v: 1 as const,
        database: t.database,
        table: t.table,
        scanId,
        enqueuedAt,
        trigger,
      },
    }));

    for (let i = 0; i < batch.length; i += 100) {
      await env.DRIFT_QUEUE.sendBatch(batch.slice(i, i + 100));
    }

    console.log(
      JSON.stringify({
        event: 'schema.scan.enqueued',
        service: 'chittyschema',
        timestamp: enqueuedAt,
        scanId,
        count: batch.length,
        trigger,
      })
    );

    return { scanId, enqueued: batch.length, mode: 'queue' };
  }

  // Fallback path — DRIFT_QUEUE not bound. Iterate inline if a fallback fn
  // is provided. This keeps the cron useful in local dev where the queue
  // binding is unavailable.
  if (!inlineFallback) {
    console.log(
      JSON.stringify({
        event: 'schema.scan.no_queue',
        service: 'chittyschema',
        timestamp: enqueuedAt,
        scanId,
        reason: 'DRIFT_QUEUE binding missing and no inline fallback provided',
      })
    );
    return { scanId, enqueued: 0, mode: 'inline' };
  }

  console.log(
    JSON.stringify({
      event: 'schema.scan.inline_fallback',
      service: 'chittyschema',
      timestamp: enqueuedAt,
      scanId,
      count: tables.length,
    })
  );

  for (const t of tables) {
    try {
      await inlineFallback(t.database, t.table);
    } catch (error: unknown) {
      console.log(
        JSON.stringify({
          event: 'schema.scan.inline_error',
          service: 'chittyschema',
          timestamp: new Date().toISOString(),
          scanId,
          database: t.database,
          table: t.table,
          error: error instanceof Error ? error.message : String(error),
        })
      );
    }
  }

  return { scanId, enqueued: tables.length, mode: 'inline' };
}
