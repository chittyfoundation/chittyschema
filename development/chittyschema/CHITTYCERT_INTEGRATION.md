# ChittyCert Integration

ChittyCert is the X.509 Certificate Authority for the ChittyOS ecosystem, providing TLS certificates, code signing, and cryptographic identity verification.

## API Endpoints

**Base URL**: `https://cert.chitty.cc`

### Certificate Operations

#### Issue Certificate
```http
POST /api/v1/x509/ca/issue
Content-Type: application/json
Authorization: Bearer {CHITTY_CERT_SERVICE_TOKEN}

{
  "commonName": "service.chitty.cc",
  "type": "server|client|code-signing",
  "validityDays": 90,
  "subjectAltNames": ["*.service.chitty.cc"]
}
```

**Response**:
```json
{
  "success": true,
  "certificate": {
    "serial": "1A2B3C4D5E6F",
    "pem": "-----BEGIN CERTIFICATE-----\n...",
    "chain": ["-----BEGIN CERTIFICATE-----\n..."],
    "expiresAt": "2025-04-06T00:00:00Z"
  }
}
```

#### Get Certificate
```http
GET /api/v1/x509/certificates/:serial
```

**Response**: Certificate details with PEM encoding

#### Validate Certificate Chain
```http
POST /api/v1/x509/validate
Content-Type: application/json

{
  "certificate": "-----BEGIN CERTIFICATE-----\n...",
  "chain": ["-----BEGIN CERTIFICATE-----\n..."]
}
```

**Response**:
```json
{
  "valid": true,
  "chain": ["Root CA", "Intermediate CA", "End Entity"],
  "expiresAt": "2025-04-06T00:00:00Z",
  "revoked": false
}
```

### Revocation Checking

#### OCSP Check
```http
GET /api/v1/x509/ocsp/:serial
```

**Response**:
```json
{
  "serial": "1A2B3C4D5E6F",
  "status": "good|revoked|unknown",
  "revokedAt": null,
  "nextUpdate": "2025-01-07T00:00:00Z"
}
```

#### Download CRL
```http
GET /api/v1/x509/crl/:caName.crl
```

**Response**: Binary CRL file (application/pkix-crl)

---

## Schema Integration

ChittyCert certificate data should be stored in **ChittyLedger** for immutability and audit trail.

### Recommended Tables

```sql
-- Add to ChittyLedger schema
CREATE TABLE certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  serial TEXT UNIQUE NOT NULL,
  common_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('server', 'client', 'code-signing')),
  pem_certificate TEXT NOT NULL,
  pem_chain TEXT[] NOT NULL,
  issued_by UUID REFERENCES users(id),
  issued_to_service TEXT,
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
  valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
  revoked BOOLEAN DEFAULT false,
  revoked_at TIMESTAMP WITH TIME ZONE,
  revocation_reason TEXT,
  ocsp_url TEXT,
  crl_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_certificates_serial ON certificates(serial);
CREATE INDEX idx_certificates_common_name ON certificates(common_name);
CREATE INDEX idx_certificates_revoked ON certificates(revoked);
CREATE INDEX idx_certificates_valid_until ON certificates(valid_until);

-- Certificate revocation audit trail
CREATE TABLE certificate_revocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  certificate_id UUID NOT NULL REFERENCES certificates(id),
  serial TEXT NOT NULL,
  revoked_by UUID REFERENCES users(id),
  reason TEXT NOT NULL,
  revoked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_certificate_revocations_certificate_id ON certificate_revocations(certificate_id);
CREATE INDEX idx_certificate_revocations_revoked_at ON certificate_revocations(revoked_at DESC);
```

---

## Usage in ChittyOS Services

### Issue Service Certificate

