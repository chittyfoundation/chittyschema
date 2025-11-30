/**
 * Tables Discovery Routes
 * GET /api/tables - List all tables
 * GET /api/tables/:name - Get table schema
 * GET /api/tables/:name/columns - Get table columns
 * GET /api/tables/:name/relationships - Get table relationships
 */

import { Hono } from 'hono';
import { getTableMetadata, getAllTables } from '../lib/schema-loader';

const app = new Hono();

/**
 * List all tables across all databases
 */
app.get('/', (c) => {
  try {
    const dbConfig = require('../../database-config.json');

    const tables = dbConfig.databases.flatMap((db: any) =>
      Object.keys(db.tables).map(tableName => ({
        name: tableName,
        database: db.name,
        owner: db.tables[tableName]
      }))
    );

    return c.json({
      success: true,
      count: tables.length,
      tables,
      databases: dbConfig.databases.map((db: any) => ({
        name: db.name,
        description: db.description,
        tableCount: Object.keys(db.tables).length
      }))
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});

/**
 * Get detailed schema for a specific table
 */
app.get('/:name', (c) => {
  try {
    const tableName = c.req.param('name');
    const metadata = getTableMetadata(tableName);

    if (!metadata) {
      return c.json({
        success: false,
        error: `Table not found: ${tableName}`,
        availableTables: getAllTables()
      }, 404);
    }

    return c.json({
      success: true,
      table: tableName,
      ...metadata
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});

/**
 * Get columns for a specific table
 */
app.get('/:name/columns', (c) => {
  try {
    const tableName = c.req.param('name');
    const metadata = getTableMetadata(tableName);

    if (!metadata) {
      return c.json({
        success: false,
        error: `Table not found: ${tableName}`
      }, 404);
    }

    return c.json({
      success: true,
      table: tableName,
      columns: metadata.columns || []
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});

/**
 * Get relationships for a specific table
 */
app.get('/:name/relationships', (c) => {
  try {
    const tableName = c.req.param('name');
    const metadata = getTableMetadata(tableName);

    if (!metadata) {
      return c.json({
        success: false,
        error: `Table not found: ${tableName}`
      }, 404);
    }

    return c.json({
      success: true,
      table: tableName,
      relationships: metadata.relationships || [],
      foreignKeys: metadata.foreignKeys || [],
      referencedBy: metadata.referencedBy || []
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});

export { app as tablesRoute };
