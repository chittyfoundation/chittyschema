#!/usr/bin/env tsx
// Multi-Database TypeScript Type Generation Script
// Reads all schema.json files from src/generated/*/schema.json
// and generates TypeScript types for each database.

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { setupOutputStyle, isCompact, printJSONSummary } from './lib/output-style.ts';

interface SchemaSnapshot {
  database: string;
  databaseName: string;
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
  enums: Array<{
    name: string;
    values: string[];
  }>;
}

function postgresTypeToTypeScript(pgType: string, enumTypes: Set<string>): string {
  // Check if it's an enum type first
  if (enumTypes.has(pgType)) {
    return toPascalCase(pgType);
  }

  const typeMap: Record<string, string> = {
    'uuid': 'string',
    'text': 'string',
    'character varying': 'string',
    'varchar': 'string',
    'character': 'string',
    'integer': 'number',
    'bigint': 'number',
    'smallint': 'number',
    'serial': 'number',
    'bigserial': 'number',
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
    'geography': 'any', // PostGIS type
    'geometry': 'any', // PostGIS type
  };

  // Handle arrays
  if (pgType.startsWith('ARRAY') || pgType.endsWith('[]')) {
    return 'string[]';
  }

  // Handle text arrays specifically
  if (pgType === 'text[]') {
    return 'string[]';
  }

  return typeMap[pgType] || 'string'; // Default to string for USER-DEFINED
}

