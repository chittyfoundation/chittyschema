#!/usr/bin/env tsx
/**
 * CI script: validate database-config.json against the manifest meta-schema.
 *
 * Run via:
 *   npm run validate:manifest
 *
 * Exit codes:
 *   0 — manifest is structurally valid AND all cross-references resolve
 *   1 — schema or cross-reference errors detected (PR rejected)
 *
 * This is the CI guardrail that prevents Phase 1 of the schema policy from
 * regressing. Adding a malformed tableOwners[] entry will fail this check
 * before the PR can merge.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateManifest } from '../api/lib/meta-validator';

const __dirname = dirname(fileURLToPath(import.meta.url));
const manifestPath = resolve(__dirname, '..', 'database-config.json');

function main(): void {
  let manifest: unknown;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (err) {
    console.error(`✗ Failed to read or parse ${manifestPath}`);
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  const result = validateManifest(manifest);

  if (result.valid) {
    const m = manifest as {
      databases: unknown[];
      tableOwners: unknown[];
    };
    console.log(`✓ database-config.json is valid`);
    console.log(`  databases: ${m.databases.length}`);
    console.log(`  tableOwners: ${m.tableOwners.length}`);
    process.exit(0);
  }

  console.error(`✗ database-config.json failed validation (${result.errors.length} errors)`);
  for (const error of result.errors) {
    console.error(`  ${error.path}: ${error.message} [${error.keyword}]`);
  }
  process.exit(1);
}

main();
