#!/usr/bin/env tsx
/**
 * Documentation Generation Script
 *
 * Reads schema.json and generates comprehensive Markdown documentation
 * showing tables, relationships, ownership, and usage examples.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { setupOutputStyle, isCompact, printJSONSummary } from './lib/output-style.ts';

interface SchemaSnapshot {
  version: string;
  timestamp: string;
  database: string;
  tables: Array<{
    name: string;
    owner: string;
    comment: string | null;
    columns: Array<{
      name: string;
      type: string;
      nullable: boolean;
      isPrimaryKey: boolean;
      isForeignKey: boolean;
      foreignKeyTarget?: { table: string; column: string };
      comment?: string;
    }>;
    foreignKeys: Array<{
      column: string;
      referencedTable: string;
      referencedColumn: string;
      onDelete: string;
      onUpdate: string;
    }>;
    indexes: Array<{
      name: string;
      columns: string[];
      unique: boolean;
      type: string;
    }>;
  }>;
  views: Array<{ name: string; definition: string }>;
  functions: Array<{ name: string; definition: string }>;
  extensions: string[];
}

function toPascalCase(str: string): string {
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

function generateDocs(schema: SchemaSnapshot): string {
  const lines: string[] = [];

  // Header
  lines.push(`# ChittyOS Database Schema Documentation`);
  lines.push(``);
  lines.push(`**Generated:** ${new Date(schema.timestamp).toLocaleString()}`);
  lines.push(`**Database:** ${schema.database}`);
  lines.push(`**Version:** ${schema.version}`);
  lines.push(``);

  // Table of Contents
  lines.push(`## Table of Contents`);
  lines.push(``);
  const tablesByOwner = schema.tables.reduce((acc, table) => {
    if (!acc[table.owner]) acc[table.owner] = [];
    acc[table.owner].push(table);
    return acc;
  }, {} as Record<string, typeof schema.tables>);

  for (const owner of Object.keys(tablesByOwner).sort()) {
    lines.push(`- **${owner}**`);
    for (const table of tablesByOwner[owner]) {
      lines.push(`  - [${table.name}](#${table.name})`);
    }
  }
  lines.push(``);

  // Extensions
  lines.push(`## PostgreSQL Extensions`);
  lines.push(``);
  for (const ext of schema.extensions) {
    lines.push(`- \`${ext}\``);
  }
  lines.push(``);

  // Tables by Owner
  for (const owner of Object.keys(tablesByOwner).sort()) {
    lines.push(`## ${owner.charAt(0).toUpperCase() + owner.slice(1)} Tables`);
    lines.push(``);

    for (const table of tablesByOwner[owner]) {
      lines.push(`### ${table.name}`);
      lines.push(``);
      if (table.comment) {
        lines.push(`> ${table.comment}`);
        lines.push(``);
      }

      // TypeScript usage
      const typeName = toPascalCase(table.name);
      lines.push(`**TypeScript Import:**`);
      lines.push(`\`\`\`typescript`);
      lines.push(`import { ${typeName}, ${typeName}Schema } from '@chittyos/schema';`);
      lines.push(`\`\`\``);
      lines.push(``);

      // Columns table
      lines.push(`**Columns:**`);
      lines.push(``);
      lines.push(`| Column | Type | Nullable | Constraints | Description |`);
      lines.push(`|--------|------|----------|-------------|-------------|`);

      for (const col of table.columns) {
        const constraints: string[] = [];
        if (col.isPrimaryKey) constraints.push('PK');
        if (col.isForeignKey && col.foreignKeyTarget) {
          constraints.push(`FK → ${col.foreignKeyTarget.table}.${col.foreignKeyTarget.column}`);
        }
        const constraintStr = constraints.join(', ') || '-';
        const nullableStr = col.nullable ? 'Yes' : 'No';
        const desc = col.comment || '-';
        lines.push(`| \`${col.name}\` | ${col.type} | ${nullableStr} | ${constraintStr} | ${desc} |`);
      }
      lines.push(``);

      // Foreign Keys
      if (table.foreignKeys.length > 0) {
        lines.push(`**Foreign Keys:**`);
        lines.push(``);
        for (const fk of table.foreignKeys) {
          lines.push(`- \`${fk.column}\` → \`${fk.referencedTable}.${fk.referencedColumn}\` (ON DELETE ${fk.onDelete})`);
        }
        lines.push(``);
      }

      // Indexes
      if (table.indexes.length > 0) {
        lines.push(`**Indexes:**`);
        lines.push(``);
        for (const idx of table.indexes) {
          const uniqueStr = idx.unique ? ' (UNIQUE)' : '';
          lines.push(`- \`${idx.name}\` on \`${idx.columns.join(', ')}\` (${idx.type})${uniqueStr}`);
        }
        lines.push(``);
      }

      lines.push(``);
    }
  }

  // Views
  if (schema.views.length > 0) {
    lines.push(`## Views`);
    lines.push(``);
    for (const view of schema.views) {
      lines.push(`### ${view.name}`);
      lines.push(``);
      lines.push(`\`\`\`sql`);
      lines.push(view.definition);
      lines.push(`\`\`\``);
      lines.push(``);
    }
  }

  // Functions
  if (schema.functions.length > 0) {
    lines.push(`## Functions`);
    lines.push(``);
    for (const func of schema.functions) {
      lines.push(`### ${func.name}`);
      lines.push(``);
      lines.push(`\`\`\`sql`);
      lines.push(func.definition);
      lines.push(`\`\`\``);
      lines.push(``);
    }
  }

  // Footer
  lines.push(`---`);
  lines.push(``);
  lines.push(`*This documentation is automatically generated from the live database schema.*`);
  lines.push(`*Do not edit manually - run \`npm run generate:docs\` to regenerate.*`);

  return lines.join('\n');
}

async function main() {
  const restoreLogs = setupOutputStyle();
  console.log('📚 Generating documentation from schema...\n');

  const schemaPath = join(process.cwd(), 'identity', 'src', 'generated', 'schema.json');
  const schema: SchemaSnapshot = JSON.parse(readFileSync(schemaPath, 'utf-8'));

  const docs = generateDocs(schema);

  const outputPath = join(process.cwd(), 'SCHEMA.md');
  writeFileSync(outputPath, docs);

  if (isCompact()) {
    restoreLogs();
    printJSONSummary({ ok: true, tables: schema.tables.length, views: schema.views.length, functions: schema.functions.length });
  } else {
    console.log(`✅ Documentation generated: ${outputPath}`);
    console.log(`📊 Documented ${schema.tables.length} tables, ${schema.views.length} views, ${schema.functions.length} functions`);
  }
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
