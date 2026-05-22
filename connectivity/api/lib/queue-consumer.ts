/**
 * Drift Scan Queue Consumer
 *
 * Receives messages published by `enqueueFullScan()` and runs the actual
 * `checkTable()` for each one. Cloudflare Queues handles retries and routes
 * persistent failures to the DLQ (`chittyschema-drift-scan-dlq`).
 *
 * Each successful scan also writes the resulting `DriftState` to the R2
 * archive bucket so operators have an immutable, queryable history.
 *
 * @canon chittycanon://core/services/chittyschema#queue-consumer
 */

import { checkTable } from './drift-check';
import { archiveDriftEvent } from './r2-archive';
import type { DriftScanMessage } from './queue-producer';

export interface QueueConsumerEnv {
  REGISTRY_KV?: KVNamespace;
  BEACON_STORE?: KVNamespace;
  CANON_CACHE?: KVNamespace;
  DRIFT_ARCHIVE?: R2Bucket;
  [secretEnvVar: string]: unknown;
}

/**
 * Process one batch of drift-scan messages. Cloudflare Queues passes the
 * batch to this function via the worker `queue()` handler.
 *
 * Each message is acknowledged or retried independently — a single failure
 * does not block the rest of the batch.
 */
export async function handleDriftScanBatch(
  batch: MessageBatch<DriftScanMessage>,
  env: QueueConsumerEnv
): Promise<void> {
  for (const message of batch.messages) {
    const { database, table, scanId, trigger } = message.body;
    try {
      const state = await checkTable(env, database, table);

      // Tag the structured log with the scanId so chittytrack can
      // group all events from one scan together.
      console.log(
        JSON.stringify({
          event: 'schema.scan.message_done',
          service: 'chittyschema',
          timestamp: new Date().toISOString(),
          scanId,
          database,
          table,
          status: state.status,
          trigger,
        })
      );

      // Archive every observation. Drift, ok, and skip events all go to R2 —
      // legal needs the negative observations too ("no drift on date X").
      const archiveResult = await archiveDriftEvent(env, state);
      if (archiveResult.stored) {
        console.log(
          JSON.stringify({
            event: 'schema.archive.stored',
            service: 'chittyschema',
            timestamp: new Date().toISOString(),
            scanId,
            key: archiveResult.key,
          })
        );
      }

      message.ack();
    } catch (error: unknown) {
      // Per-message failure: bubble to Cloudflare Queues retry, eventually
      // to the DLQ. Emit a structured error so operators see it in tail logs.
      console.log(
        JSON.stringify({
          event: 'schema.scan.message_error',
          service: 'chittyschema',
          timestamp: new Date().toISOString(),
          scanId,
          database,
          table,
          error: error instanceof Error ? error.message : String(error),
        })
      );
      message.retry({ delaySeconds: 30 });
    }
  }
}
