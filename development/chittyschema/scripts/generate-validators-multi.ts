#!/usr/bin/env tsx
// Multi-Database Zod Validator Generation Script
// Reads all schema.json files from src/generated/*/schema.json
// and generates Zod schemas for runtime validation for each database.

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
      comment?: string;
    }>;
  }>;
  enums: Array<{
    name: string;
    values: string[];
  }>;
}

function postgresTypeToZod(pgType: string, nullable: boolean, enumTypes: Set<string>): string {
  let baseType: string;

  // Check if it's an enum type first
  if (enumTypes.has(pgType)) {
    const enumName = toPascalCase(pgType);
    baseType = `z.nativeEnum(${enumName})`;
  } else if (pgType.startsWith('ARRAY') || pgType.endsWith('[]')) {
    baseType = 'z.array(z.string())';
  } else {
    const typeMap: Record<string, string> = {
      'uuid': 'z.string().uuid()',
      'text': 'z.string()',
      'character varying': 'z.string()',
      'varchar': 'z.string()',
      'character': 'z.string()',
      'integer': 'z.number().int()',
      'bigint': 'z.number().int()',
      'smallint': 'z.number().int()',
      'serial': 'z.number().int()',
      'bigserial': 'z.number().int()',
      'decimal': 'z.number()',
      'numeric': 'z.number()',
      'real': 'z.number()',
      'double precision': 'z.number()',
      'boolean': 'z.boolean()',
      'jsonb': 'z.record(z.any())',
      'json': 'z.record(z.any())',
      'timestamp with time zone': 'z.union([z.date(), z.string().datetime()])',
      'timestamp without time zone': 'z.union([z.date(), z.string().datetime()])',
      'date': 'z.union([z.date(), z.string()])',
      'time': 'z.string()',
      'inet': 'z.string().ip()',
      'cidr': 'z.string()',
      'macaddr': 'z.string()',
      'bytea': 'z.string()',
      'geography': 'z.any()',
      'geometry': 'z.any()',
      'USER-DEFINED': 'z.string()',
    };

    baseType = typeMap[pgType] || 'z.any()';
  }

  return nullable ? `${baseType}.optional().nullable()` : baseType;
}

function toPascalCase(str: string): string {
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

function generateTableValidator(table: any, enumTypes: Set<string>): string {
  const schemaName = `${toPascalCase(table.name)}Schema`;
  const lines: string[] = [];

  lines.push(`import { z } from 'zod';`);

  // Import enums if needed
  if (enumTypes.size > 0) {
    const usedEnums = table.columns
      .filter((col: any) => enumTypes.has(col.type))
      .map((col: any) => toPascalCase(col.type));

    if (usedEnums.length > 0) {
      const uniqueEnums = [...new Set(usedEnums)];
      lines.push(`import { ${uniqueEnums.join(', ')} } from './enums.js';`);
    }
  }

  lines.push('');

  lines.push(`/**`);
  lines.push(` * Zod validator for ${table.name} table`);
  lines.push(` * Owner: ${table.owner}`);
  lines.push(` */`);
  lines.push(`export const ${schemaName} = z.object({`);

  for (const col of table.columns) {
    if (col.comment) {
      lines.push(`  /** ${col.comment} */`);
    }
    const zodType = postgresTypeToZod(col.type, col.nullable || !!col.default, enumTypes);
    lines.push(`  ${col.name}: ${zodType},`);
  }

  lines.push(`});\n`);

  // Insert schema
  lines.push(`/**`);
  lines.push(` * Validator for inserting into ${table.name}`);
  lines.push(` */`);

  // Identify auto-generated fields
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
    });

  if (autoFields.length > 0) {
    lines.push(`export const ${schemaName}Insert = ${schemaName}.omit({`);
    autoFields.forEach((col: any, idx: number) => {
      lines.push(`  ${col.name}: true${idx < autoFields.length - 1 ? ',' : ''}`);
    });
    lines.push(`}).extend({`);
    autoFields.forEach((col: any, idx: number) => {
      const zodType = postgresTypeToZod(col.type, true, enumTypes);
      lines.push(`  ${col.name}: ${zodType}${idx < autoFields.length - 1 ? ',' : ''}`);
    });
    lines.push(`});\n`);
  } else {
    lines.push(`export const ${schemaName}Insert = ${schemaName};\n`);
  }

  // Update schema
  lines.push(`/**`);
  lines.push(` * Validator for updating ${table.name}`);
  lines.push(` */`);

  const hasIdColumn = table.columns.some((col: any) => col.name === 'id');
  if (hasIdColumn) {
    lines.push(`export const ${schemaName}Update = ${schemaName}.partial().required({ id: true });\n`);
  } else {
    lines.push(`export const ${schemaName}Update = ${schemaName}.partial();\n`);
  }

  // Export types
  lines.push(`export type ${toPascalCase(table.name)} = z.infer<typeof ${schemaName}>;`);
  lines.push(`export type ${toPascalCase(table.name)}Insert = z.infer<typeof ${schemaName}Insert>;`);
  lines.push(`export type ${toPascalCase(table.name)}Update = z.infer<typeof ${schemaName}Update>;`);

  return lines.join('\n');
}

