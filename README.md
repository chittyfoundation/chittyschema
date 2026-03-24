![Foundation](https://img.shields.io/badge/Foundation-service-8B5CF6?style=flat-square)
![Tier](https://img.shields.io/badge/tier-0%20Trust%20Anchors-6366F1?style=flat-square)

# ChittySchema

> Schema governance service — the authoritative source of runtime data shapes for ChittyOS.

ChittySchema serves callable schema definitions that all services validate against at runtime. ChittyCanon defines the ontology (what entity types exist); ChittySchema serves the concrete data shapes those types take. It introspects the ecosystem's Neon PostgreSQL databases, generates TypeScript types and Zod validators, detects schema drift between services, and publishes the `@chittyos/schema` package. Deployed as a Cloudflare Worker (Hono) with a Cloudflare KV schema registry.

**Domain**: `schema.chitty.cc`
