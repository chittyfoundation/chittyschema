# ChittySchema API

**Live at:** https://schema.chitty.cc

Universal schema validation and code generation service for ChittyOS. Provides runtime validation, schema discovery, and automatic code generation for Python, TypeScript, and Zod validators.

## Why Schema-as-a-Service?

ChittyOS is a polyglot microservices architecture with services written in Python (ChittyScore, bane), TypeScript (chittyauth, chittyid, chittyconnect), and JavaScript. All services share the same Neon PostgreSQL database (`chittyos-core`), so they need consistent validation rules.

**The Problem:** How do you ensure a Python Flask app validates data the same way as a TypeScript Cloudflare Worker?

**The Solution:** schema.chitty.cc - a central API that:
- Validates data at runtime using Zod schemas
- Generates Pydantic models for Python services
- Generates TypeScript types for TypeScript services
- Provides schema discovery and documentation

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     schema.chitty.cc                        │
│                  (Cloudflare Workers API)                   │
├─────────────────────────────────────────────────────────────┤
│  • Runtime validation (POST /api/validate)                  │
│  • Schema discovery (GET /api/tables)                       │
│  • Code generation (GET /api/generate/{lang}/{table})       │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
    ┌─────▼─────┐     ┌─────▼─────┐     ┌─────▼─────┐
    │ ChittyScore│     │ chittyauth │     │  chittyid │
    │  (Python)  │     │(TypeScript)│     │(TypeScript)│
    └────────────┘     └────────────┘     └───────────┘
          │                 │                 │
          └─────────────────┼─────────────────┘
                            ▼
                  ┌──────────────────┐
                  │   Neon PostgreSQL │
                  │  (chittyos-core)  │
                  └──────────────────┘
```

## API Endpoints

### 1. Runtime Validation

**Endpoint:** `POST /api/validate`

Validates data against table schemas using Zod validators.

**Request:**
```json
{
  "table": "trust_scores",
  "operation": "insert",
  "data": {
    "identity_id": "550e8400-e29b-41d4-a716-446655440000",
    "source_dimension": 85.0,
    "temporal_dimension": 75.0,
    "channel_dimension": 80.0,
    "outcome_dimension": 90.0,
    "network_dimension": 85.0,
    "justice_dimension": 88.0,
    "people_score": 87.5,
    "legal_score": 85.0,
    "state_score": 83.0,
    "chitty_score": 85.5,
    "composite_score": 85.5,
    "trust_level": "L3_PROFESSIONAL",
    "confidence": 92.0,
    "ai_enhanced": true
  }
}
```

**Response (Success):**
```json
{
  "valid": true,
  "data": {
    "identity_id": "550e8400-e29b-41d4-a716-446655440000",
    "source_dimension": 85.0,
    ...
  }
}
```

**Response (Validation Error):**
```json
{
  "valid": false,
  "errors": [
    {
      "field": "source_dimension",
      "message": "Number must be less than or equal to 100"
    }
  ]
}
```

**Supported Operations:**
- `insert` - Validates data for insertion (excludes auto-generated fields)
- `update` - Validates data for updates (partial data allowed)
- `select` - Validates query results (all fields optional)

---

### 2. Schema Discovery

#### List All Tables
**Endpoint:** `GET /api/tables`

Returns all available tables across all databases.

**Response:**
```json
{
  "success": true,
  "count": 12,
  "tables": [
    {
      "name": "trust_scores",
      "database": "chittyos-core",
      "owner": "chittyscore"
    },
    {
      "name": "identities",
      "database": "chittyos-core",
      "owner": "chittyid"
    }
  ],
  "databases": [
    {
      "name": "chittyos-core",
      "description": "Core identity and trust tables",
      "tableCount": 8
    },
    {
      "name": "chittyledger",
      "description": "Financial ledger and transactions",
      "tableCount": 4
    }
  ]
}
```

#### Get Table Schema
**Endpoint:** `GET /api/tables/:name`

Returns detailed schema information for a specific table.

**Example:** `GET /api/tables/trust_scores`

**Response:**
```json
{
  "success": true,
  "table": "trust_scores",
  "database": "chittyos-core",
  "owner": "chittyscore",
  "description": "ChittyScore: 6D behavioral trust scoring with dimension analysis",
  "columns": [
    {
      "name": "id",
      "type": "UUID",
      "nullable": false,
      "default": "gen_random_uuid()"
    },
    {
      "name": "identity_id",
      "type": "UUID",
      "nullable": false,
      "foreignKey": {
        "table": "identities",
        "column": "id"
      }
    },
    {
      "name": "source_dimension",
      "type": "NUMERIC(5,2)",
      "nullable": false,
      "constraint": "0-100"
    }
  ]
}
```

#### Get Table Columns
**Endpoint:** `GET /api/tables/:name/columns`

Returns just the column definitions for a table.

#### Get Table Relationships
**Endpoint:** `GET /api/tables/:name/relationships`

Returns foreign key relationships and references.

**Response:**
```json
{
  "success": true,
  "table": "trust_scores",
  "relationships": [
    {
      "column": "identity_id",
      "references": {
        "table": "identities",
        "column": "id"
      }
    }
  ],
  "referencedBy": [
    {
      "table": "trust_events",
      "column": "trust_score_id"
    }
  ]
}
```

---

### 3. Code Generation

#### Generate Pydantic Models (Python)
**Endpoint:** `GET /api/generate/python/:table`

Generates Pydantic models for Python services like ChittyScore.

**Example:** `GET /api/generate/python/trust_scores`

**Response:** (Content-Type: text/plain)
```python
"""
Auto-generated Pydantic model for trust_scores table
Generated by ChittySchema API at schema.chitty.cc
DO NOT EDIT - Regenerate when schema changes
"""

