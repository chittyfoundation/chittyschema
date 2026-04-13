/**
 * Schema Loader
 * Loads generated validators and metadata for runtime use
 */

// Generated validators (Zod) and types
import * as chittyosCoreValidators from '../../src/validators/chittyos-core/index.js';
import * as chittyledgerValidators from '../../src/validators/chittyledger/index.js';
import * as chittyosCoreTypes from '../../src/types/chittyos-core/index.js';
import * as chittyledgerTypes from '../../src/types/chittyledger/index.js';

/**
 * Load all Zod validation schemas
 * Returns schemas for runtime validation
 */
export function loadSchemas(): Record<string, any> {
  // Flatten exports from both validator namespaces into a single map
  const map: Record<string, any> = {};

  const addAll = (ns: Record<string, any>) => {
    for (const [key, val] of Object.entries(ns)) {
      if (typeof val !== 'undefined') {
        map[key] = val;
        // Provide common aliases for convenience if applicable
        if (key.endsWith('SchemaInsert')) {
          const base = key.replace(/SchemaInsert$/, '');
          map[`${base}InsertSchema`] = val; // alias
        }
        if (key.endsWith('SchemaUpdate')) {
          const base = key.replace(/SchemaUpdate$/, '');
          map[`${base}UpdateSchema`] = val; // alias
        }
      }
    }
  };

  addAll(chittyosCoreValidators as any);
  addAll(chittyledgerValidators as any);

  return map;
}

/**
 * Get metadata for a specific table
 */
export function getTableMetadata(tableName: string): any {
  const dbConfig = require('../../database-config.json');

  // Find which database contains this table
  for (const db of dbConfig.databases) {
    if (db.tables[tableName]) {
      const columns = getTableColumns(tableName, db.name);
      return {
        database: db.name,
        owner: db.tables[tableName],
        columns,
        description: getTableDescription(tableName),
        relationships: [],
        foreignKeys: [],
        referencedBy: []
      };
    }
  }

  return null;
}

/**
 * Get all table names
 */
export function getAllTables(): string[] {
  const dbConfig = require('../../database-config.json');
  const tables: string[] = [];

  dbConfig.databases.forEach((db: any) => {
    tables.push(...Object.keys(db.tables));
  });

  return tables;
}

/**
 * Get columns for a table from generated types
 */
function getTableColumns(tableName: string, database: string): Array<{ name: string; type?: string; optional?: boolean; nullable?: boolean }> {
  const pascal = toPascalCase(tableName);

  // Prefer deriving from validators (Zod) if available
  const validators = database === 'chittyos-core' ? (chittyosCoreValidators as any) : (chittyledgerValidators as any);
  const schema = validators?.[`${pascal}Schema`];

  if (schema) {
    try {
      const def = (schema as any)._def;
      const shape = typeof def?.shape === 'function' ? def.shape() : def?.shape || {};
      return Object.entries(shape).map(([name, z]: [string, any]) => ({
        name,
        type: inferZodType(z),
        optional: isOptional(z),
        nullable: isNullable(z)
      }));
    } catch {
      // Fall through to type-based fallback
    }
  }

  // Fallback: derive from generated TypeScript interfaces (best-effort)
  const typesNs = database === 'chittyos-core' ? (chittyosCoreTypes as any) : (chittyledgerTypes as any);
  const iface = typesNs?.[pascal] as any;
  if (iface && typeof iface === 'object') {
    // Cannot introspect TS interface at runtime; return empty when unavailable
    return [];
  }

  return [];
}

function toPascalCase(name: string): string {
  return name
    .split('_')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');
}

function unwrap(z: any): any {
  // Unwrap Optional/Nullable/Default into the inner type if present
  if (!z || !z._def) return z;
  const t = z._def.typeName;
  if (t === 'ZodOptional' || t === 'ZodNullable' || t === 'ZodDefault' || t === 'ZodEffects') {
    return unwrap(z._def.innerType || z._def.schema || z._def.effect || z._def.type);
  }
  return z;
}

function isOptional(z: any): boolean {
  if (!z || !z._def) return false;
  return z._def.typeName === 'ZodOptional' || (!!z._def.innerType && isOptional(z._def.innerType));
}

function isNullable(z: any): boolean {
  if (!z || !z._def) return false;
  return z._def.typeName === 'ZodNullable' || (!!z._def.innerType && isNullable(z._def.innerType));
}

function inferZodType(z: any): string | undefined {
  const base = unwrap(z);
  const tn = base?._def?.typeName;
  switch (tn) {
    case 'ZodString':
      // Heuristic for uuid/datetime
      const checks = base?._def?.checks || [];
      if (checks.some((c: any) => c?.kind === 'uuid')) return 'uuid';
      if (checks.some((c: any) => c?.kind === 'datetime')) return 'datetime';
      return 'string';
    case 'ZodNumber':
      return 'number';
    case 'ZodBoolean':
      return 'boolean';
    case 'ZodDate':
      return 'date';
    case 'ZodArray':
      return 'array';
    case 'ZodObject':
      return 'object';
    case 'ZodRecord':
      return 'record';
    case 'ZodBigInt':
      return 'bigint';
    case 'ZodAny':
      return 'any';
    case 'ZodUnknown':
      return 'unknown';
    case 'ZodNull':
      return 'null';
    case 'ZodUnion':
      return 'union';
    default:
      return undefined;
  }
}

/**
 * Get description for a table
 */
function getTableDescription(tableName: string): string {
  const descriptions: Record<string, string> = {
    'trust_scores': 'ChittyTrust: TY/VY/RY reckoning cache for downstream trust reads',
    'trust_events': 'ChittyScore: Event history that affects trust scores',
    'trust_networks': 'ChittyScore: Graph of trust relationships between identities',
    'identities': 'ChittyID: Core identity records with DID and biometric data',
    'credentials': 'ChittyID: Digital credentials and verifications',
    'api_tokens': 'ChittyAuth: API authentication tokens for service access',
    'verifications': 'ChittyVerify: Verification records and chain of custody'
  };

  return descriptions[tableName] || `Database table: ${tableName}`;
}
