#!/usr/bin/env tsx
// Multi-Database Documentation Generation Script
// Reads all schema.json files and generates comprehensive documentation

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { setupOutputStyle, isCompact, printJSONSummary } from './lib/output-style.ts';

// Initialize output style at module load to suppress verbose logs if compact
const __restoreLogs = setupOutputStyle();
interface SchemaSnapshot {
  version: string;
  timestamp: string;
  database: string;
  databaseName: string;
  databaseDescription: string;
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
  enums?: Array<{ name: string; values: string[] }>;
}

function toPascalCase(str: string): string {
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

function generateDatabaseDocs(schema: SchemaSnapshot, dbName: string): string {
  const lines: string[] = [];

  // Header
  lines.push(`# ${schema.databaseName} Schema Documentation`);
  lines.push(``);
  lines.push(`**Description:** ${schema.databaseDescription}`);
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
      lines.push(`  - [${table.name}](#${table.name.toLowerCase().replace(/_/g, '-')})`);
    }
  }
  lines.push(``);

  // Extensions
  if (schema.extensions && schema.extensions.length > 0) {
    lines.push(`## PostgreSQL Extensions`);
    lines.push(``);
    for (const ext of schema.extensions) {
      lines.push(`- \`${ext}\``);
    }
    lines.push(``);
  }

  // Enums
  if (schema.enums && schema.enums.length > 0) {
    lines.push(`## Enums`);
    lines.push(``);
    for (const enumDef of schema.enums) {
      lines.push(`### ${enumDef.name}`);
      lines.push(``);
      lines.push(`**Values:**`);
      for (const value of enumDef.values) {
        lines.push(`- \`${value}\``);
      }
      lines.push(``);
    }
  }

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
      lines.push(`import { ${dbName.replace(/-/g, '_')} } from '@chittyos/schema';`);
      lines.push(`const myRecord: ${dbName.replace(/-/g, '_')}.${typeName} = { ... };`);
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
      if (table.foreignKeys && table.foreignKeys.length > 0) {
        lines.push(`**Foreign Keys:**`);
        lines.push(``);
        for (const fk of table.foreignKeys) {
          lines.push(`- \`${fk.column}\` → \`${fk.referencedTable}.${fk.referencedColumn}\` (ON DELETE ${fk.onDelete})`);
        }
        lines.push(``);
      }

      // Indexes
      if (table.indexes && table.indexes.length > 0) {
        lines.push(`**Indexes:**`);
        lines.push(``);
        for (const idx of table.indexes) {
          const uniqueStr = idx.unique ? ' (UNIQUE)' : '';
          const cols = Array.isArray(idx.columns) ? idx.columns.join(', ') : idx.columns;
          lines.push(`- \`${idx.name}\` on \`${cols}\` (${idx.type})${uniqueStr}`);
        }
        lines.push(``);
      }

      lines.push(``);
    }
  }

  // Views
  if (schema.views && schema.views.length > 0) {
    lines.push(`## Views`);
    lines.push(``);
    for (const view of schema.views) {
      lines.push(`### ${view.name}`);
      lines.push(``);
      if (view.definition) {
        lines.push(`\`\`\`sql`);
        lines.push(view.definition);
        lines.push(`\`\`\``);
        lines.push(``);
      }
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
  console.log('📚 Generating documentation from database schemas...\n');

  const generatedDir = join(process.cwd(), 'identity', 'src', 'generated');
  const docsDir = join(process.cwd(), 'identity', 'docs');

  // Ensure docs directory exists
  mkdirSync(docsDir, { recursive: true });

  // Find all schema.json files
  const databases = readdirSync(generatedDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  console.log(`Found ${databases.length} databases: ${databases.join(', ')}\n`);

  for (const dbName of databases) {
    const schemaPath = join(generatedDir, dbName, 'schema.json');
    const schema: SchemaSnapshot = JSON.parse(readFileSync(schemaPath, 'utf-8'));

    console.log(`📊 ${dbName}:`);
    console.log(`   Tables: ${schema.tables.length}`);
    console.log(`   Views: ${schema.views?.length || 0}`);
    console.log(`   Extensions: ${schema.extensions?.length || 0}`);

    const docs = generateDatabaseDocs(schema, dbName);

    const outputPath = join(docsDir, `${dbName.toUpperCase()}_SCHEMA.md`);
    writeFileSync(outputPath, docs);

    console.log(`   ✅ Generated: docs/${dbName.toUpperCase()}_SCHEMA.md\n`);
  }

  // Generate main index
  const indexLines: string[] = [];
  indexLines.push(`# ChittyOS Schema Documentation`);
  indexLines.push(``);
  indexLines.push(`This directory contains auto-generated schema documentation for all ChittyOS databases.`);
  indexLines.push(``);
  indexLines.push(`## Databases`);
  indexLines.push(``);

  for (const dbName of databases) {
    const schemaPath = join(generatedDir, dbName, 'schema.json');
    const schema: SchemaSnapshot = JSON.parse(readFileSync(schemaPath, 'utf-8'));
    indexLines.push(`- **[${schema.databaseName}](./${dbName.toUpperCase()}_SCHEMA.md)** - ${schema.databaseDescription}`);
  }

  indexLines.push(``);
  indexLines.push(`## Usage`);
  indexLines.push(``);
  indexLines.push(`\`\`\`typescript`);
  indexLines.push(`// Import types from @chittyos/schema`);
  for (const dbName of databases) {
    indexLines.push(`import { ${dbName.replace(/-/g, '_')} } from '@chittyos/schema';`);
  }
  indexLines.push(``);
  indexLines.push(`// Use the types`);
  indexLines.push(`const identity: chittyos_core.Identities = { ... };`);
  indexLines.push(`const evidence: chittyledger.Evidence = { ... };`);
  indexLines.push(`\`\`\``);
  indexLines.push(``);
  indexLines.push(`---`);
  indexLines.push(`*Generated: ${new Date().toLocaleString()}*`);

  writeFileSync(join(docsDir, 'README.md'), indexLines.join('\n'));

  if (isCompact()) {
    __restoreLogs();
    printJSONSummary({ ok: true, databases: databases.length });
  } else {
    console.log('✅ Documentation generation complete!');
    console.log(`   📚 Generated docs for ${databases.length} databases`);
    console.log('   📦 Documentation available at: docs/');
  }
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
