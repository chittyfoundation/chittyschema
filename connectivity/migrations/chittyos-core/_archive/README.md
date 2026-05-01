# Archived chittyos-core migrations

Migrations in this directory were authored but never adopted as canonical. They are kept here as historical record — **do not run them against production**.

## Files

### `001_upgrade_trust_scores_to_6d.sql`

- **Authored:** August 2025 (initial chittyschema migration set)
- **Status:** Never applied to production
- **Superseded by:** `connectivity/migrations/chittyos-core/004_trust_scores_ty_vy_ry.sql`
- **Reason for archival:** The 6D scoring model (source/temporal/channel/outcome/network/justice + people/legal/state/chitty) was a candidate model that was never adopted. The canonical scoring model per White Paper v2.1 is TY/VY/RY (idenTitY / connectiVitY / authoRitY), implemented by migration 004. Production `trust_scores` skipped 001 entirely — its columns went from the original pre-6D shape (base_score / history_score / etc.) directly to the additive TY/VY/RY columns.

Verified empty-impact via Neon describe_table_schema against `restless-grass-40598426/trust_scores` on 2026-05-01: zero columns from this migration ever existed in production.

## Policy

`connectivity/migrations/<db>/` is the manifest of migrations that should be applied (or have already been applied). `_archive/` is for migrations that were considered but rejected. Migration runners (`npm run migration:apply`) should ignore `_archive/` directories.
