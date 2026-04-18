# ChittySchema

**The Universal Data Framework for ChittyOS** - Single source of truth for all database schemas, types, and validators.

[![npm version](https://img.shields.io/npm/v/@chittyos/schema.svg)](https://www.npmjs.com/package/@chittyos/schema)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)

## What is ChittySchema?

**chittyschema** is NOT a collection of hard-coded schemas. It is a **dynamic introspection and type generation system** that:

1. **Introspects** live PostgreSQL databases (ChittyOS-Core + ChittyLedger)
2. **Generates** TypeScript types that perfectly match the database
3. **Creates** Zod validators for runtime validation  
4. **Produces** documentation with ownership and relationships
5. **Distributes** as an npm package to all ChittyOS services

**The database is the source of truth.** Types follow schema, not vice versa.

See [SCHEMA_GOVERNANCE.md](./SCHEMA_GOVERNANCE.md) for complete workflow, rules, and authority model.

## Token‑Efficient Output

For CI and LLM pipelines, the CLI supports a compact output mode that emits single‑line JSON summaries and suppresses verbose logs:

- Add `--style compact` (or `--compact`) to any `chittyschema` command, e.g.
  - `chittyschema introspect --style compact`
  - `chittyschema generate types --compact`
  - `chittyschema validate ../service --compact`

You can also set `CHITTY_OUTPUT_STYLE=compact` for `npm run` scripts.
