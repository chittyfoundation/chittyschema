# Repository Guidelines

## Project Structure & Module Organization
- `src/` TypeScript source. Key subfolders: `generated/` (auto‑generated types), `validators/` (Zod validators), `types/` (handwritten types). Entry: `src/index.ts`.
- `api/` Cloudflare Workers API (Hono). Routes in `api/routes/`, entry `api/index.ts`.
- `scripts/` One‑off generators/utilities (introspection, codegen, migrations, validation).
- `migrations/` Schema migration files. Do not edit `dist/` (build output).
- Tests live beside code: `src/**/*.test.ts`.
- CLI entry: `cli.ts` (published as `chittyschema`).

## Build, Test, and Development Commands
- Install: `npm ci`.
- Library dev: `npm run dev` (watches `src/index.ts`).
- API dev: `npm run dev:api` (Workers via `wrangler dev api/index.ts`).
- Build: `npm run build` (TypeScript + `tsc-alias`).
- Generate all: `npm run generate` (introspect DB → types, validators, docs).
- Validate: `npm run validate` (schema) and `npm run validate:service` (service compliance).
- Migrations: `npm run migration:create|apply|rollback`.
- Tests: `npm test` or `npm run test:watch`.
- Lint/format: `npm run lint`, `npm run format`.
- Deploy Workers: `npm run deploy` (or `:staging`, `:production`).

## Coding Style & Naming Conventions
- Language: TypeScript `strict`; 2‑space indentation.
- Naming: camelCase (values), PascalCase (types/classes), kebab-case (files), snake_case mirrors DB.
- Imports: prefer path aliases (`@/types/*`, `@/validators/*`).
- Use ESLint + Prettier; run before pushing.
- Do not edit `src/generated/` or `src/validators/` directly—regenerate.

## Testing Guidelines
- Framework: Vitest; place tests as `src/**/*.test.ts`.
- Unit test generators and validators; mock DB I/O; no network calls.
- Keep tests deterministic; use `npm run test:watch` during development.

## Commit & Pull Request Guidelines
- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.
- PRs must include: clear description, linked issues, notes on schema/codegen impact, and CLI/API usage examples. Add screenshots for API route docs if relevant.

## Security & Configuration Tips
- Copy `.env.example` to `.env`; never commit secrets.
- Configure DB and Wrangler creds before `generate` or local API dev.
- Review `database-config.json` and `wrangler.toml` before running codegen/deploy.

## Agent‑Specific Tips
- Prefer script entrypoints over ad‑hoc changes.
- After DB changes: `npm run generate` then `npm run build`.
- Update docs if routes/types change: `npm run generate:docs`.