function toPascalCase(str: string): string {
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

function generateEnumType(enumDef: { name: string; values: string[] }): string {
  const typeName = toPascalCase(enumDef.name);
  const lines: string[] = [];

  lines.push(`/**`);
  lines.push(` * Enum: ${enumDef.name}`);
  lines.push(` */`);
  lines.push(`export enum ${typeName} {`);

  const usedKeys = new Set<string>();

  for (const value of enumDef.values) {
    // Strip leading/trailing quotes from value (handles database design issues)
    const cleanValue = value.replace(/^["']|["']$/g, '');

    // Convert enum value to valid TypeScript identifier
    let key = cleanValue.toUpperCase().replace(/[^A-Z0-9_]/g, '_');

    // Remove leading/trailing underscores
    key = key.replace(/^_+|_+$/g, '');

    // Ensure key is not empty
    if (!key) {
      key = 'UNKNOWN';
    }

    // Handle duplicates by appending number
    let finalKey = key;
    let counter = 2;
    while (usedKeys.has(finalKey)) {
      finalKey = `${key}_${counter}`;
      counter++;
    }
    usedKeys.add(finalKey);

    lines.push(`  ${finalKey} = '${cleanValue}',`);
  }

  lines.push(`}\n`);

  return lines.join('\n');
}

function generateTableType(table: any, enumTypes: Set<string>): string {
  const typeName = toPascalCase(table.name);
  const lines: string[] = [];

  lines.push(`/**`);
  lines.push(` * ${table.name} table`);
  lines.push(` * Owner: ${table.owner}`);
  if (table.comment) {
    lines.push(` * ${table.comment}`);
  }
  lines.push(` */`);
  lines.push(`export interface ${typeName} {`);

  for (const col of table.columns) {
    if (col.comment) {
      lines.push(`  /** ${col.comment} */`);
    }
    const tsType = postgresTypeToTypeScript(col.type, enumTypes);
    const optional = col.nullable || col.default !== null ? '?' : '';
    lines.push(`  ${col.name}${optional}: ${tsType};`);
  }

  lines.push(`}\n`);

  // Generate Insert type (without auto-generated fields)
  lines.push(`/**`);
  lines.push(` * Insert type for ${table.name} (excludes auto-generated fields)`);
  lines.push(` */`);
  lines.push(`export type ${typeName}Insert = Omit<${typeName}, `);

  const autoFields = table.columns
    .filter((col: any) => {
      if (!col.default) return false;
      const defaultLower = col.default.toLowerCase();
      return (
        defaultLower.includes('uuid_generate') ||
        defaultLower.includes('current_timestamp') ||
        defaultLower.includes('now()') ||
        defaultLower.includes('nextval') ||
        defaultLower.includes('gen_random_uuid') ||
        col.type === 'serial' ||
        col.type === 'bigserial'
      );
    })
    .map((col: any) => `'${col.name}'`);

  lines.push(`  ${autoFields.join(' | ') || 'never'}`);
  lines.push(`>;\n`);

  // Generate Update type (all fields optional except id, if id exists)
  const hasIdColumn = table.columns.some((col: any) => col.name === 'id');
  if (hasIdColumn) {
    lines.push(`/**`);
    lines.push(` * Update type for ${table.name} (all fields optional except id)`);
    lines.push(` */`);
    lines.push(`export type ${typeName}Update = Partial<${typeName}> & Pick<${typeName}, 'id'>;\n`);
  } else {
    lines.push(`/**`);
    lines.push(` * Update type for ${table.name} (all fields optional)`);
    lines.push(` */`);
    lines.push(`export type ${typeName}Update = Partial<${typeName}>;\n`);
  }

  return lines.join('\n');
}

async function main() {
  const restoreLogs = setupOutputStyle();
  console.log('🔨 Generating TypeScript types from database schemas...\n');

  const generatedDir = join(process.cwd(), 'src', 'generated');
  const typesDir = join(process.cwd(), 'src', 'types');

  // Ensure types directory exists
  mkdirSync(typesDir, { recursive: true });

  // Find all schema.json files
  const databases = readdirSync(generatedDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  console.log(`Found ${databases.length} databases: ${databases.join(', ')}\n`);

  const allExports: string[] = [];

  for (const dbName of databases) {
    const schemaPath = join(generatedDir, dbName, 'schema.json');
    const schema: SchemaSnapshot = JSON.parse(readFileSync(schemaPath, 'utf-8'));

    console.log(`📊 ${dbName}:`);
    console.log(`   Tables: ${schema.tables.length}`);
    console.log(`   ENUMs: ${schema.enums?.length || 0}`);

    // Create database-specific types directory
    const dbTypesDir = join(typesDir, dbName);
    mkdirSync(dbTypesDir, { recursive: true });

    // Collect enum types
    const enumTypes = new Set(schema.enums?.map(e => e.name) || []);

    // Generate enum types
    if (schema.enums && schema.enums.length > 0) {
      const enumsContent = [
        `// Auto-generated enum types for ${dbName}`,
        `// DO NOT EDIT - Generated by chittyschema`,
        '',
        ...schema.enums.map(enumDef => generateEnumType(enumDef))
      ].join('\n');

      const enumsPath = join(dbTypesDir, 'enums.ts');
      writeFileSync(enumsPath, enumsContent);
      console.log(`   ✅ Generated enums.ts`);
    }

    // Generate types for each table
    const tableIndexExports: string[] = [];

    for (const table of schema.tables) {
      const typeName = toPascalCase(table.name);
      const content = [
        `// Auto-generated types for ${table.name} table`,
        `// DO NOT EDIT - Generated by chittyschema`,
        '',
        schema.enums && schema.enums.length > 0 ? `import { ${Array.from(enumTypes).map(toPascalCase).join(', ')} } from './enums.js';\n` : '',
        generateTableType(table, enumTypes)
      ].join('\n');

      const filePath = join(dbTypesDir, `${table.name}.ts`);
      writeFileSync(filePath, content);

      tableIndexExports.push(`export * from './${table.name}.js';`);
    }

    // Generate database index file
    const dbIndexContent = [
      `// Auto-generated index for ${dbName} types`,
      `// DO NOT EDIT - Generated by chittyschema`,
      '',
      schema.enums && schema.enums.length > 0 ? `export * from './enums.js';` : '',
      ...tableIndexExports,
      ''
    ].join('\n');

    writeFileSync(join(dbTypesDir, 'index.ts'), dbIndexContent);
    console.log(`   ✅ Generated ${schema.tables.length} table types`);
    console.log(`   💾 Saved to: src/types/${dbName}/\n`);

    // Add to main exports
    allExports.push(`export * as ${dbName.replace(/-/g, '_')} from './${dbName}/index.js';`);
  }

  // Generate main index file
  const mainIndexContent = [
    `/**`,
    ` * ChittySchema - Type Definitions for ChittyOS Ecosystem`,
    ` *`,
    ` * Usage:`,
    ` * import { chittyledger, chittyos_core } from '@chittyos/schema';`,
    ` *`,
    ` * const evidence: chittyledger.Evidence = { ... };`,
    ` * const identity: chittyos_core.Identities = { ... };`,
    ` */`,
    '',
    ...allExports,
    ''
  ].join('\n');

  writeFileSync(join(typesDir, 'index.ts'), mainIndexContent);

  const totalTables = databases.reduce((sum, db) => {
    const schema = JSON.parse(readFileSync(join(generatedDir, db, 'schema.json'), 'utf-8'));
    return sum + schema.tables.length;
  }, 0);

  if (isCompact()) {
    restoreLogs();
    printJSONSummary({ ok: true, databases: databases.length, tables: totalTables });
  } else {
    console.log('✅ Type generation complete!');
    console.log(`   Total databases: ${databases.length}`);
    console.log(`   Total tables: ${totalTables}`);
    console.log('   📦 Types available at: src/types/');
  }
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
