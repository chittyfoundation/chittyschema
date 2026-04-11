/**
 * Meta-Schema Validator
 *
 * Runtime Ajv-backed validator that loads the meta-schemas bundled into the
 * Worker (via JSON imports) and exposes typed `validate*` functions for
 * the route handlers and the queue consumer.
 *
 * Why bundled and not fetched: the meta-schemas describe the contracts
 * chittyschema itself depends on. Fetching them at runtime would create a
 * bootstrapping cycle (we'd need a schema to validate the schema endpoint
 * that serves the schema). Bundling makes them available at cold start.
 *
 * The same files are ALSO uploaded to R2 bucket `CANONICAL_SCHEMAS` and
 * served at `GET /meta/:name` so external consumers can $ref them — but
 * that's a *publishing* concern, not a *validation* concern.
 *
 * @canon chittycanon://core/services/chitty-schema#meta-validator
 */

import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020';
import addFormats from 'ajv-formats';

// @ts-expect-error JSON imports
import manifestSchema from '../../schemas/meta/manifest.schema.json';
// @ts-expect-error JSON imports
import tableOwnerSchema from '../../schemas/meta/table-owner.schema.json';
// @ts-expect-error JSON imports
import driftStateSchema from '../../schemas/meta/drift-state.schema.json';
// @ts-expect-error JSON imports
import serviceAnnouncementSchema from '../../schemas/meta/service-announcement.schema.json';
// @ts-expect-error JSON imports
import driftEventSchema from '../../schemas/meta/drift-event.schema.json';
// @ts-expect-error JSON imports
import ontologyResponseSchema from '../../schemas/meta/ontology-response.schema.json';
// @ts-expect-error JSON imports
import canonicalUriSchema from '../../schemas/meta/canonical-uri.schema.json';

export type MetaSchemaName =
  | 'manifest'
  | 'table-owner'
  | 'drift-state'
  | 'service-announcement'
  | 'drift-event'
  | 'ontology-response'
  | 'canonical-uri';

export const META_SCHEMAS: Record<MetaSchemaName, unknown> = {
  manifest: manifestSchema,
  'table-owner': tableOwnerSchema,
  'drift-state': driftStateSchema,
  'service-announcement': serviceAnnouncementSchema,
  'drift-event': driftEventSchema,
  'ontology-response': ontologyResponseSchema,
  'canonical-uri': canonicalUriSchema,
};

const ajv = new Ajv2020({
  allErrors: true,
  strict: false,
  // The meta-schemas are loaded as objects, not by URI, so we don't need a
  // resolver. $refs across files are intentionally avoided in PR J — every
  // meta-schema is self-contained.
});
addFormats(ajv);

// Pre-compile every validator at module init so the worker pays the cost
// once at cold-start, not on every request.
const validators: Record<MetaSchemaName, ValidateFunction> = {
  manifest: ajv.compile(manifestSchema as object),
  'table-owner': ajv.compile(tableOwnerSchema as object),
  'drift-state': ajv.compile(driftStateSchema as object),
  'service-announcement': ajv.compile(serviceAnnouncementSchema as object),
  'drift-event': ajv.compile(driftEventSchema as object),
  'ontology-response': ajv.compile(ontologyResponseSchema as object),
  'canonical-uri': ajv.compile(canonicalUriSchema as object),
};

export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    path: string;
    message: string;
    keyword: string;
    params: Record<string, unknown>;
  }>;
}

/**
 * Validate any value against one of the bundled meta-schemas.
 */
export function validate(
  schemaName: MetaSchemaName,
  value: unknown
): ValidationResult {
  const validator = validators[schemaName];
  if (!validator) {
    return {
      valid: false,
      errors: [
        {
          path: '',
          message: `Unknown meta-schema: ${schemaName}`,
          keyword: 'unknown',
          params: {},
        },
      ],
    };
  }

  const valid = validator(value);
  if (valid) {
    return { valid: true, errors: [] };
  }

  return {
    valid: false,
    errors: (validator.errors || []).map((e) => ({
      path: e.instancePath || '/',
      message: e.message || 'Validation error',
      keyword: e.keyword,
      params: e.params,
    })),
  };
}

/**
 * Validate the manifest plus do extra cross-field checks that JSON Schema
 * can't express:
 *   - Every tableOwners[].database must reference a databases[].name
 *   - Every tableOwners[].table must appear in databases[].tables for
 *     that database (or be marked as TBD via authoringFile prefix)
 */
export function validateManifest(manifest: unknown): ValidationResult {
  const baseResult = validate('manifest', manifest);
  if (!baseResult.valid) return baseResult;

  const m = manifest as {
    databases: Array<{ name: string; tables: Record<string, string> }>;
    tableOwners: Array<{
      database: string;
      table: string;
      authoringFile: string;
    }>;
  };

  const dbNames = new Set(m.databases.map((d) => d.name));
  const dbTableMap = new Map<string, Set<string>>();
  for (const db of m.databases) {
    dbTableMap.set(db.name, new Set(Object.keys(db.tables)));
  }

  const errors: ValidationResult['errors'] = [];

  m.tableOwners.forEach((entry, idx) => {
    if (!dbNames.has(entry.database)) {
      errors.push({
        path: `/tableOwners/${idx}/database`,
        message: `database "${entry.database}" is not declared in databases[]`,
        keyword: 'cross-reference',
        params: { database: entry.database },
      });
      return;
    }
    const tables = dbTableMap.get(entry.database)!;
    if (!tables.has(entry.table) && !entry.authoringFile.startsWith('(TBD')) {
      errors.push({
        path: `/tableOwners/${idx}/table`,
        message: `table "${entry.table}" is not declared in databases["${entry.database}"].tables`,
        keyword: 'cross-reference',
        params: { database: entry.database, table: entry.table },
      });
    }
  });

  return { valid: errors.length === 0, errors };
}
