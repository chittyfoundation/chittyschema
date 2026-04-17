#!/usr/bin/env tsx
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validate } from '../api/lib/meta-validator';

const CANON_DIR = resolve(process.env.HOME || '/home/ubuntu', 'projects/github.com/CHITTYFOUNDATION/chittycanon/governance');

function readJson(name: string): unknown {
  const p = resolve(CANON_DIR, name);
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch (err) {
    console.error(`✗ Failed to read or parse ${p}`);
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

function report(label: string, result: ReturnType<typeof validate>): void {
  if (result.valid) {
    console.log(`✓ ${label} valid`);
    return;
  }
  console.error(`✗ ${label} failed validation (${result.errors.length} errors)`);
  for (const e of result.errors) {
    console.error(`  ${e.path}: ${e.message} [${e.keyword}]`);
  }
  process.exit(1);
}

function main(): void {
  const owners = readJson('owners.json');
  const reqs = readJson('repo_requirements.json');

  report('owners.json (portfolio-owners.schema.json)', validate('portfolio-owners', owners));
  report('repo_requirements.json (repo-requirements.schema.json)', validate('repo-requirements', reqs));
}

main();

