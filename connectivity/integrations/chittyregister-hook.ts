// ChittyRegister Integration Hook
// Validates schema compliance during service registration

import { execSync } from 'child_process';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

export interface ServiceRegistrationRequest {
  serviceName: string;
  repoUrl: string;
  branch?: string;
  version: string;
}

export interface CertificationResult {
  certified: boolean;
  score: number;
  violations: string[];
  warnings: string[];
  report: string;
  certifiedAt?: Date;
}

/**
 * Validates a service's schema compliance before registration
 *
 * Called by chittyregister during service registration workflow
 */
export async function validateForRegistration(
  request: ServiceRegistrationRequest
): Promise<CertificationResult> {
  console.log(`\n🔍 Validating schema compliance for: ${request.serviceName}`);
  console.log(`   Repository: ${request.repoUrl}`);
  console.log(`   Version: ${request.version}\n`);

  // Create temporary directory for cloning
  const tmpDir = mkdtempSync(join(tmpdir(), 'chittyschema-validation-'));

  try {
    // Clone repository
    console.log('📥 Cloning repository...');
    execSync(`git clone --depth 1 --branch ${request.branch || 'main'} ${request.repoUrl} ${tmpDir}`, {
      stdio: 'pipe',
    });

    // Run compliance validation
    console.log('🔍 Running compliance checks...');
    const validatorPath = join(__dirname, '../../identity/scripts/validate-service-compliance.ts');

    let output = '';
    let exitCode = 0;

    try {
      output = execSync(`npx tsx ${validatorPath} ${tmpDir}`, {
        encoding: 'utf-8',
      });
    } catch (error: any) {
      output = error.stdout || error.stderr || error.message;
      exitCode = error.status || 1;
    }

    // Parse results
    const scoreMatch = output.match(/Score: (\d+)\/100/);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;
    const compliant = output.includes('Service is schema-compliant');

    // Extract violations
    const violations: string[] = [];
    const violationMatches = output.matchAll(/\[(?:CRITICAL|ERROR)\] (.+?)(?:\n|$)/g);
    for (const match of violationMatches) {
      violations.push(match[1]);
    }

    // Extract warnings
    const warnings: string[] = [];
    const warningMatches = output.matchAll(/⚠️\s+(.+?)(?:\n|$)/g);
    for (const match of warningMatches) {
      warnings.push(match[1]);
    }

    const result: CertificationResult = {
      certified: compliant && score >= 80,
      score,
      violations,
      warnings,
      report: output,
      certifiedAt: compliant ? new Date() : undefined,
    };

    console.log(`\n📊 Validation Results:`);
    console.log(`   Score: ${score}/100`);
    console.log(`   Status: ${result.certified ? '✅ CERTIFIED' : '❌ NOT CERTIFIED'}`);
    console.log(`   Violations: ${violations.length}`);
    console.log(`   Warnings: ${warnings.length}\n`);

    return result;

  } catch (error: any) {
    console.error('❌ Validation failed:', error.message);

    return {
      certified: false,
      score: 0,
      violations: [`Validation error: ${error.message}`],
      warnings: [],
      report: error.message,
    };

  } finally {
    // Cleanup temporary directory
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('⚠️  Failed to cleanup temporary directory:', tmpDir);
    }
  }
}

/**
 * Webhook endpoint for chittyregister
 * POST /api/validate-service
 */
export async function handleRegistrationWebhook(requestBody: ServiceRegistrationRequest) {
  const result = await validateForRegistration(requestBody);

  if (!result.certified) {
    throw new Error(
      `Service ${requestBody.serviceName} failed schema certification (Score: ${result.score}/100). ` +
      `Violations: ${result.violations.join(', ')}`
    );
  }

  return {
    success: true,
    certification: {
      certified: true,
      score: result.score,
      certifiedAt: result.certifiedAt,
      validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    },
  };
}

/**
 * Worker / serverless-friendly variant of validateForRegistration.
 *
 * Calls the deployed ChittySchema validate endpoint over HTTP. Use this
 * from environments that cannot spawn `git clone` (Cloudflare Workers,
 * edge functions, browser-side tooling). Server-side Node callers that
 * want the full local-clone audit should use validateForRegistration().
 *
 * The endpoint is real and lives at:
 *   POST {schemaBaseUrl}/api/registry/validate/:serviceName
 *   Body: { repoUrl, branch?, version? }
 *
 * Default schemaBaseUrl is https://schema.chitty.cc. Override for staging
 * or local dev (e.g. http://localhost:8787).
 */
