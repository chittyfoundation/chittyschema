/**
 * Legal Claims (legal.claims)
 * Schema: legal.claims
 *
 * Legal claims within cases (e.g., causes of action, charges, defenses)
 */

export type ClaimType =
  | 'CAUSE_OF_ACTION'
  | 'COUNTERCLAIM'
  | 'CROSSCLAIM'
  | 'DEFENSE'
  | 'AFFIRMATIVE_DEFENSE'
  | 'CHARGE'
  | 'COUNT';

export type ClaimStatus =
  | 'alleged'
  | 'proven'
  | 'disproven'
  | 'dismissed'
  | 'settled'
  | 'pending';

export type ClaimStrength =
  | 'strong'
  | 'moderate'
  | 'weak'
  | 'unknown';

/**
 * Legal Claims - causes of action, charges, defenses
 */
export interface LegalClaim {
  // Primary Identification
  id: string; // UUID primary key
  claim_id: string; // Internal claim identifier (e.g., "CLAIM-001")

  // Case Linkage
  case_id: string; // Foreign key to legal.cases.id

  // Claim Details
  claim_type: ClaimType;
  claim_name: string; // e.g., "Negligence", "Breach of Contract"
  claim_number: number | null; // Count number in complaint

  // Description
  title: string;
  description: string | null;
  legal_basis: string | null; // Statutory or common law basis
  authority_ids: string[] | null; // Array of authorities.id UUIDs

  // Assessment
  status: ClaimStatus;
  strength: ClaimStrength;
  confidence_score: number | null; // 0-100 score

  // Elements
  elements_count: number | null; // Total number of elements to prove
  elements_proven: number | null; // Number of elements proven
  elements_summary: string | null;

  // Damages/Relief
  damages_sought: number | null; // Decimal
  damages_awarded: number | null; // Decimal
  currency: string | null; // ISO 4217 currency code
  relief_description: string | null;

  // Parties
  claimant_id: string | null; // Foreign key to people.id
  respondent_id: string | null; // Foreign key to people.id

  // Evidence
  supporting_evidence_ids: string[] | null; // Array of evidence.items.id UUIDs
  contradicting_evidence_ids: string[] | null;

  // Analysis
  strengths: string[] | null; // Array of strength factors
  weaknesses: string[] | null; // Array of weakness factors
  strategy_notes: string | null;

  // Metadata
  metadata: Record<string, unknown> | null;
  tags: string[] | null;
  notes: string | null;

  // Audit Timestamps
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export type LegalClaimInsert = Omit<
  LegalClaim,
  'id' | 'created_at' | 'updated_at'
> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type LegalClaimUpdate = Partial<
  Omit<LegalClaim, 'id' | 'claim_id' | 'case_id' | 'created_at' | 'created_by'>
>;

/**
 * Query options for claim searches
 */
export interface LegalClaimQueryOptions {
  case_id?: string;
  claim_type?: ClaimType | ClaimType[];
  status?: ClaimStatus | ClaimStatus[];
  strength?: ClaimStrength;
  min_confidence_score?: number;
  claimant_id?: string;
  respondent_id?: string;
  tags?: string[];
  search_text?: string;
}
