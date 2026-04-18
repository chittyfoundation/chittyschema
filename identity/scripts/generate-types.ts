#!/usr/bin/env tsx
/**
 * TypeScript Type Generation Script
 *
 * Reads schema.json and generates TypeScript types that exactly match
 * the database schema. Types are never manually written - always generated.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface SchemaSnapshot {
  tables: Array<{
    name: string;
    owner: string;
    columns: Array<{
      name: string;
      type: string;
      nullable: boolean;
      default: string | null;
      isPrimaryKey: boolean;
      isForeignKey: boolean;
      comment?: string;
    }>;
  }>;
}

function postgresTypeToTypeScript(pgType: string): string {
  const typeMap: Record<string, string> = {
    'uuid': 'string',
    'text': 'string',
    'character varying': 'string',
    'varchar': 'string',
    'integer': 'number',
    'bigint': 'number',
    'smallint': 'number',
    'decimal': 'number',
    'numeric': 'number',
    'real': 'number',
    'double precision': 'number',
    'boolean': 'boolean',
    'jsonb': 'Record<string, any>',
    'json': 'Record<string, any>',
    'timestamp with time zone': 'Date | string',
    'timestamp without time zone': 'Date | string',
    'date': 'Date | string',
    'time': 'string',
    'inet': 'string',
    'cidr': 'string',
    'macaddr': 'string',
    'bytea': 'Buffer | string',
    'ARRAY': 'string[]',
    'USER-DEFINED': 'string', // enums
  };

  // Handle arrays
  if (pgType.startsWith('ARRAY')) {
    return 'string[]';
  }

  // Handle USER-DEFINED (enums, geography, etc)
  if (pgType === 'USER-DEFINED') {
    return 'string';
  }

  return typeMap[pgType] || 'any';
}

function toPascalCase(str: string): string {
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

function generateTableType(table: any): string {
  const typeName = toPascalCase(table.name);
  const lines: string[] = [];

  lines.push(`/**`);
  lines.push(` * ${table.name} table`);
  lines.push(` * Owner: ${table.owner}`);
  lines.push(` */`);
  lines.push(`export interface ${typeName} {`);

  for (const col of table.columns) {
    if (col.comment) {
      lines.push(`  /** ${col.comment} */`);
    }
    const tsType = postgresTypeToTypeScript(col.type);
    const optional = col.nullable || col.default ? '?' : '';
    lines.push(`  ${col.name}${optional}: ${tsType};`);
  }

  lines.push(`}\n`);

  // Also generate insert type (without auto-generated fields)
  lines.push(`/**`);
  lines.push(` * Insert type for ${table.name} (excludes auto-generated fields)`);
  lines.push(` */`);
  lines.push(`export type ${typeName}Insert = Omit<${typeName}, 'id' | 'created_at' | 'updated_at'> & {`);
  lines.push(`  id?: string;`);
  lines.push(`  created_at?: Date | string;`);
  lines.push(`  updated_at?: Date | string;`);
  lines.push(`};\n`);

  // Generate update type (all fields optional except id)
  lines.push(`/**`);
  lines.push(` * Update type for ${table.name} (all fields optional)`);
  lines.push(` */`);
  lines.push(`export type ${typeName}Update = Partial<${typeName}> & {`);
  lines.push(`  id: string;`);
  lines.push(`};\n`);

  return lines.join('\n');
}

function generateIndexFile(tableNames: string[]): string {
  const lines: string[] = [];
  lines.push(`/**`);
  lines.push(` * ChittyOS Schema Types`);
  lines.push(` * `);
  lines.push(` * Generated automatically from database schema introspection.`);
  lines.push(` * DO NOT EDIT MANUALLY - Run 'npm run generate:types' to regenerate.`);
  lines.push(` * `);
  lines.push(` * @generated ${new Date().toISOString()}`);
  lines.push(` */`);
  lines.push('');

  for (const tableName of tableNames) {
    const typeName = toPascalCase(tableName);
    lines.push(`export type { ${typeName}, ${typeName}Insert, ${typeName}Update } from './${tableName}';`);
  }

  lines.push('');
  return lines.join('\n');
}

async function main() {
  console.log('🔨 Generating TypeScript types from schema...\n');

  const schemaPath = join(process.cwd(), 'identity', 'src', 'generated', 'schema.json');
  const schema: SchemaSnapshot = JSON.parse(readFileSync(schemaPath, 'utf-8'));

  const typesDir = join(process.cwd(), 'identity', 'src', 'types');

  // Generate type file for each table
  for (const table of schema.tables) {
    const typeDefinition = generateTableType(table);
    const outputPath = join(typesDir, `${table.name}.ts`);
    writeFileSync(outputPath, typeDefinition);
    console.log(`  ✅ Generated ${table.name}.ts`);
  }

  // Generate index file
  const indexContent = generateIndexFile(schema.tables.map(t => t.name));
  const indexPath = join(typesDir, 'index.ts');
  writeFileSync(indexPath, indexContent);
  console.log(`  ✅ Generated index.ts`);

  console.log(`\n✨ Generated ${schema.tables.length} TypeScript type files`);
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
