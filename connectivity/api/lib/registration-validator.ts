/**
 * Registration Validator (Worker-native)
 *
 * Real implementation backing POST /api/registry/validate/:serviceName.
 * Replaces the prior placeholder route that returned hardcoded scores.
 *
 * Strategy: fetch the candidate repo's compliance artifacts from GitHub
 * raw URLs and run deterministic checks. No git clone, no subprocess —
 * runs entirely inside a Cloudflare Worker.
 *
 * Scoring (100 pts total):
 *   REQUIRED (50 pts):
 *     - manifest_present       (20 pts) database-config.json exists
 *     - manifest_valid         (30 pts) parses + validates against meta-schema
 *   RECOMMENDED (50 pts):
 *     - triad_charter          (12 pts) CHARTER.md exists
 *     - triad_chitty           (12 pts) CHITTY.md exists
 *     - triad_claude           (12 pts) CLAUDE.md exists
 *     - service_name_matches   (14 pts) package.json name aligns with serviceName
 *
 * Status mapping:
 *   any required failed                 -> non_compliant
 *   all required, any recommended failed -> compliant_with_warnings
 *   all required + recommended passed   -> compliant
 *
 * @canon chittycanon://core/services/chitty-schema#registration-validator
 */

import { validateManifest } from './meta-validator';

export interface RegistrationValidationRequest {
  /** Logical service name (matches package.json or registry entry). */
  serviceName: string;
  /**
   * Repo identifier. Accepted forms:
   *   - "OWNER/repo"
   *   - "https://github.com/OWNER/repo"
   *   - "https://github.com/OWNER/repo.git"
   */
  repoUrl: string;
  /** Git ref to validate against. Default: "main". */
  branch?: string;
}

export interface ComplianceItem {
  name: string;
  passed: boolean;
  message?: string;
}

export interface ComplianceBucket {
  pass: number;
  fail: number;
  checks: ComplianceItem[];
}

export interface ComplianceCheck {
  required: ComplianceBucket;
  recommended: ComplianceBucket;
  optional: ComplianceBucket;
  overall_status: 'compliant' | 'compliant_with_warnings' | 'non_compliant';
  badge: 'green' | 'yellow' | 'red';
  score: number;
  evidence: {
    repo: string;
    branch: string;
    commit_sha?: string;
    fetched_at: string;
  };
}

export interface ValidatorOptions {
  /** Optional GitHub token for private repos or to avoid rate limits. */
  githubToken?: string;
  /** Override the GitHub raw host (used by tests). */
  rawHost?: string;
}

const POINT_WEIGHTS: Record<string, number> = {
  manifest_present: 20,
  manifest_valid: 30,
  triad_charter: 12,
  triad_chitty: 12,
  triad_claude: 12,
  service_name_matches: 14,
};