from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field


class TrustScores(BaseModel):
    """
    ChittyScore: 6D behavioral trust scoring with dimension analysis
    Database: chittyos-core
    Owner: chittyscore
    """
    id: Optional[UUID] = None
    identity_id: UUID

    # 6 Dimension Scores (0-100 scale)
    source_dimension: float = Field(ge=0, le=100, description="15% weight - Identity verification and credentials")
    temporal_dimension: float = Field(ge=0, le=100, description="10% weight - Historical consistency and longevity")
    channel_dimension: float = Field(ge=0, le=100, description="15% weight - Communication channel reliability")
    outcome_dimension: float = Field(ge=0, le=100, description="20% weight - Track record of positive outcomes")
    network_dimension: float = Field(ge=0, le=100, description="15% weight - Quality of network connections")
    justice_dimension: float = Field(ge=0, le=100, description="25% weight - Alignment with justice principles")

    # 4 Output Scores (0-100 scale)
    people_score: float = Field(ge=0, le=100, description="Interpersonal trust assessment")
    legal_score: float = Field(ge=0, le=100, description="Legal system alignment")
    state_score: float = Field(ge=0, le=100, description="Institutional trust level")
    chitty_score: float = Field(ge=0, le=100, description="Overall ChittyOS trust rating")

    # Composite & Metadata
    composite_score: float = Field(ge=0, le=100, description="Weighted average of all dimensions")
    trust_level: str = Field(default="L0_ANONYMOUS", description="L0-L4 lifecycle stage")
    confidence: float = Field(ge=0, le=100, description="Confidence in score accuracy")
    ai_enhanced: bool = True
    insights: Optional[dict] = None
    calculation_details: Optional[dict] = None

    calculated_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True  # Pydantic v2


class TrustScoresInsert(BaseModel):
    """Insert model for trust_scores (excludes auto-generated fields)"""
    identity_id: UUID
    source_dimension: float = Field(ge=0, le=100)
    temporal_dimension: float = Field(ge=0, le=100)
    channel_dimension: float = Field(ge=0, le=100)
    outcome_dimension: float = Field(ge=0, le=100)
    network_dimension: float = Field(ge=0, le=100)
    justice_dimension: float = Field(ge=0, le=100)
    people_score: float = Field(ge=0, le=100)
    legal_score: float = Field(ge=0, le=100)
    state_score: float = Field(ge=0, le=100)
    chitty_score: float = Field(ge=0, le=100)
    composite_score: float = Field(ge=0, le=100)
    trust_level: str = "L0_ANONYMOUS"
    confidence: float = Field(ge=0, le=100)
    ai_enhanced: bool = True
    insights: Optional[dict] = None
    calculation_details: Optional[dict] = None
