![Foundation](https://img.shields.io/badge/Foundation-service-8B5CF6?style=flat-square)
![Tier](https://img.shields.io/badge/tier-0%20Trust%20Anchors-6366F1?style=flat-square)
![Deploy](https://img.shields.io/badge/deploy-Cloudflare%20Workers-F38020?style=flat-square&logo=cloudflare)

# ChittySchema

> Schema governance service — the authoritative source of runtime data shapes for ChittyOS.

ChittySchema serves callable schema definitions that all services validate against at runtime.

- Coordinates with **ChittyCanon**, which defines the ontology (what entity types exist), while ChittySchema serves the concrete data shapes those types take.
- Introspects the ecosystem's Neon PostgreSQL databases.
- Generates TypeScript types and Zod validators.
- Detects schema drift between services.
- Publishes the `@chittyos/schema` package.

Deployed as a Cloudflare Worker (Hono) with a Cloudflare KV schema registry.
**Domain**: `schema.chitty.cc`
