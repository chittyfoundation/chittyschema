/**
 * Evidence Items (evidence.items)
 * Schema: evidence.items (27 columns)
 *
 * Core evidence tracking with legal analysis
 * Includes admissibility analysis, hearsay status, party impact, scoring
 * Protected by row-level security policies
 */

export type Admissibility =
  | 'Likely Admissible'
  | 'Questionable'
  | 'Likely Excludable';

export type HearsayStatus =
  | 'Non-hearsay'
  | 'Exception'
  | 'Objection';

export type PartyImpact =
  | 'Respondent'
  | 'Plaintiff'
  | 'Both'
  | 'Unknown';

export type EvidencePurpose =
  | 'Substantive'
  | 'Impeachment'
  | '404(b)/Character'
  | 'Foundation/Authentication';

export type StrengthTag =
  | 'Pro'
  | 'Con'
  | 'Neutral';

/**
 * Evidence Items - court-admissible evidence with legal analysis
 */
export interface EvidenceItems {
  // Primary Identification
  id: string; // UUID primary key
  chitty_id: string; // ChittyID for evidence item

  // Case Linkage
  case_id: string; // Foreign key to legal.cases.id

  // Evidence Classification
  tier: string; // Evidence tier (GOVERNMENT, BUSINESS_RECORDS, etc.)
  weight: number; // Calculated weight based on tier and scores (0-100)
  type: string; // Evidence type (Document, Photo, Video, Testimony, etc.)

  // Description
  title: string;
  description: string | null;
  location_in_source: string | null; // Page number, timestamp, etc.

  // Legal Analysis
  admissibility: Admissibility;
  hearsay_status: HearsayStatus;
  party_impact: PartyImpact;
  purpose: EvidencePurpose;
  strength_tag: StrengthTag;

  // Scoring (0-100)
  support_score: number; // How much this supports case theory
  confidence_score: number; // Confidence in evidence reliability

  // Content
  summary: string | null;
  key_facts: string[] | null; // Array of extracted facts
  notes: string | null;

  // Chain of Custody
  chain_of_custody_id: string | null; // Foreign key to evidence.chain_of_custody.id

  // Legal Protections
  privileged: boolean; // Attorney-client privileged
  work_product: boolean; // Attorney work product

  // File Information
  file_path: string | null; // Storage path or URL
  file_hash: string | null; // SHA-256 hash for integrity
  file_size: number | null; // Bytes
  mime_type: string | null;

  // Metadata
  metadata: Record<string, unknown> | null; // JSONB for flexible attributes
  tags: string[] | null;

  // Audit Timestamps
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
  created_by: string | null; // User ChittyID
  updated_by: string | null; // User ChittyID
}

/**
 * Insert type for evidence items
 * weight is auto-calculated by trigger
 */
export type EvidenceItemsInsert = Omit<
  EvidenceItems,
  'id' | 'weight' | 'created_at' | 'updated_at'
> & {
  id?: string;
  weight?: number; // Usually omitted, calculated by trigger
  created_at?: string;
  updated_at?: string;
};

/**
 * Update type for evidence items
 */
export type EvidenceItemsUpdate = Partial<
  Omit<EvidenceItems, 'id' | 'chitty_id' | 'created_at' | 'created_by'>
>;

/**
 * Query options for evidence searches
 */
export interface EvidenceItemsQueryOptions {
  case_id?: string;
  admissibility?: Admissibility | Admissibility[];
  hearsay_status?: HearsayStatus | HearsayStatus[];
  party_impact?: PartyImpact;
  purpose?: EvidencePurpose;
  strength_tag?: StrengthTag;
  min_support_score?: number;
  min_confidence_score?: number;
  min_weight?: number;
  privileged?: boolean;
  work_product?: boolean;
  tags?: string[];
  search_text?: string; // Full-text search
}

/**
 * Evidence scoring constraints (enforced by database)
 */
export const EVIDENCE_SCORE_CONSTRAINTS = {
  MIN: 0,
  MAX: 100,
} as const;

/**
 * Admissibility values (enforced by CHECK constraint)
 */
export const ADMISSIBILITY_VALUES: readonly Admissibility[] = [
  'Likely Admissible',
  'Questionable',
  'Likely Excludable',
] as const;

/**
 * Hearsay status values (enforced by CHECK constraint)
 */
export const HEARSAY_STATUS_VALUES: readonly HearsayStatus[] = [
  'Non-hearsay',
  'Exception',
  'Objection',
] as const;
