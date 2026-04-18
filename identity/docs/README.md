# ChittyOS Schema Documentation

This directory contains auto-generated schema documentation for all ChittyOS databases.

## Databases

- **[chittyledger](./CHITTYLEDGER_SCHEMA.md)** - Legal evidence and transaction ledger for court-admissible records
- **[chittyos-core](./CHITTYOS-CORE_SCHEMA.md)** - Primary operational database for ChittyOS ecosystem

## Usage

```typescript
// Import types from @chittyos/schema
import { chittyledger } from '@chittyos/schema';
import { chittyos_core } from '@chittyos/schema';

// Use the types
const identity: chittyos_core.Identities = { ... };
const evidence: chittyledger.Evidence = { ... };
```

---
*Generated: 11/9/2025, 10:18:16 PM*