```

#### Generate TypeScript Types
**Endpoint:** `GET /api/generate/typescript/:table`

Generates TypeScript interfaces and types.

**Example:** `GET /api/generate/typescript/trust_scores`

**Response:** (Content-Type: text/plain)
```typescript
/**
 * Auto-generated TypeScript types for trust_scores table
 * Generated by ChittySchema API at schema.chitty.cc
 * DO NOT EDIT
 */

/**
 * ChittyScore: 6D behavioral trust scoring with dimension analysis
 * Database: chittyos-core
 * Owner: chittyscore
 */
export interface TrustScores {
  id?: string;
  identity_id: string;

  // 6 Dimension Scores
  source_dimension: number;
  temporal_dimension: number;
  channel_dimension: number;
  outcome_dimension: number;
  network_dimension: number;
  justice_dimension: number;

  // 4 Output Scores
  people_score: number;
  legal_score: number;
  state_score: number;
  chitty_score: number;

  composite_score: number;
  trust_level: string;
  confidence: number;
  ai_enhanced?: boolean;
  insights?: any;
  calculation_details?: any;

  calculated_at?: Date | string;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export type TrustScoresInsert = Omit<TrustScores, 'id' | 'created_at' | 'updated_at'>;
export type TrustScoresUpdate = Partial<TrustScores> & Pick<TrustScores, 'id'>;
```

#### Generate Zod Validators
**Endpoint:** `GET /api/generate/zod/:table`

Generates Zod validation schemas for TypeScript.

**Example:** `GET /api/generate/zod/trust_scores`

---

## Usage Examples

### Python (ChittyScore Flask App)

```python
import requests
from uuid import UUID

# Validate data before database insert
def save_trust_score(score_data):
    # Call schema.chitty.cc for validation
    response = requests.post('https://schema.chitty.cc/api/validate', json={
        'table': 'trust_scores',
        'operation': 'insert',
        'data': score_data
    })

    result = response.json()

    if not result['valid']:
        errors = result['errors']
        raise ValueError(f"Validation failed: {errors}")

    # Data is valid, insert into database
    validated_data = result['data']
    db.execute('INSERT INTO trust_scores (...) VALUES (...)', validated_data)
```

### TypeScript (chittyauth Worker)

```typescript
// Validate API request data
export async function POST(request: Request, env: Bindings) {
  const data = await request.json();

  // Call schema.chitty.cc for validation
  const response = await fetch('https://schema.chitty.cc/api/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'api_tokens',
      operation: 'insert',
      data
    })
  });

  const result = await response.json();

  if (!result.valid) {
    return Response.json({ error: result.errors }, { status: 400 });
  }

  // Data is valid, proceed with business logic
  const token = await createToken(result.data);
  return Response.json({ token });
}
```

### Code Generation Workflow

```bash
# Generate Python models for ChittyScore
curl https://schema.chitty.cc/api/generate/python/trust_scores > models/trust_scores.py

# Generate TypeScript types for chittyauth
curl https://schema.chitty.cc/api/generate/typescript/api_tokens > src/types/api_tokens.ts

# Generate Zod validators for chittyid
curl https://schema.chitty.cc/api/generate/zod/identities > src/validators/identities.ts
```

---

## Local Development

### Prerequisites
- Node.js 18+
- Wrangler CLI: `npm install -g wrangler`

### Setup

```bash
cd chittyschema

# Install dependencies
npm install

# Start local dev server (localhost:8787)
npm run dev:api
```

### Testing Locally

```bash
# Test validation endpoint
curl -X POST http://localhost:8787/api/validate \
  -H "Content-Type: application/json" \
  -d '{
    "table": "trust_scores",
    "operation": "insert",
    "data": {
      "identity_id": "550e8400-e29b-41d4-a716-446655440000",
      "source_dimension": 85.0,
      "temporal_dimension": 75.0,
      "channel_dimension": 80.0,
      "outcome_dimension": 90.0,
      "network_dimension": 85.0,
      "justice_dimension": 88.0,
      "people_score": 87.5,
      "legal_score": 85.0,
      "state_score": 83.0,
      "chitty_score": 85.5,
      "composite_score": 85.5,
      "trust_level": "L3_PROFESSIONAL",
      "confidence": 92.0,
      "ai_enhanced": true
    }
  }'

