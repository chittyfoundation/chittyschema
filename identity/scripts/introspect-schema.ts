#!/usr/bin/env tsx
/**
 * Schema Introspection Script
 *
 * Connects to the live ChittyOS-Core Neon database and introspects:
 * - All tables, columns, types, constraints
 * - Foreign key relationships
 * - Indexes and their purposes
 * - Views and functions
 * - Table comments and ownership
 *
 * Outputs a complete schema.json file that serves as the source of truth
 * for all type generation, validation, and documentation.
 */

import { Client } from 'pg';
import { writeFileSync } from 'fs';
import { join } from 'path';

interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  default: string | null;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  foreignKeyTarget?: { table: string; column: string };
  comment?: string;
}

interface IndexInfo {
  name: string;
  columns: string[];
  unique: boolean;
  type: string; // btree, gist, etc.
}

interface TableInfo {
  name: string;
  schema: string;
  comment: string | null;
  owner: string; // Which service owns this table
  columns: ColumnInfo[];
  indexes: IndexInfo[];
  primaryKey: string[];
  foreignKeys: Array<{
    column: string;
    referencedTable: string;
    referencedColumn: string;
    onDelete: string;
    onUpdate: string;
  }>;
}

interface SchemaSnapshot {
  version: string;
  timestamp: string;
  database: string;
  tables: TableInfo[];
  views: Array<{ name: string; definition: string }>;
  functions: Array<{ name: string; definition: string }>;
  extensions: string[];
}

async function introspectDatabase(): Promise<SchemaSnapshot> {
  const connectionString = process.env.NEON_DATABASE_URL;

  if (!connectionString) {
    throw new Error('NEON_DATABASE_URL environment variable is required');
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    // Get database name
    const dbResult = await client.query('SELECT current_database()');
    const database = dbResult.rows[0].current_database;

    // Get installed extensions
    const extensionsResult = await client.query(`
      SELECT extname FROM pg_extension ORDER BY extname
    `);
    const extensions = extensionsResult.rows.map(r => r.extname);

    // Get all tables
    const tablesResult = await client.query(`
      SELECT
        t.tablename as name,
        t.schemaname as schema,
        obj_description((quote_ident(t.schemaname) || '.' || quote_ident(t.tablename))::regclass) as comment
      FROM pg_tables t
      WHERE t.schemaname = 'public'
      ORDER BY t.tablename
    `);

    const tables: TableInfo[] = [];

    for (const tableRow of tablesResult.rows) {
      const tableName = tableRow.name;

      // Get columns
      const columnsResult = await client.query(`
        SELECT
          c.column_name as name,
          c.data_type as type,
          c.is_nullable = 'YES' as nullable,
          c.column_default as default,
          col_description((quote_ident($1) || '.' || quote_ident($2))::regclass, c.ordinal_position) as comment
        FROM information_schema.columns c
        WHERE c.table_schema = 'public' AND c.table_name = $2
        ORDER BY c.ordinal_position
      `, ['public', tableName]);

      // Get primary keys
      const pkResult = await client.query(`
        SELECT a.attname as column_name
        FROM pg_index i
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        WHERE i.indrelid = $1::regclass AND i.indisprimary
      `, [tableName]);
      const primaryKey = pkResult.rows.map(r => r.column_name);

      // Get foreign keys
      const fkResult = await client.query(`
        SELECT
          kcu.column_name,
          ccu.table_name AS referenced_table,
          ccu.column_name AS referenced_column,
          rc.delete_rule as on_delete,
          rc.update_rule as on_update
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        JOIN information_schema.referential_constraints AS rc
          ON rc.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = $1
      `, [tableName]);

      const foreignKeys = fkResult.rows.map(r => ({
        column: r.column_name,
        referencedTable: r.referenced_table,
        referencedColumn: r.referenced_column,
        onDelete: r.on_delete,
        onUpdate: r.on_update,
      }));

      // Get indexes
      const indexResult = await client.query(`
        SELECT
          i.relname as name,
          array_agg(a.attname ORDER BY a.attnum) as columns,
          ix.indisunique as unique,
          am.amname as type
        FROM pg_class t
        JOIN pg_index ix ON t.oid = ix.indrelid
        JOIN pg_class i ON i.oid = ix.indexrelid
        JOIN pg_am am ON i.relam = am.oid
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
        WHERE t.relname = $1
          AND t.relkind = 'r'
        GROUP BY i.relname, ix.indisunique, am.amname
      `, [tableName]);

      const indexes: IndexInfo[] = indexResult.rows.map(r => ({
        name: r.name,
        columns: r.columns,
        unique: r.unique,
        type: r.type,
      }));

      // Build column info with FK references
      const columns: ColumnInfo[] = columnsResult.rows.map(col => {
        const fk = foreignKeys.find(f => f.column === col.name);
        return {
          name: col.name,
          type: col.type,
          nullable: col.nullable,
          default: col.default,
          isPrimaryKey: primaryKey.includes(col.name),
          isForeignKey: !!fk,
          foreignKeyTarget: fk ? { table: fk.referencedTable, column: fk.referencedColumn } : undefined,
          comment: col.comment,
        };
      });

      // Determine owner from comment
      const owner = extractOwnerFromComment(tableRow.comment);

      tables.push({
        name: tableName,
        schema: tableRow.schema,
        comment: tableRow.comment,
        owner,
        columns,
        indexes,
        primaryKey,
        foreignKeys,
      });
    }

    // Get views
    const viewsResult = await client.query(`
      SELECT
        viewname as name,
        definition
      FROM pg_views
      WHERE schemaname = 'public'
      ORDER BY viewname
    `);
    const views = viewsResult.rows;

    // Get functions
    const functionsResult = await client.query(`
      SELECT
        p.proname as name,
        pg_get_functiondef(p.oid) as definition
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.prokind = 'f'
      ORDER BY p.proname
    `);
    const functions = functionsResult.rows;

    return {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      database,
      tables,
      views,
      functions,
      extensions,
    };
  } finally {
    await client.end();
  }
}

function extractOwnerFromComment(comment: string | null): string {
  if (!comment) return 'unknown';

  // Extract service name from comments like "ChittyAuth: API tokens..."
  const match = comment.match(/^(Chitty\w+):/);
  if (match) return match[1].toLowerCase();

  if (comment.includes('Shared:')) return 'shared';

  return 'unknown';
}

async function main() {
  console.log('🔍 Introspecting ChittyOS-Core database schema...\n');

  const schema = await introspectDatabase();

  console.log(`✅ Introspected ${schema.tables.length} tables`);
  console.log(`✅ Found ${schema.views.length} views`);
  console.log(`✅ Found ${schema.functions.length} functions`);
  console.log(`✅ Extensions: ${schema.extensions.join(', ')}\n`);

  // Output schema.json
  const outputPath = join(process.cwd(), 'identity', 'src', 'generated', 'schema.json');
  writeFileSync(outputPath, JSON.stringify(schema, null, 2));

  console.log(`💾 Schema saved to: ${outputPath}`);
  console.log('\n📊 Table Overview:');

  for (const table of schema.tables) {
    console.log(`  • ${table.name} (${table.columns.length} columns) - owned by ${table.owner}`);
  }
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