function generateEnumValidator(enumDef: { name: string; values: string[] }): string {
  const enumName = toPascalCase(enumDef.name);
  const lines: string[] = [];

  lines.push(`/**`);
  lines.push(` * Enum: ${enumDef.name}`);
  lines.push(` */`);
  lines.push(`export enum ${enumName} {`);

  const usedKeys = new Set<string>();

  for (const value of enumDef.values) {
    // Strip leading/trailing quotes from value
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

async function main() {
  const restoreLogs = setupOutputStyle();
  console.log('🔨 Generating Zod validators from database schemas...\n');

  const generatedDir = join(process.cwd(), 'src', 'generated');
  const validatorsDir = join(process.cwd(), 'src', 'validators');

  // Ensure validators directory exists
  mkdirSync(validatorsDir, { recursive: true });

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

    // Create database-specific validators directory
    const dbValidatorsDir = join(validatorsDir, dbName);
    mkdirSync(dbValidatorsDir, { recursive: true });

    // Collect enum types
    const enumTypes = new Set(schema.enums?.map(e => e.name) || []);

    // Generate enum validators
    if (schema.enums && schema.enums.length > 0) {
      const enumsContent = [
        `// Auto-generated enum validators for ${dbName}`,
        `// DO NOT EDIT - Generated by chittyschema`,
        '',
        ...schema.enums.map(enumDef => generateEnumValidator(enumDef))
      ].join('\n');

      const enumsPath = join(dbValidatorsDir, 'enums.ts');
      writeFileSync(enumsPath, enumsContent);
      console.log(`   ✅ Generated enums.ts`);
    }

    // Generate validators for each table
    const tableIndexExports: string[] = [];

    for (const table of schema.tables) {
      const validatorDefinition = generateTableValidator(table, enumTypes);
      const outputPath = join(dbValidatorsDir, `${table.name}.ts`);
      writeFileSync(outputPath, validatorDefinition);

      tableIndexExports.push(`export * from './${table.name}.js';`);
    }

    // Generate database index file
    const dbIndexContent = [
      `/**`,
      ` * ChittySchema Validators for ${dbName}`,
      ` *`,
      ` * Generated automatically from database schema introspection.`,
      ` * DO NOT EDIT MANUALLY - Run 'npm run generate:validators' to regenerate.`,
      ` *`,
      ` * @generated ${new Date().toISOString()}`,
      ` */`,
      '',
      schema.enums && schema.enums.length > 0 ? `export * from './enums.js';` : '',
      ...tableIndexExports,
      ''
    ].join('\n');

    writeFileSync(join(dbValidatorsDir, 'index.ts'), dbIndexContent);
    console.log(`   ✅ Generated ${schema.tables.length} validator files`);
    console.log(`   💾 Saved to: src/validators/${dbName}/\n`);

    // Add to main exports
    allExports.push(`export * as ${dbName.replace(/-/g, '_')} from './${dbName}/index.js';`);
  }

  // Generate main index file
  const mainIndexContent = [
    `/**`,
    ` * ChittySchema - Validators for ChittyOS Ecosystem`,
    ` *`,
    ` * Usage:`,
    ` * import { chittyledger, chittyos_core } from '@chittyos/schema/validators';`,
    ` *`,
    ` * const result = chittyledger.EvidenceSchema.safeParse(data);`,
    ` * const identityResult = chittyos_core.IdentitiesSchema.safeParse(data);`,
    ` */`,
    '',
    ...allExports,
    ''
  ].join('\n');

  writeFileSync(join(validatorsDir, 'index.ts'), mainIndexContent);

  const totalTables = databases.reduce((sum, db) => {
    const schema = JSON.parse(readFileSync(join(generatedDir, db, 'schema.json'), 'utf-8'));
    return sum + schema.tables.length;
  }, 0);

  if (isCompact()) {
    restoreLogs();
    printJSONSummary({ ok: true, databases: databases.length, tables: totalTables });
  } else {
    console.log('✅ Validator generation complete!');
    console.log(`   Total databases: ${databases.length}`);
    console.log(`   Total tables: ${totalTables}`);
    console.log('   📦 Validators available at: src/validators/');
  }
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
