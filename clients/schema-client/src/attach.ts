/**
 * @canon chittycanon://core/services/chittyschema#client-attach
 *
 * Minimum-viable schema-client attach: validate, fetch live manifest, poll for drift.
 * Server-side dependency: POST /api/registry/validate/:serviceName (PR #58).
 */

import type {
  AttachOptions,
  AttachedSchema,
  DriftEvent,
  ValidateResponse,
} from './types.js';

const DEFAULT_REGISTRY = 'https://schema.chitty.cc';
const DEFAULT_POLL_MS = 15 * 60 * 1000;
const DEFAULT_MODE = 'warn' as const;

export async function attach(opts: AttachOptions): Promise<AttachedSchema> {
  const registry = opts.registry ?? DEFAULT_REGISTRY;
  const mode = opts.mode ?? DEFAULT_MODE;
  const pollIntervalMs = opts.pollIntervalMs ?? DEFAULT_POLL_MS;

  const initial = await validate(registry, opts);
  const liveVersion = initial.validation.evidence.version ?? opts.serviceVersion;

  maybeEmitDrift(opts, initial, liveVersion);

  if (mode === 'enforce' && initial.validation.overall_status === 'non_compliant') {
    throw new Error(
      `schema-client: ${opts.serviceName} is non_compliant against live schema (mode=enforce). recommendations=${JSON.stringify(initial.recommendations)}`,
    );
  }

  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const refresh = async (): Promise<ValidateResponse> => {
    const next = await validate(registry, opts);
    const nextVersion = next.validation.evidence.version ?? opts.serviceVersion;
    maybeEmitDrift(opts, next, nextVersion);
    return next;
  };

  const scheduleNext = () => {
    if (stopped) return;
    timer = setTimeout(async () => {
      try {
        await refresh();
      } catch (err) {
        console.warn(`[schema-client] poll failed for ${opts.serviceName}:`, err);
      } finally {
        scheduleNext();
      }
    }, pollIntervalMs);
    if (timer && typeof timer.unref === 'function') timer.unref();
  };

  scheduleNext();

  return {
    serviceName: opts.serviceName,
    bundledVersion: opts.serviceVersion,
    liveVersion,
    response: initial,
    refresh,
    stop: () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    },
  };
}

async function validate(
  registry: string,
  opts: AttachOptions,
): Promise<ValidateResponse> {
  const url = `${registry.replace(/\/+$/, '')}/api/registry/validate/${encodeURIComponent(opts.serviceName)}`;
  const body: Record<string, unknown> = { version: opts.serviceVersion };
  if (opts.repoUrl) body.repoUrl = opts.repoUrl;
  if (opts.branch) body.branch = opts.branch;

  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'user-agent': `@chittyos/schema-client/${opts.serviceName}@${opts.serviceVersion}`,
  };
  if (opts.serviceToken) headers.authorization = `Bearer ${opts.serviceToken}`;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `schema-client: validate ${opts.serviceName} failed HTTP ${res.status}: ${text.slice(0, 200)}`,
    );
  }

  return (await res.json()) as ValidateResponse;
}

function maybeEmitDrift(
  opts: AttachOptions,
  response: ValidateResponse,
  liveVersion: string,
): void {
  if (liveVersion === opts.serviceVersion) return;
  const event: DriftEvent = {
    serviceName: opts.serviceName,
    bundledVersion: opts.serviceVersion,
    liveVersion,
    detectedAt: new Date().toISOString(),
    response,
  };
  console.warn(
    `[schema-client] drift detected: ${event.serviceName} bundled=${event.bundledVersion} live=${event.liveVersion}`,
  );
  opts.onDrift?.(event);
}
