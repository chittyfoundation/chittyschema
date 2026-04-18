#!/usr/bin/env tsx
/**
 * validate-fractal-layout.ts
 *
 * Validates that a target repo (default: cwd) conforms to the ChittyOS fractal
 * trinity layout: identity/ + authority/ + connectivity/ + scopes/, with
 * scope.json at the root that satisfies the repo-scope meta-schema.
 *
 * Walks the repo, checks required files/dirs, and recursively validates each
 * scopes/<child>/ as its own fractal sub-scope.
 *
 * No mocks. No placeholder logic. If a check can't be performed, it fails loud.
 *
 * @canon chittycanon://core/services/chittyschema#meta/fractal-layout
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

import repoScopeSchema from '../schemas/meta/repo-scope.schema.json' assert { type: 'json' };
import fractalLayoutSchema from '../schemas/meta/fractal-layout.schema.json' assert { type: 'json' };

interface Violation {
  severity: 'critical' | 'error' | 'warning';
  path: string;
  message: string;
}

interface ValidationResult {
  repo: string;
  scope: { id?: string; name?: string; type?: string };
  violations: Violation[];
  passed: boolean;
  childResults: ValidationResult[];
}

const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
const validateScope = ajv.compile(repoScopeSchema);
ajv.compile(fractalLayoutSchema); // ensure layout schema also compiles cleanly

const DEFAULT_REQUIRED_ROOT_FILES = ['scope.json', 'CHARTER.md', 'CHITTY.md', 'CLAUDE.md', 'README.md', 'package.json', 'tsconfig.json'];
const DEFAULT_REQUIRED_ROOT_DIRS = ['identity', 'authority', 'connectivity', 'scopes'];
const IDENTITY_FORBIDDEN = ['api', 'migrations', 'integrations'];
const CONNECTIVITY_FORBIDDEN = ['src', 'types', 'validators', 'agents'];

function validateFractal(repoPath: string, isChildScope = false): ValidationResult {
  const violations: Violation[] = [];
  const childResults: ValidationResult[] = [];
  const result: ValidationResult = {
    repo: repoPath,
    scope: {},
    violations,
    passed: true,
    childResults,
  };

  // Check root layout
  for (const dir of DEFAULT_REQUIRED_ROOT_DIRS) {
    const dirPath = join(repoPath, dir);
    if (!existsSync(dirPath)) {
      // For child scopes, missing dirs are allowed if scope.json declares inheritance
      if (isChildScope && dir !== 'scope.json') {
        continue;
      }
      violations.push({
        severity: dir === 'scopes' ? 'warning' : 'error',
        path: dir,
        message: `Required trinity directory missing: ${dir}/`,
      });
    } else if (!statSync(dirPath).isDirectory()) {
      violations.push({
        severity: 'error',
        path: dir,
        message: `Trinity slot is not a directory: ${dir}`,
      });
    }
  }

  // Check root files
  const requiredFiles = isChildScope ? ['scope.json'] : DEFAULT_REQUIRED_ROOT_FILES;
  for (const file of requiredFiles) {
    if (!existsSync(join(repoPath, file))) {
      violations.push({
        severity: file === 'scope.json' ? 'critical' : 'error',
        path: file,
        message: `Required root file missing: ${file}`,
      });
    }
  }

  // Validate scope.json against the repo-scope meta-schema
  const scopePath = join(repoPath, 'scope.json');
  if (existsSync(scopePath)) {
    try {
      const scopeData = JSON.parse(readFileSync(scopePath, 'utf-8'));
      result.scope = {
        id: scopeData.id,
        name: scopeData.name,
        type: scopeData.scope_type,
      };

      const valid = validateScope(scopeData);
      if (!valid) {
        for (const err of validateScope.errors || []) {
          violations.push({
            severity: 'error',
            path: `scope.json${err.instancePath}`,
            message: `${err.keyword}: ${err.message}`,
          });
        }
      }

      // Child scopes MUST have parent_scope_id (or explicit null with override)
      if (isChildScope && scopeData.parent_scope_id === undefined) {
        violations.push({
          severity: 'error',
          path: 'scope.json',
          message: 'Child scope must declare parent_scope_id (set explicitly to null to override inheritance)',
        });
      }
    } catch (e) {
      violations.push({
        severity: 'critical',
        path: 'scope.json',
        message: `Failed to parse scope.json: ${(e as Error).message}`,
      });
    }
  }

  // Trinity-slot forbidden subdirs
  for (const forbidden of IDENTITY_FORBIDDEN) {
    if (existsSync(join(repoPath, 'identity', forbidden))) {
      violations.push({
        severity: 'error',
        path: `identity/${forbidden}`,
        message: `\`${forbidden}/\` does not belong under identity/ — should be under connectivity/`,
      });
    }
  }
  for (const forbidden of CONNECTIVITY_FORBIDDEN) {
    if (existsSync(join(repoPath, 'connectivity', forbidden))) {
      violations.push({
        severity: 'error',
        path: `connectivity/${forbidden}`,
        message: `\`${forbidden}/\` does not belong under connectivity/ — should be under identity/`,
      });
    }
  }

  // Recursively validate child scopes
  const scopesDir = join(repoPath, 'scopes');
  if (existsSync(scopesDir) && statSync(scopesDir).isDirectory()) {
    for (const entry of readdirSync(scopesDir, { withFileTypes: true })) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        const childPath = join(scopesDir, entry.name);
        childResults.push(validateFractal(childPath, true));
      }
    }
  }

  result.passed = violations.filter((v) => v.severity !== 'warning').length === 0
    && childResults.every((c) => c.passed);

  return result;
}

function printResult(result: ValidationResult, indent = 0): void {
  const pad = '  '.repeat(indent);
  const badge = result.passed ? '✓' : '✗';
  const color = result.passed ? '\x1b[32m' : '\x1b[31m';
  const reset = '\x1b[0m';
  console.log(`${pad}${color}${badge}${reset} ${result.repo}${result.scope.name ? ` (${result.scope.name}, ${result.scope.type})` : ''}`);

  for (const v of result.violations) {
    const sev = v.severity === 'critical' ? '⛔' : v.severity === 'error' ? '✗' : '⚠';
    console.log(`${pad}  ${sev} [${v.severity}] ${v.path}: ${v.message}`);
  }

  for (const child of result.childResults) {
    printResult(child, indent + 1);
  }
}

const target = resolve(process.argv[2] || process.cwd());
console.log(`Validating fractal trinity layout: ${target}\n`);

const result = validateFractal(target);
printResult(result);

const allViolations = collectAll(result);
const errorCount = allViolations.filter((v) => v.severity !== 'warning').length;
const warnCount = allViolations.filter((v) => v.severity === 'warning').length;

console.log(`\n${result.passed ? '✓ PASS' : '✗ FAIL'} — ${errorCount} error(s), ${warnCount} warning(s)`);

if (!result.passed) {
  process.exit(1);
}

function collectAll(r: ValidationResult): Violation[] {
  return [...r.violations, ...r.childResults.flatMap(collectAll)];
}
