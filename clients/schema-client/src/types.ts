/**
 * @canon chittycanon://core/services/chittyschema#client-types
 * Matches the response shape of POST /api/registry/validate/:serviceName
 * served by schema.chitty.cc (see connectivity/api/lib/registration-validator.ts).
 */

export type AttachMode = 'warn' | 'enforce' | 'autocorrect';
export type OverallStatus = 'compliant' | 'compliant_with_warnings' | 'non_compliant';
export type Badge = 'green' | 'yellow' | 'red';

export interface AttachOptions {
  serviceName: string;
  serviceVersion: string;
  repoUrl?: string;
  branch?: string;
  registry?: string;
  mode?: AttachMode;
  pollIntervalMs?: number;
  serviceToken?: string;
  onDrift?: (event: DriftEvent) => void;
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
  overall_status: OverallStatus;
  badge: Badge;
  score: number;
  evidence: {
    repo: string;
    branch: string;
    commit_sha?: string;
    fetched_at: string;
    version?: string;
  };
}

/** Envelope returned by POST /api/registry/validate/:serviceName */
export interface ValidateResponse {
  service: string;
  validation: ComplianceCheck;
  badge_markdown: string;
  badge_color: Badge;
  recommendations: string[];
}

export interface DriftEvent {
  serviceName: string;
  bundledVersion: string;
  liveVersion: string;
  detectedAt: string;
  response: ValidateResponse;
}

export interface AttachedSchema {
  serviceName: string;
  bundledVersion: string;
  liveVersion: string;
  response: ValidateResponse;
  refresh(): Promise<ValidateResponse>;
  stop(): void;
}
