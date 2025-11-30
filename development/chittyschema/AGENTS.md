# Repository Guidelines

## Project Structure & Module Organization
- `src/` TypeScript source. Key subfolders: `generated/` (auto‑generated types), `validators/` (Zod validators), `types/` (handwritten types), `index.ts` (library entry).
- `api/` Cloudflare Workers API (Hono). `routes/` for endpoints, `index.ts` entry.
- `scripts/` One‑off generators and utilities (introspection, codegen, migrations, validation).
- `dist/` Build artifacts (emitted by `tsc`). Do not edit.
- `migrations/` Schema migration files.
- `cli.ts` Project CLI entry (published as `chittyschema`).

## Build, Test, and Development Commands
- Install: `npm ci`
- Library dev: `npm run dev` (watches `src/index.ts`).
- API dev (Workers): `npm run dev:api` (via `wrangler dev api/index.ts`).
- Build: `npm run build` (TypeScript + path alias fix via `tsc-alias`).
- Generate all: `npm run generate` (introspect DB → types, validators, docs).
- Validate schema: `npm run validate` and service compliance: `npm run validate:service`.
- Migrations: `npm run migration:create|apply|rollback`.
- Tests: `npm test` or `npm run test:watch` (Vitest).
- Lint/format: `npm run lint`, `npm run format`.
- Deploy Workers: `npm run deploy` (or `:staging`, `:production`).

## Coding Style & Naming Conventions
- Language: TypeScript (`strict` mode). Indentation: 2 spaces.
- Naming: camelCase (values), PascalCase (types/classes), kebab-case (files), snake_case mirrors DB.
- Imports: prefer path aliases (`@/types/*`, `@/validators/*`).
- Linting/formatting: ESLint + Prettier (run via scripts).
- Do not edit files under `src/generated/` or `src/validators/` directly; regenerate instead.

## Testing Guidelines
- Framework: Vitest. Place tests as `src/**/*.test.ts`.
- Unit test generators and validators; mock DB I/O.
- Keep tests deterministic; avoid network calls.
- Example: `npm run test:watch` during development.

## Commit & Pull Request Guidelines
- Use Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.
- PRs must include: clear description, linked issues, notes on schema/codegen impact, and any CLI/API usage examples.

## Security & Configuration Tips
- Configure `.env` from `.env.example`; never commit secrets. DB and Wrangler creds are required for introspection/dev.
- Review `database-config.json` and `wrangler.toml` before running `generate` or deploying.

## Agent‑Specific Tips
- Prefer script entrypoints over ad‑hoc changes. After DB changes: `npm run generate` then `npm run build`.
- Update docs if routes/types change (`npm run generate:docs`).
