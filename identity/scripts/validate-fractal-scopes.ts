#!/usr/bin/env tsx
/**
 * validate-fractal-scopes.ts
 *
 * Static validator for fractal-scope wiring in a service's wrangler config.
 *
 * Checks (current scope — wrangler-only):
 * 1. Wrangler config has CHITTYOS_CORE_DB Hyperdrive binding (Core aggregation)
 * 2. Wrangler config has SERVICE_SCOPE_DB Hyperdrive binding (local authoritative scopes)
 * 3. Both Hyperdrive IDs are present and non-empty (>= 10 chars sanity check)
 *
 * The actual Neon-side check (that the service DB has the four
 * scopes/scope_parties/scope_events/scope_artifacts tables) is deliberately
 * NOT performed here — it requires Neon credentials and lives in the
 * post-deploy validation pass run by the schema overlord, not in
 * pre-merge static lint.
 *
 * Usage:
 *   npx tsx identity/scripts/validate-fractal-scopes.ts --wrangler <path-to-wrangler.jsonc>
 *
 * Exit code: 0 on success, 1 if any critical violation.
 *
 * @canon chittycanon://gov/governance#fractal-scope-types
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

interface Violation {
  severity: 'critical' | 'error' | 'warning';
  check: string;
  message: string;
}

const REQUIRED_TABLES = ['scopes', 'scope_parties', 'scope_events', 'scope_artifacts'];
const REQUIRED_BINDINGS = ['CHITTYOS_CORE_DB', 'SERVICE_SCOPE_DB'];

async function validateWrangler(wranglerPath: string): Promise<Violation[]> {
  const violations: Violation[] = [];
  const absPath = resolve(wranglerPath);

  if (!existsSync(absPath)) {
    violations.push({ severity: 'critical', check: 'wrangler-exists', message: `Wrangler config not found: ${absPath}` });
    return violations;
  }

  const content = readFileSync(absPath, 'utf-8');

  if (absPath.endsWith('.jsonc') || absPath.endsWith('.json')) {
    // Strip JSONC: block comments, then inline comments (preserving // inside strings)
    const stripped = content
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/("(?:[^"\\]|\\.)*")|\/\/.*/g, (_, str) => str ?? '')
      .replace(/,(\s*[}\]])/g, '$1');
    try {
      const config = JSON.parse(stripped);
      const hyperdrives: Array<{ binding: string; id: string }> = config.hyperdrive || [];

      for (const binding of REQUIRED_BINDINGS) {
        const found = hyperdrives.find(h => h.binding === binding);
        if (!found) {
          violations.push({
            severity: binding === 'CHITTYOS_CORE_DB' ? 'critical' : 'error',
            check: `binding-${binding}`,
            message: `Missing Hyperdrive binding: ${binding}. Add to hyperdrive[] in ${wranglerPath}`,
          });
        } else if (!found.id || found.id.length < 10) {
          violations.push({
            severity: 'critical',
            check: `binding-${binding}-id`,
            message: `Hyperdrive binding ${binding} has empty/invalid ID`,
          });
        }
      }
    } catch (e) {
      violations.push({ severity: 'critical', check: 'wrangler-parse', message: `Failed to parse JSONC: ${e}` });
    }
  } else {
    // TOML — check for binding strings
    for (const binding of REQUIRED_BINDINGS) {
      if (!content.includes(`"${binding}"`) && !content.includes(`'${binding}'`)) {
        violations.push({
          severity: binding === 'CHITTYOS_CORE_DB' ? 'critical' : 'error',
          check: `binding-${binding}`,
          message: `Missing Hyperdrive binding: ${binding} in ${wranglerPath}`,
        });
      }
    }
  }

  return violations;
}

async function main() {
  const args = process.argv.slice(2);
  const wranglerIdx = args.indexOf('--wrangler');
  const wranglerPath = wranglerIdx >= 0 ? args[wranglerIdx + 1] : null;

  if (!wranglerPath) {
    console.error('Usage: validate-fractal-scopes.ts --wrangler <path-to-wrangler.jsonc>');
    process.exit(1);
  }

  console.log(`\n--- Fractal Scope Validation ---\n`);

  const violations = await validateWrangler(wranglerPath);

  if (violations.length === 0) {
    console.log('All checks passed.');
    process.exit(0);
  }

  for (const v of violations) {
    const icon = v.severity === 'critical' ? 'FAIL' : v.severity === 'error' ? 'ERR ' : 'WARN';
    console.log(`[${icon}] ${v.check}: ${v.message}`);
  }

  const hasCritical = violations.some(v => v.severity === 'critical');
  process.exit(hasCritical ? 1 : 0);
}

main();
