/**
 * Meta-Schema Route
 *
 * Serves the bundled meta-schemas at:
 *   GET  /meta                       — list all meta-schemas
 *   GET  /meta/:name                 — single meta-schema (JSON)
 *   GET  /meta/:name.schema.json     — same, with explicit suffix
 *   POST /meta/:name/validate        — validate a document against a meta-schema
 *
 * On first request after deploy, also self-bootstraps the R2 bucket
 * `CANONICAL_SCHEMAS` by uploading the bundled schemas. Subsequent requests
 * skip the upload step. This makes the bucket the canonical, externally-
 * fetchable copy without needing a separate provisioning step.
 *
 * The POST /validate endpoint converts the bundled meta-schemas from
 * local-script-only artifacts into ecosystem governance contracts. Any
 * service that needs to verify a portfolio-owners or repo-requirements
 * document can now do so over HTTP without cloning chittyschema.
 *
 * @canon chittycanon://core/services/chitty-schema#meta
 */

import { Hono } from 'hono';
import { META_SCHEMAS, validate, type MetaSchemaName } from '../lib/meta-validator';

type Env = {
  CANONICAL_SCHEMAS?: R2Bucket;
};

const app = new Hono<{ Bindings: Env }>();

const SCHEMA_NAMES = Object.keys(META_SCHEMAS) as MetaSchemaName[];

/**
 * List every available meta-schema with its $id and a one-line description.
 */
app.get('/', (c) => {
  return c.json(
    {
      success: true,
      count: SCHEMA_NAMES.length,
      schemas: SCHEMA_NAMES.map((name) => {
        const schema = META_SCHEMAS[name] as {
          $id?: string;
          title?: string;
          description?: string;
        };
        return {
          name,
          $id: schema.$id,
          title: schema.title,
          description: schema.description,
          url: `/meta/${name}.schema.json`,
          validateUrl: `/meta/${name}/validate`,
        };
      }),
    },
    200,
    { 'Cache-Control': 'public, max-age=300' }
  );
});

/**
 * Validate a document against one of the bundled meta-schemas.
 *
 * POST /meta/:name/validate
 * Body: the document to validate (any JSON value).
 *
 * Returns:
 *   { valid: true,  errors: [] }
 *   { valid: false, errors: [{ path, message, keyword, params }] } (HTTP 422)
 *
 * Use cases:
 *   - chittycanon's pre-commit hook validates governance/owners.json
 *     against the portfolio-owners meta-schema before allowing commit.
 *   - CI workflows in any CHITTYFOUNDATION repo can validate
 *     repo_requirements.json against the repo-requirements meta-schema.
 *   - Any service can verify the shape of meta-documents it produces
 *     without bundling Ajv or the schemas locally.
 */
app.post('/:name/validate', async (c) => {
  const raw = c.req.param('name');
  const name = raw.replace(/\.schema\.json$/, '') as MetaSchemaName;

  if (!(name in META_SCHEMAS)) {
    return c.json(
      {
        success: false,
        error: `Unknown meta-schema: ${name}`,
        available: SCHEMA_NAMES,
      },
      404
    );
  }

  let document: unknown;
  try {
    document = await c.req.json();
  } catch (err) {
    return c.json(
      {
        success: false,
        valid: false,
        error: 'Request body is not valid JSON',
        message: (err as Error).message,
      },
      400
    );
  }

  const result = validate(name, document);
  const status = result.valid ? 200 : 422;

  return c.json(
    {
      success: true,
      schema: name,
      schema_url: `/meta/${name}.schema.json`,
      valid: result.valid,
      errors: result.errors,
      validated_at: new Date().toISOString(),
    },
    status
  );
});

/**
 * Serve a single meta-schema. Strips an optional `.schema.json` suffix
 * so both `/meta/manifest` and `/meta/manifest.schema.json` work.
 */
app.get('/:name', async (c) => {
  const raw = c.req.param('name');
  const name = raw.replace(/\.schema\.json$/, '') as MetaSchemaName;

  if (!(name in META_SCHEMAS)) {
    return c.json(
      {
        success: false,
        error: `Unknown meta-schema: ${name}`,
        available: SCHEMA_NAMES,
      },
      404
    );
  }

  // Best-effort upload to R2 (idempotent — R2 PUT is overwrite-safe).
  // We do this lazily on read so the first GET after deploy populates the
  // bucket. Subsequent GETs are no-ops if the bucket already has the file.
  if (c.env.CANONICAL_SCHEMAS) {
    const key = `meta/${name}.schema.json`;
    const existing = await c.env.CANONICAL_SCHEMAS.head(key);
    if (!existing) {
      await c.env.CANONICAL_SCHEMAS.put(
        key,
        JSON.stringify(META_SCHEMAS[name], null, 2),
        {
          httpMetadata: { contentType: 'application/schema+json' },
          customMetadata: { source: 'bundled', kind: 'meta-schema' },
        }
      );
    }
  }

  return c.json(META_SCHEMAS[name], 200, {
    'Content-Type': 'application/schema+json',
    'Cache-Control': 'public, max-age=3600, immutable',
  });
});

export { app as metaRoute };
