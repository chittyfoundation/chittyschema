/**
 * Unit tests for connectivity/api/lib/generators.ts.
 *
 * Doctrine: post-#28 the three generic-table generators throw on missing
 * column metadata instead of emitting TODO-stub fallbacks. These tests
 * pin that behavior and prove the happy path still produces correct
 * Pydantic / TypeScript / Zod source.
 */

import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  generatePydanticModel,
  generateTypeScript,
  generateZodSchema,
} from '../connectivity/api/lib/generators';

const realColumns = [
  { name: 'id', type: 'uuid', optional: true },
  { name: 'created_at', type: 'datetime', optional: true },
  { name: 'name', type: 'string' },
  { name: 'count', type: 'number', nullable: true },
];

const baseMetadata = {
  database: 'chittyos-core',
  owner: 'chittytest',
  description: 'Real test table fixture',
  columns: realColumns,
};

describe('generatePydanticModel', () => {
  it('emits a real Pydantic class from real columns', () => {
    const code = generatePydanticModel('audit_logs', baseMetadata);
    expect(code).toContain('class AuditLogs(BaseModel)');
    expect(code).toContain('id: UUID | None');
    expect(code).toContain('name: str');
    expect(code).not.toContain('TODO');
  });

  it('throws loud when columns is empty', () => {
    expect(() =>
      generatePydanticModel('whatever', { ...baseMetadata, columns: [] })
    ).toThrow(/no columns metadata for whatever/);
  });

  it('emits the trust_scores special-case unchanged', () => {
    const code = generatePydanticModel('trust_scores', baseMetadata);
    // The 6D trust model has its own canonical shape — verify it stays.
    expect(code).toContain('class TrustScores(BaseModel)');
    expect(code).toContain('source_dimension');
    expect(code).toContain('justice_dimension');
  });
});

describe('generateTypeScript', () => {
  it('emits a real TS interface from real columns', () => {
    const code = generateTypeScript('audit_logs', baseMetadata);
    expect(code).toContain('export interface AuditLogs');
    expect(code).toContain('id?: string');
    expect(code).toContain('name: string');
    expect(code).toContain('count: number | null');
    expect(code).not.toContain('TODO');
  });

  it('throws loud when columns is empty', () => {
    expect(() =>
      generateTypeScript('whatever', { ...baseMetadata, columns: [] })
    ).toThrow(/no columns metadata for whatever/);
  });
});

describe('generateZodSchema', () => {
  it('emits a real Zod object from real columns', () => {
    const code = generateZodSchema('audit_logs', baseMetadata);
    expect(code).toContain('export const AuditLogsSchema = z.object');
    expect(code).toContain('id: z.string().uuid().optional()');
    expect(code).toContain('count: z.number().nullable()');
    expect(code).not.toContain('TODO');
  });

  it('throws loud when columns is empty', () => {
    expect(() =>
      generateZodSchema('whatever', { ...baseMetadata, columns: [] })
    ).toThrow(/no columns metadata for whatever/);
  });

  it('emitted Zod source compiles into a working real Zod schema', async () => {
    // Belt-and-suspenders: prove the generated source isn't just text — it
    // compiles to a Zod schema that actually validates data, exercising the
    // real `z` runtime (no mocks).
    const code = generateZodSchema('audit_logs', baseMetadata);
    // Strip the import statement and the final exports we don't want, then
    // demote the remaining `export const` to plain `const` so `new Function`
    // can compile the snippet (it forbids module-level `export`).
    const stripped = code
      .replace(/^import\s+.+?;\s*/m, '')
      .replace(/^export const AuditLogsInsertSchema[\s\S]*?;\s*$/m, '')
      .replace(/^export const AuditLogsUpdateSchema[\s\S]*?;\s*$/m, '')
      .replace(/^export type .+$/gm, '')
      .replace(/^export const /gm, 'const ');
    // Give the compiled snippet access to the real `z` import.
    const factory = new Function('z', `${stripped}; return AuditLogsSchema;`);
    const schema = factory(z) as z.ZodTypeAny;
    const valid = schema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      created_at: '2026-04-29T00:00:00Z',
      name: 'real-row',
      count: null,
    });
    expect(valid.success).toBe(true);
    const invalid = schema.safeParse({ name: 123 });
    expect(invalid.success).toBe(false);
  });
});
