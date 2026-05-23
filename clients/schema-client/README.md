# @chittyos/schema-client

Attachable auto-syncing schema node for ChittyOS consumer services.

Calls `POST /api/registry/validate/:serviceName` on `schema.chitty.cc`, polls for drift, fires callbacks when the live schema version diverges from what the consumer was built against.

> **Status:** v0.1 — happy-path attach + poll only. No autocorrect, no push subscription, no OTLP yet. See chittyschema#63 for the full roadmap.

## Install

```bash
npm i @chittyos/schema-client
```

## Use

```ts
import { attach } from '@chittyos/schema-client';

const schema = await attach({
  serviceName: 'chittyledger',
  serviceVersion: '1.4.2',
  repoUrl: 'https://github.com/CHITTYFOUNDATION/chittyledger',
  branch: 'main',
  mode: 'warn',
  onDrift: (e) => console.warn(
    `schema drifted: live=${e.liveVersion} bundled=${e.bundledVersion}`,
  ),
});

console.log(schema.response.validation.overall_status); // 'compliant' | ...
console.log(schema.response.validation.score);          // 0–100
console.log(schema.response.recommendations);           // string[]

// when shutting down:
schema.stop();
```

## Modes

| Mode | Behavior |
|------|----------|
| `warn` (default) | Logs drift to stderr, calls `onDrift`. Always returns. |
| `enforce` | Throws if initial validation is `non_compliant`. |
| `autocorrect` | *Not implemented yet.* Will hot-load validator deltas from `/meta/*`. |

## Auth

Reads (validate) are currently open on `schema.chitty.cc`. If a `serviceToken` is provided, it's sent as `Authorization: Bearer <token>` — required once write-paths are gated.

## Channel

Standard HTTPS to the public Cloudflare Worker at `schema.chitty.cc`. No Tailscale, no Access policy. Egress only — works from any consumer (Workers, Node, CI, homelab).

## Canon

`chittycanon://core/services/chittyschema#client`