export async function validateForRegistrationViaHttp(
  request: ServiceRegistrationRequest,
  options: { schemaBaseUrl?: string; authToken?: string } = {}
): Promise<CertificationResult> {
  const baseUrl = (options.schemaBaseUrl || 'https://schema.chitty.cc').replace(/\/+$/, '');
  const url = `${baseUrl}/api/registry/validate/${encodeURIComponent(request.serviceName)}`;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.authToken) headers.Authorization = `Bearer ${options.authToken}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        repoUrl: request.repoUrl,
        branch: request.branch,
        version: request.version,
      }),
    });
  } catch (err) {
    return {
      certified: false,
      score: 0,
      violations: [`Network error calling ${url}: ${(err as Error).message}`],
      warnings: [],
      report: '',
    };
  }

  if (!res.ok) {
    let body = '';
    try {
      body = await res.text();
    } catch {
      // ignore
    }
    return {
      certified: false,
      score: 0,
      violations: [`Validator responded ${res.status} ${res.statusText}: ${body || '<empty>'}`],
      warnings: [],
      report: body,
    };
  }

  // Response shape from registry.ts: { service, validation: ComplianceCheck, recommendations: string[] }
  const json = (await res.json()) as {
    validation: {
      score: number;
      overall_status: 'compliant' | 'compliant_with_warnings' | 'non_compliant';
      required: { checks: Array<{ name: string; passed: boolean; message?: string }> };
      recommended: { checks: Array<{ name: string; passed: boolean; message?: string }> };
      evidence: { repo: string; branch: string; fetched_at: string };
    };
    recommendations: string[];
  };

  const v = json.validation;
  const certified = v.overall_status !== 'non_compliant' && v.score >= 80;
  const violations = v.required.checks
    .filter((check) => !check.passed)
    .map((check) => check.message || check.name);
  const warnings = v.recommended.checks
    .filter((check) => !check.passed)
    .map((check) => check.message || check.name);

  return {
    certified,
    score: v.score,
    violations,
    warnings,
    report: JSON.stringify(json, null, 2),
    certifiedAt: certified ? new Date(v.evidence.fetched_at) : undefined,
  };
}

/**
 * Example call sites. These reflect the actual integration paths, not
 * aspirational ones. The HTTP variant works in any runtime; the local
 * variant requires Node + git + npx.
 */
export const examples = {
  /**
   * In chittyregister (Cloudflare Worker / edge runtime):
   * call the deployed ChittySchema validator over HTTP. No npm
   * dependency on @chittyos/schema is required — just fetch.
   *
   * Reference call site (when wired in chittyregister):
   *   CHITTYFOUNDATION/chittyregister/src/routes/services.ts
   */
  http: `
import { validateForRegistrationViaHttp } from '@chittyos/schema/integrations/chittyregister-hook';

app.post('/api/v1/services/register', async (c) => {
  const body = await c.req.json();

  const certification = await validateForRegistrationViaHttp({
    serviceName: body.service_name,
    repoUrl: body.repo_url,
    branch: body.branch,
    version: body.version,
  });

  if (!certification.certified) {
    return c.json({
      error: 'Schema certification failed',
      score: certification.score,
      violations: certification.violations,
      warnings: certification.warnings,
    }, 400);
  }

  // proceed with registration write to service_registrations
  // ...
  return c.json({ success: true, certification });
});
`,
  /**
   * In a Node CI job (e.g. GitHub Actions release workflow): use the
   * full local validator, which clones and runs the compliance script.
   * Requires Node, git, and npx in the runner image.
   */
  local: `
import { validateForRegistration } from '@chittyos/schema/integrations/chittyregister-hook';

const result = await validateForRegistration({
  serviceName: process.env.SERVICE_NAME!,
  repoUrl: process.env.GITHUB_REPOSITORY_URL!,
  branch: process.env.GITHUB_REF_NAME,
  version: process.env.PACKAGE_VERSION!,
});

if (!result.certified) {
  console.error('Schema certification failed:', result.violations);
  process.exit(1);
}
`,
};
