/**
 * Validation Routes
 * POST /api/validate - Validate data against table schema
 * POST /api/validate/bulk - Validate multiple records
 */

import { Hono } from 'hono';
import { loadSchemas } from '../lib/schema-loader';

const app = new Hono();

/**
 * Validate a single record against table schema
 *
 * POST /api/validate
 * Body: {
 *   table: string,
 *   operation: 'insert' | 'update' | 'select',
 *   data: Record<string, any>
 * }
 */
app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { table, operation = 'insert', data } = body;

    if (!table) {
      return c.json({
        valid: false,
        errors: ['Missing required field: table']
      }, 400);
    }

    if (!data) {
      return c.json({
        valid: false,
        errors: ['Missing required field: data']
      }, 400);
    }

    // Load schemas (generated Zod validators)
    const schemas = loadSchemas();

    // Find the appropriate schema
    const schemaName = getSchemaName(table, operation);

    if (!schemas[schemaName]) {
      return c.json({
        valid: false,
        errors: [`Schema not found for table: ${table}`],
        availableTables: Object.keys(schemas).filter(s => !s.endsWith('Insert') && !s.endsWith('Update'))
      }, 404);
    }

    // Validate using Zod schema
    const schema = schemas[schemaName];
    const result = schema.safeParse(data);

    if (result.success) {
      return c.json({
        valid: true,
        data: result.data,
        table,
        operation
      });
    } else {
      return c.json({
        valid: false,
        errors: result.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
          code: e.code
        })),
        table,
        operation
      }, 400);
    }

  } catch (error: any) {
    console.error('Validation error:', error);
    return c.json({
      valid: false,
      errors: [`Validation failed: ${error.message}`]
    }, 500);
  }
});

/**
 * Validate multiple records in bulk
 *
 * POST /api/validate/bulk
 * Body: {
 *   table: string,
 *   operation: 'insert' | 'update',
 *   data: Array<Record<string, any>>
 * }
 */
app.post('/bulk', async (c) => {
  try {
    const body = await c.req.json();
    const { table, operation = 'insert', data } = body;

    if (!table || !Array.isArray(data)) {
      return c.json({
        valid: false,
        errors: ['Invalid request: table and data array required']
      }, 400);
    }

    const schemas = loadSchemas();
    const schemaName = getSchemaName(table, operation);

    if (!schemas[schemaName]) {
      return c.json({
        valid: false,
        errors: [`Schema not found for table: ${table}`]
      }, 404);
    }

    const schema = schemas[schemaName];
    const results = data.map((item, index) => {
      const result = schema.safeParse(item);
      return {
        index,
        valid: result.success,
        data: result.success ? result.data : null,
        errors: result.success ? [] : result.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      };
    });

    const allValid = results.every(r => r.valid);
    const validCount = results.filter(r => r.valid).length;

    return c.json({
      valid: allValid,
      totalRecords: data.length,
      validRecords: validCount,
      invalidRecords: data.length - validCount,
      results,
      table,
      operation
    });

  } catch (error: any) {
    console.error('Bulk validation error:', error);
    return c.json({
      valid: false,
      errors: [`Bulk validation failed: ${error.message}`]
    }, 500);
  }
});

/**
 * Get the appropriate schema name based on table and operation
 */
function getSchemaName(table: string, operation: string): string {
  // Convert table name to PascalCase
  const pascalCase = table
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

  switch (operation) {
    case 'insert':
      // Match generated validator naming e.g. IdentitiesSchemaInsert
      return `${pascalCase}SchemaInsert`;
    case 'update':
      // Match generated validator naming e.g. IdentitiesSchemaUpdate
      return `${pascalCase}SchemaUpdate`;
    case 'select':
    default:
      return `${pascalCase}Schema`;
  }
}

export { app as validateRoute };