export async function validateRegistration(
  req: RegistrationValidationRequest,
  options: ValidatorOptions = {}
): Promise<ComplianceCheck> {
  const { owner, repo } = parseRepoUrl(req.repoUrl);
  const branch = req.branch || 'main';
  const rawHost = options.rawHost || 'https://raw.githubusercontent.com';

  const required: ComplianceItem[] = [];
  const recommended: ComplianceItem[] = [];

  // ---- REQUIRED: manifest presence + validity --------------------------
  const manifestText = await fetchRaw(rawHost, owner, repo, branch, 'database-config.json', options);
  if (manifestText === null) {
    required.push({
      name: 'manifest_present',
      passed: false,
      message: 'database-config.json not found at repo root',
    });
    required.push({
      name: 'manifest_valid',
      passed: false,
      message: 'cannot validate manifest (file missing)',
    });
  } else {
    required.push({
      name: 'manifest_present',
      passed: true,
      message: 'database-config.json found at repo root',
    });

    let parsed: unknown = null;
    try {
      parsed = JSON.parse(manifestText);
    } catch (err) {
      required.push({
        name: 'manifest_valid',
        passed: false,
        message: `database-config.json is not valid JSON: ${(err as Error).message}`,
      });
    }

    if (parsed !== null) {
      const result = validateManifest(parsed);
      required.push({
        name: 'manifest_valid',
        passed: result.valid,
        message: result.valid
          ? 'validates against manifest meta-schema'
          : `${result.errors.length} validation error(s); first: ${result.errors[0]?.message ?? 'unknown'}`,
      });
    }
  }

  // ---- RECOMMENDED: compliance triad ----------------------------------
  const triad: Array<['CHARTER.md' | 'CHITTY.md' | 'CLAUDE.md', string]> = [
    ['CHARTER.md', 'triad_charter'],
    ['CHITTY.md', 'triad_chitty'],
    ['CLAUDE.md', 'triad_claude'],
  ];
  for (const [file, checkName] of triad) {
    const text = await fetchRaw(rawHost, owner, repo, branch, file, options);
    recommended.push({
      name: checkName,
      passed: text !== null,
      message: text !== null ? `${file} present` : `${file} missing at repo root`,
    });
  }

  // ---- RECOMMENDED: service name matches package.json -----------------
  const pkgText = await fetchRaw(rawHost, owner, repo, branch, 'package.json', options);
  if (pkgText === null) {
    recommended.push({
      name: 'service_name_matches',
      passed: false,
      message: 'package.json not found at repo root',
    });
  } else {
    try {
      const pkg = JSON.parse(pkgText) as { name?: string };
      const pkgName = pkg.name || '';
      const matches = serviceNameMatchesPackage(req.serviceName, pkgName);
      recommended.push({
        name: 'service_name_matches',
        passed: matches,
        message: matches
          ? `package.json name "${pkgName}" matches service "${req.serviceName}"`
          : `package.json name "${pkgName}" does not match service "${req.serviceName}"`,
      });
    } catch (err) {
      recommended.push({
        name: 'service_name_matches',
        passed: false,
        message: `package.json is not valid JSON: ${(err as Error).message}`,
      });
    }
  }

  // ---- aggregate ------------------------------------------------------
  const requiredBucket = bucketize(required);
  const recommendedBucket = bucketize(recommended);

  let score = 0;
  for (const check of [...required, ...recommended]) {
    if (check.passed) {
      score += POINT_WEIGHTS[check.name] ?? 0;
    }
  }

  let overall_status: ComplianceCheck['overall_status'];
  let badge: ComplianceCheck['badge'];
  if (requiredBucket.fail > 0) {
    overall_status = 'non_compliant';
    badge = 'red';
  } else if (recommendedBucket.fail > 0) {
    overall_status = 'compliant_with_warnings';
    badge = 'yellow';
  } else {
    overall_status = 'compliant';
    badge = 'green';
  }

  return {
    required: requiredBucket,
    recommended: recommendedBucket,
    optional: { pass: 0, fail: 0, checks: [] },
    overall_status,
    badge,
    score,
    evidence: {
      repo: `${owner}/${repo}`,
      branch,
      fetched_at: new Date().toISOString(),
    },
  };
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

export function parseRepoUrl(url: string): { owner: string; repo: string } {
  if (!url || typeof url !== 'string') {
    throw new Error('repoUrl is required');
  }
  const cleaned = url
    .trim()
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\.git$/, '')
    .replace(/^\/+|\/+$/g, '');
  const parts = cleaned.split('/');
  if (parts.length < 2 || !parts[0] || !parts[1]) {
    throw new Error(`Invalid repo URL: "${url}". Expected "OWNER/repo" or GitHub URL.`);
  }
  return { owner: parts[0], repo: parts[1] };
}

async function fetchRaw(
  rawHost: string,
  owner: string,
  repo: string,
  branch: string,
  path: string,
  opts: ValidatorOptions
): Promise<string | null> {
  const url = `${rawHost}/${owner}/${repo}/${branch}/${path}`;
  const headers: Record<string, string> = {
    'User-Agent': 'chittyschema-validator/1.0',
    Accept: 'text/plain, application/json, */*',
  };
  if (opts.githubToken) {
    headers.Authorization = `Bearer ${opts.githubToken}`;
  }

  const res = await fetch(url, { headers });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(
      `GitHub raw fetch failed for ${owner}/${repo}@${branch}/${path}: ${res.status} ${res.statusText}`
    );
  }
  return await res.text();
}

function bucketize(checks: ComplianceItem[]): ComplianceBucket {
  const pass = checks.filter((c) => c.passed).length;
  return { pass, fail: checks.length - pass, checks };
}

/**
 * Accepts a service name match if any of the following hold:
 *   pkg.name === serviceName                   (exact)
 *   pkg.name === "@chittyos/<serviceName>"     (foundation/os scoped)
 *   pkg.name === "@chittyfoundation/<svc>"     (foundation scoped)
 *   pkg.name === "@chittyapps/<serviceName>"   (apps scoped)
 *   pkg.name endsWith "/<serviceName>"         (any other scope)
 */
export function serviceNameMatchesPackage(serviceName: string, pkgName: string): boolean {
  if (!pkgName) return false;
  if (pkgName === serviceName) return true;
  const scoped = [
    `@chittyos/${serviceName}`,
    `@chittyfoundation/${serviceName}`,
    `@chittyapps/${serviceName}`,
  ];
  if (scoped.includes(pkgName)) return true;
  return pkgName.endsWith(`/${serviceName}`);
}