# List all tables
curl http://localhost:8787/api/tables

# Get trust_scores schema
curl http://localhost:8787/api/tables/trust_scores

# Generate Pydantic model
curl http://localhost:8787/api/generate/python/trust_scores
```

---

## Deployment

### Staging
```bash
npm run deploy:staging
```
Deploys to: `https://chittyschema-api-staging.chitty.cc`

### Production
```bash
npm run deploy:production
```
Deploys to: `https://schema.chitty.cc`

### Verify Deployment
```bash
curl https://schema.chitty.cc/
```

Expected response:
```json
{
  "service": "ChittySchema API",
  "version": "1.0.0",
  "endpoints": {
    "validate": "POST /api/validate",
    "listTables": "GET /api/tables",
    "getTable": "GET /api/tables/:name",
    "generatePython": "GET /api/generate/python/:table",
    "generateTypeScript": "GET /api/generate/typescript/:table",
    "generateZod": "GET /api/generate/zod/:table"
  }
}
```

---

## Supported Tables

### chittyos-core Database
- `identities` - Core identity records with DID and biometric data
- `credentials` - Digital credentials and verifications
- `api_tokens` - API authentication tokens for service access
- `trust_scores` - 6D behavioral trust scoring (ChittyScore)
- `trust_events` - Event history that affects trust scores
- `trust_networks` - Graph of trust relationships between identities
- `verifications` - Verification records and chain of custody
- `audit_logs` - System-wide audit trail

### chittyledger Database
- `transactions` - Financial transactions and ledger entries
- `accounts` - Account balances and metadata
- `invoices` - Invoice records
- `payments` - Payment processing records

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Table not found: invalid_table",
  "availableTables": ["trust_scores", "identities", "api_tokens", ...]
}
```

**HTTP Status Codes:**
- `200` - Success
- `400` - Validation error (data doesn't match schema)
- `404` - Resource not found (table doesn't exist)
- `500` - Server error

---

## Architecture Notes

### Why Cloudflare Workers?
- **Global edge deployment** - Low latency from anywhere
- **Zero cold starts** - Always fast validation
- **Auto-scaling** - Handles traffic spikes automatically
- **Cost-effective** - Free tier covers most usage

### Why Hono Framework?
- **Lightweight** - Tiny bundle size for edge deployment
- **Fast routing** - Optimized for Workers runtime
- **TypeScript-first** - Type safety across the API
- **Middleware support** - Easy to add auth, logging, etc.

### Schema Source of Truth
The API reads from:
1. **database-config.json** - Table ownership and database mapping
2. **src/types/** - Generated TypeScript types from database introspection
3. **src/validators/** - Zod schemas for runtime validation

When the database schema changes:
1. Run `npm run introspect` - Updates src/schemas/
2. Run `npm run generate:types` - Updates src/types/
3. Run `npm run generate:validators` - Updates src/validators/
4. Deploy updated API: `npm run deploy:production`

---

## Roadmap

### Phase 1 (Current)
- ✅ Runtime validation API
- ✅ Schema discovery endpoints
- ✅ Python/TypeScript/Zod code generation
- ⏳ Deploy to schema.chitty.cc

### Phase 2 (Next)
- [ ] Authentication for sensitive schemas
- [ ] Rate limiting and quota management
- [ ] Caching layer for frequently accessed schemas
- [ ] Webhook support for schema change notifications

### Phase 3 (Future)
- [ ] GraphQL endpoint for schema queries
- [ ] Auto-migration generation
- [ ] Schema versioning and compatibility checking
- [ ] Integration with ChittyRegistry for service discovery

---

## Support

- **Documentation**: https://docs.chitty.cc/schema
- **Issues**: https://github.com/chittyfoundation/chittyschema/issues
- **Status**: https://status.chitty.cc

---

## License

MIT License - Copyright (c) 2024 Chitty Foundation
