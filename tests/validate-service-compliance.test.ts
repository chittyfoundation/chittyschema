// Real filesystem + real `find`; no module mocking.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { SchemaComplianceValidator } from '../identity/scripts/validate-service-compliance';

describe('validate-service-compliance: rogue SQL check', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'chittyschema-rogue-sql-'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  async function rogueFinding() {
    const report = await new SchemaComplianceValidator(dir).validate();
    return report.violations.find(v => v.rule === 'NO_ROGUE_SCHEMAS');
  }

  it('flags a .sql file under a migrations/ directory', async () => {
    mkdirSync(join(dir, 'svc', 'migrations'), { recursive: true });
    writeFileSync(join(dir, 'svc', 'migrations', '001.sql'), 'SELECT 1;\n');
    const finding = await rogueFinding();
    expect(finding).toBeDefined();
    expect(finding!.type).toBe('CRITICAL');
    expect(finding!.file).toContain('migrations/001.sql');
  });

  it('does not flag a service with no SQL files', async () => {
    mkdirSync(join(dir, 'svc', 'src'), { recursive: true });
    writeFileSync(join(dir, 'svc', 'src', 'index.ts'), 'export {};\n');
    expect(await rogueFinding()).toBeUndefined();
  });

  it('ignores migrations/ SQL inside node_modules', async () => {
    mkdirSync(join(dir, 'node_modules', 'dep', 'migrations'), { recursive: true });
    writeFileSync(join(dir, 'node_modules', 'dep', 'migrations', '001.sql'), 'SELECT 1;\n');
    expect(await rogueFinding()).toBeUndefined();
  });
});
