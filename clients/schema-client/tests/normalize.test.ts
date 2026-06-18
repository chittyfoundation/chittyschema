/**
 * Unit tests for the canonical JSON Schema normalizer (de-nester).
 * Real "Russian doll" inputs — no mocks, no fixtures-of-convenience.
 * @canon chittycanon://gov/governance#no-mocks-no-fakes
 */

import { describe, expect, it } from 'vitest';
import {
  normalizeToolSchema,
  normalizeSchema,
  envelopeDepth,
} from '../src/normalize.js';

describe('normalizeToolSchema — envelope collapse', () => {
  it('collapses a single input-wrapper down to its payload', () => {
    const doll = {
      type: 'object',
      properties: {
        input: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'search text' },
          },
          required: ['query'],
        },
      },
    };
    const flat = normalizeToolSchema(doll) as Record<string, any>;
    expect(flat.properties).toHaveProperty('query');
    expect(flat.properties).not.toHaveProperty('input');
    expect(flat.required).toEqual(['query']);
    expect(flat.properties.query.description).toBe('search text');
  });

  it('collapses chained wrappers (input -> params -> arguments) in one pass', () => {
    const doll = {
      type: 'object',
      properties: {
        input: {
          type: 'object',
          properties: {
            params: {
              type: 'object',
              properties: {
                arguments: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    limit: { type: 'integer', default: 10 },
                  },
                  required: ['id'],
                },
              },
            },
          },
        },
      },
    };
    const flat = normalizeToolSchema(doll) as Record<string, any>;
    expect(Object.keys(flat.properties).sort()).toEqual(['id', 'limit']);
    expect(flat.required).toEqual(['id']);
    expect(flat.properties.limit.default).toBe(10);
  });

  it('preserves enum, format, and description on collapsed payload props', () => {
    const doll = {
      type: 'object',
      properties: {
        payload: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['draft', 'verified', 'locked'] },
            when: { type: 'string', format: 'date-time', description: 'ISO ts' },
          },
          required: ['status'],
        },
      },
    };
    const flat = normalizeToolSchema(doll) as Record<string, any>;
    expect(flat.properties.status.enum).toEqual(['draft', 'verified', 'locked']);
    expect(flat.properties.when.format).toBe('date-time');
    expect(flat.properties.when.description).toBe('ISO ts');
  });
});

describe('normalizeToolSchema — guards (no lossy collapse)', () => {
  it('does NOT collapse an opaque payload wrapper with no inner properties', () => {
    // The real chittyos_alchemize pattern: target_context + opaque payload.
    const real = {
      type: 'object',
      properties: {
        target_context: { type: 'string', description: 'context fence' },
        payload: { type: 'object', description: 'op arguments' },
      },
      required: ['target_context', 'payload'],
    };
    const out = normalizeToolSchema(real) as Record<string, any>;
    // Two sibling props => not a single-prop wrapper => untouched.
    expect(Object.keys(out.properties).sort()).toEqual(['payload', 'target_context']);
  });

  it('does NOT collapse a single envelope key when its value is a bare object (no properties)', () => {
    const opaque = {
      type: 'object',
      properties: { payload: { type: 'object' } },
    };
    const out = normalizeToolSchema(opaque) as Record<string, any>;
    // Collapsing would erase the only named handle — must be left intact.
    expect(out.properties).toHaveProperty('payload');
  });

  it('does NOT collapse a single non-envelope property', () => {
    const real = {
      type: 'object',
      properties: {
        document: { type: 'object', properties: { id: { type: 'string' } } },
      },
    };
    const out = normalizeToolSchema(real) as Record<string, any>;
    expect(out.properties).toHaveProperty('document');
  });

  it('recurses into legitimate nested object props without collapsing them', () => {
    const real = {
      type: 'object',
      properties: {
        topic: { type: 'string' },
        source_document: {
          type: 'object',
          properties: {
            document_id: { type: 'string' },
            document_type: { type: 'string', enum: ['design', 'brand_template'] },
          },
          required: ['document_type', 'document_id'],
        },
      },
      required: ['topic'],
    };
    const out = normalizeToolSchema(real) as Record<string, any>;
    expect(out.properties.source_document.properties.document_type.enum).toEqual([
      'design',
      'brand_template',
    ]);
  });

  it('normalizes wrappers nested inside array items', () => {
    const doll = {
      type: 'object',
      properties: {
        rows: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              input: {
                type: 'object',
                properties: { value: { type: 'string' } },
              },
            },
          },
        },
      },
    };
    const out = normalizeToolSchema(doll) as Record<string, any>;
    expect(out.properties.rows.items.properties).toHaveProperty('value');
    expect(out.properties.rows.items.properties).not.toHaveProperty('input');
  });
});

describe('normalizeToolSchema — idempotency & passthrough', () => {
  it('is idempotent: normalize(normalize(x)) deep-equals normalize(x)', () => {
    const doll = {
      type: 'object',
      properties: {
        request: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: { a: { type: 'string' }, b: { type: 'number' } },
              required: ['a'],
            },
          },
        },
      },
    };
    const once = normalizeToolSchema(doll);
    const twice = normalizeToolSchema(once as any);
    expect(twice).toEqual(once);
  });

  it('passes through null/undefined unchanged', () => {
    expect(normalizeToolSchema(undefined)).toBeUndefined();
    expect(normalizeToolSchema(null)).toBeNull();
  });

  it('leaves an already-flat schema unchanged', () => {
    const flat = {
      type: 'object',
      properties: { name: { type: 'string' }, age: { type: 'integer' } },
      required: ['name'],
    };
    expect(normalizeSchema(flat)).toEqual(flat);
  });
});

describe('envelopeDepth', () => {
  it('reports 0 for a flat schema', () => {
    expect(envelopeDepth({ type: 'object', properties: { x: { type: 'string' } } })).toBe(0);
  });

  it('reports 0 for the opaque-payload sibling pattern (not jacked)', () => {
    expect(
      envelopeDepth({
        type: 'object',
        properties: {
          target_context: { type: 'string' },
          payload: { type: 'object' },
        },
      }),
    ).toBe(0);
  });

  it('counts consecutive collapsible envelope wrappers', () => {
    const doll = {
      type: 'object',
      properties: {
        input: {
          type: 'object',
          properties: {
            params: {
              type: 'object',
              properties: { id: { type: 'string' } },
            },
          },
        },
      },
    };
    expect(envelopeDepth(doll)).toBe(2);
  });
});