```typescript
import { ApiTokens } from '@chittyos/schema';

async function issueServiceCertificate(serviceName: string) {
  const response = await fetch('https://cert.chitty.cc/api/v1/x509/ca/issue', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CHITTY_CERT_SERVICE_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      commonName: `${serviceName}.chitty.cc`,
      type: 'server',
      validityDays: 90,
      subjectAltNames: [`*.${serviceName}.chitty.cc`],
    }),
  });

  const { certificate } = await response.json();

  // Store in ChittyLedger
  await db.insert('certificates', {
    serial: certificate.serial,
    common_name: `${serviceName}.chitty.cc`,
    type: 'server',
    pem_certificate: certificate.pem,
    pem_chain: certificate.chain,
    issued_to_service: serviceName,
    valid_from: new Date(),
    valid_until: new Date(certificate.expiresAt),
    ocsp_url: `https://cert.chitty.cc/api/v1/x509/ocsp/${certificate.serial}`,
    crl_url: 'https://cert.chitty.cc/api/v1/x509/crl/chittyos-ca.crl',
  });

  return certificate;
}
```

### Validate Certificate

```typescript
async function validateCertificate(certificatePem: string, chainPem: string[]) {
  const response = await fetch('https://cert.chitty.cc/api/v1/x509/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      certificate: certificatePem,
      chain: chainPem,
    }),
  });

  const { valid, revoked, expiresAt } = await response.json();

  if (revoked) {
    throw new Error('Certificate has been revoked');
  }

  if (!valid) {
    throw new Error('Certificate validation failed');
  }

  return { valid: true, expiresAt };
}
```

### Check OCSP Status

```typescript
async function checkCertificateRevocation(serial: string) {
  const response = await fetch(`https://cert.chitty.cc/api/v1/x509/ocsp/${serial}`);
  const { status, revokedAt } = await response.json();

  if (status === 'revoked') {
    // Update ChittyLedger
    await db.update('certificates', {
      where: { serial },
      data: {
        revoked: true,
        revoked_at: new Date(revokedAt),
      },
    });

    return { revoked: true, revokedAt };
  }

  return { revoked: false };
}
```

---

## Environment Variables

```bash
# ChittyCert service token
CHITTY_CERT_SERVICE_TOKEN=chittyos_cert_...

# ChittyCert API base URL
CHITTYCERT_SERVICE=https://cert.chitty.cc
```

---

## Migration from Old Endpoint

**Old (Deprecated)**:
```typescript
// ❌ Old endpoint (deprecated)
POST https://cert.chitty.foundation/api/v1/issue
```

**New (Current)**:
```typescript
// ✅ New endpoint
POST https://cert.chitty.cc/api/v1/x509/ca/issue
```

### Breaking Changes

1. **Domain change**: `cert.chitty.foundation` → `cert.chitty.cc`
2. **Endpoint path**: `/api/v1/issue` → `/api/v1/x509/ca/issue`
3. **Namespace**: All endpoints now under `/api/v1/x509/`

### Migration Steps

1. Update `CHITTYCERT_SERVICE` environment variable
2. Update API endpoint paths in code
3. Test certificate issuance with new endpoint
4. Update OCSP/CRL URLs in issued certificates

---

## Certificate Lifecycle

```
1. Issue       → POST /api/v1/x509/ca/issue
2. Store       → Insert into ChittyLedger certificates table
3. Use         → TLS, code signing, service authentication
4. Validate    → POST /api/v1/x509/validate
5. Check OCSP  → GET /api/v1/x509/ocsp/:serial
6. Revoke      → (ChittyCert admin operation)
7. Audit       → ChittyLedger certificate_revocations table
```

---

## Integration with Schema Certification

ChittyCert certificates can be used to sign code artifacts during certification:

```typescript
// Sign schema package with ChittyCert
async function signSchemaPackage(packagePath: string) {
  // 1. Get code-signing certificate
  const cert = await issueServiceCertificate('chittyschema');

  // 2. Sign package
  const signature = await signWithCertificate(packagePath, cert.pem);

  // 3. Store signature in ChittyLedger
  await db.insert('blockchain_records', {
    entity_type: 'schema_package',
    entity_id: 'chittyschema@0.1.1',
    metadata_hash: hashFile(packagePath),
    proof_data: { signature, certificate: cert.serial },
  });

  return { signature, certificate: cert.serial };
}
```

---

## Related Documentation

- ChittyCert Service: https://cert.chitty.cc
- ChittyLedger Schema: `migrations/chittyledger/001_initial_evidence_schema.sql`
- ChittyOS Ecosystem: `../CLAUDE.md`

---

**Last Updated**: 2025-01-06
**API Version**: v1
**Base URL**: https://cert.chitty.cc
