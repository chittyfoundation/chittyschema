/**
 * Type Generation Routes
 * GET /api/generate/python/:table - Generate Pydantic models
 * GET /api/generate/typescript/:table - Generate TypeScript types
 * GET /api/generate/zod/:table - Generate Zod validators
 */

import { Hono } from 'hono';
import { getTableMetadata } from '../lib/schema-loader';
import { generatePydanticModel, generateTypeScript, generateZodSchema } from '../lib/generators';

const app = new Hono();

/**
 * Generate Pydantic model for Python services
 */
app.get('/python/:table', (c) => {
  try {
    const tableName = c.req.param('table');
    const metadata = getTableMetadata(tableName);

    if (!metadata) {
      return c.json({
        success: false,
        error: `Table not found: ${tableName}`
      }, 404);
    }

    const code = generatePydanticModel(tableName, metadata);

    return c.text(code, 200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${tableName}.py"`
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});

/**
 * Generate TypeScript types
 */
app.get('/typescript/:table', (c) => {
  try {
    const tableName = c.req.param('table');
    const metadata = getTableMetadata(tableName);

    if (!metadata) {
      return c.json({
        success: false,
        error: `Table not found: ${tableName}`
      }, 404);
    }

    const code = generateTypeScript(tableName, metadata);

    return c.text(code, 200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${tableName}.ts"`
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});

/**
 * Generate Zod validator schema
 */
app.get('/zod/:table', (c) => {
  try {
    const tableName = c.req.param('table');
    const metadata = getTableMetadata(tableName);

    if (!metadata) {
      return c.json({
        success: false,
        error: `Table not found: ${tableName}`
      }, 404);
    }

    const code = generateZodSchema(tableName, metadata);

    return c.text(code, 200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${tableName}.zod.ts"`
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});

export { app as generateRoute };
