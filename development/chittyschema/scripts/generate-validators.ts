#!/usr/bin/env tsx
/**
 * Zod Validator Generation Script
 *
 * Reads schema.json and generates Zod schemas for runtime validation.
 * Each table gets a validator that matches its database constraints.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { setupOutputStyle, isCompact, printJSONSummary } from './lib/output-style.ts';

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
      comment?: string;
    }>;
  }>;
}

function postgresTypeToZod(pgType: string, nullable: boolean): string {
  let baseType: string;

  if (pgType.startsWith('ARRAY')) {
    baseType = 'z.array(z.string())';
  } else {
    const typeMap: Record<string, string> = {
      'uuid': 'z.string().uuid()',
      'text': 'z.string()',
      'character varying': 'z.string()',
      'varchar': 'z.string()',
      'integer': 'z.number().int()',
      'bigint': 'z.number().int()',
      'smallint': 'z.number().int()',
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
      'inet': 'z.string().ip()',
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

function generateTableValidator(table: any): string {
  const schemaName = `${toPascalCase(table.name)}Schema`;
  const lines: string[] = [];

  lines.push(`import { z } from 'zod';\n`);

  lines.push(`/**`);
  lines.push(` * Zod validator for ${table.name} table`);
  lines.push(` * Owner: ${table.owner}`);
  lines.push(` */`);
  lines.push(`export const ${schemaName} = z.object({`);

  for (const col of table.columns) {
    if (col.comment) {
      lines.push(`  /** ${col.comment} */`);
    }
    const zodType = postgresTypeToZod(col.type, col.nullable || !!col.default);
    lines.push(`  ${col.name}: ${zodType},`);
  }

  lines.push(`});\n`);

  // Insert schema
  lines.push(`/**`);
  lines.push(` * Validator for inserting into ${table.name}`);
  lines.push(` */`);
  lines.push(`export const ${schemaName}Insert = ${schemaName}.omit({`);
  lines.push(`  id: true,`);
  lines.push(`  created_at: true,`);
  lines.push(`  updated_at: true,`);
  lines.push(`}).extend({`);
  lines.push(`  id: z.string().uuid().optional(),`);
  lines.push(`  created_at: z.union([z.date(), z.string().datetime()]).optional(),`);
  lines.push(`  updated_at: z.union([z.date(), z.string().datetime()]).optional(),`);
  lines.push(`});\n`);

  // Update schema
  lines.push(`/**`);
  lines.push(` * Validator for updating ${table.name}`);
  lines.push(` */`);
  lines.push(`export const ${schemaName}Update = ${schemaName}.partial().required({ id: true });\n`);

  // Export types
  lines.push(`export type ${toPascalCase(table.name)} = z.infer<typeof ${schemaName}>;`);
  lines.push(`export type ${toPascalCase(table.name)}Insert = z.infer<typeof ${schemaName}Insert>;`);
  lines.push(`export type ${toPascalCase(table.name)}Update = z.infer<typeof ${schemaName}Update>;`);

  return lines.join('\n');
}

function generateIndexFile(tableNames: string[]): string {
  const lines: string[] = [];
  lines.push(`/**`);
  lines.push(` * ChittyOS Schema Validators`);
  lines.push(` * `);
  lines.push(` * Generated automatically from database schema introspection.`);
  lines.push(` * DO NOT EDIT MANUALLY - Run 'npm run generate:validators' to regenerate.`);
  lines.push(` * `);
  lines.push(` * @generated ${new Date().toISOString()}`);
  lines.push(` */`);
  lines.push('');

  for (const tableName of tableNames) {
    const pascalName = toPascalCase(tableName);
    const schemaName = `${pascalName}Schema`;
    lines.push(`export {`);
    lines.push(`  ${schemaName},`);
    lines.push(`  ${schemaName}Insert,`);
    lines.push(`  ${schemaName}Update,`);
    lines.push(`  type ${pascalName},`);
    lines.push(`  type ${pascalName}Insert,`);
    lines.push(`  type ${pascalName}Update,`);
    lines.push(`} from './${tableName}';`);
    lines.push('');
  }

  return lines.join('\n');
}

async function main() {
  const restoreLogs = setupOutputStyle();
  console.log('🔨 Generating Zod validators from schema...\n');

  const schemaPath = join(process.cwd(), 'src', 'generated', 'schema.json');
  const schema: SchemaSnapshot = JSON.parse(readFileSync(schemaPath, 'utf-8'));

  const validatorsDir = join(process.cwd(), 'src', 'validators');

  // Generate validator file for each table
  for (const table of schema.tables) {
    const validatorDefinition = generateTableValidator(table);
    const outputPath = join(validatorsDir, `${table.name}.ts`);
    writeFileSync(outputPath, validatorDefinition);
    console.log(`  ✅ Generated ${table.name}.ts`);
  }

  // Generate index file
  const indexContent = generateIndexFile(schema.tables.map(t => t.name));
  const indexPath = join(validatorsDir, 'index.ts');
  writeFileSync(indexPath, indexContent);
  console.log(`  ✅ Generated index.ts`);

  if (isCompact()) {
    restoreLogs();
    printJSONSummary({ ok: true, validators: schema.tables.length });
  } else {
    console.log(`\n✨ Generated ${schema.tables.length} Zod validator files`);
  }
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
