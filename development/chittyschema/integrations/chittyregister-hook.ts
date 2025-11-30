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
    const validatorPath = join(__dirname, '../scripts/validate-service-compliance.ts');

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
 * Example usage in chittyregister service
 */
export const example = `
// In chittyregister/src/routes/services.ts

import { validateForRegistration } from '@chittyos/schema/integrations/chittyregister-hook';

router.post('/api/services/register', async (req, res) => {
  const { serviceName, repoUrl, version } = req.body;

  // Validate schema compliance
  const certification = await validateForRegistration({
    serviceName,
    repoUrl,
    version,
  });

  if (!certification.certified) {
    return res.status(400).json({
      error: 'Schema certification failed',
      score: certification.score,
      violations: certification.violations,
      report: certification.report,
    });
  }

  // Proceed with registration
  await db.insert('services', {
    name: serviceName,
    repo_url: repoUrl,
    version,
    schema_certified: true,
    schema_score: certification.score,
    certified_at: certification.certifiedAt,
  });

  res.json({
    success: true,
    message: 'Service registered successfully',
    certification,
  });
});
`;
