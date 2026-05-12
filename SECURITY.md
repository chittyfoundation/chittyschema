---
uri: chittycanon://docs/ops/policy/chitty-schema-security
namespace: chittycanon://docs/ops
type: policy
version: 1.0.0
status: DRAFT
registered_with: chittycanon://core/services/canon
title: "ChittySchema Security Policy"
certifier: chittycanon://core/services/chittycertify
visibility: PUBLIC
---

# Security Policy

## Reporting a Vulnerability

If you discover a security issue in ChittySchema, report it privately through the CHITTYFOUNDATION security channels instead of opening a public issue.

Include:

- affected endpoint, route, or package surface
- reproduction steps
- potential impact
- proposed remediation (if available)

## Scope

This policy applies to:

- `connectivity/api/*` Cloudflare Worker routes and bindings
- schema generation and validation scripts under `identity/scripts/`
- published package artifacts under `@chittyos/schema`
