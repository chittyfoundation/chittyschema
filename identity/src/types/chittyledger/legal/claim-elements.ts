/**
 * Claim Elements (legal.claim_elements)
 * Schema: legal.claim_elements
 *
 * Individual elements that must be proven for each claim
 * (e.g., duty, breach, causation, damages for negligence)
 */

export type ElementStatus =
  | 'not_addressed'
  | 'in_progress'
  | 'proven'
  | 'disproven'
  | 'disputed';

export type ElementType =
  | 'ESSENTIAL'
  | 'SUPPORTING'
  | 'AGGRAVATING'
  | 'MITIGATING';

/**
 * Claim Elements - individual elements to prove for each claim
 */
export interface ClaimElement {
  // Primary Identification
  id: string; // UUID primary key
  element_id: string; // Internal element identifier (e.g., "ELEM-001")

  // Claim Linkage
  claim_id: string; // Foreign key to legal.claims.id

  // Element Details
  element_type: ElementType;
  element_number: number; // Sequential number within claim
  element_name: string; // e.g., "Duty of Care", "Breach", "Causation"

  // Description
  description: string;
  legal_standard: string | null; // Legal standard that must be met
  burden_of_proof: string | null; // e.g., "Preponderance", "Clear and Convincing"

  // Status & Assessment
  status: ElementStatus;
  is_proven: boolean;
  confidence_score: number | null; // 0-100 score

  // Evidence Linkage
  supporting_evidence_ids: string[] | null; // Array of evidence.items.id UUIDs
  contradicting_evidence_ids: string[] | null;
  key_evidence_id: string | null; // Primary evidence for this element

  // Analysis
  proof_summary: string | null;
  strengths: string[] | null;
  weaknesses: string[] | null;
  opposing_arguments: string | null;
  rebuttal_arguments: string | null;

  // Authority
  authority_ids: string[] | null; // Array of authorities.id UUIDs supporting this element

  // Metadata
  metadata: Record<string, unknown> | null;
  notes: string | null;

  // Audit Timestamps
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export type ClaimElementInsert = Omit<
  ClaimElement,
  'id' | 'created_at' | 'updated_at'
> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type ClaimElementUpdate = Partial<
  Omit<ClaimElement, 'id' | 'element_id' | 'claim_id' | 'created_at' | 'created_by'>
>;

/**
 * Query options for claim element searches
 */
export interface ClaimElementQueryOptions {
  claim_id?: string;
  element_type?: ElementType | ElementType[];
  status?: ElementStatus | ElementStatus[];
  is_proven?: boolean;
  min_confidence_score?: number;
  has_supporting_evidence?: boolean;
  search_text?: string;
}

/**
 * Element proof matrix
 */
export interface ElementProofMatrix {
  claim_id: string;
  total_elements: number;
  essential_elements: number;
  proven_elements: number;
  disproven_elements: number;
  disputed_elements: number;
  overall_confidence: number; // Average confidence score
  elements: Array<{
    element_id: string;
    element_name: string;
    status: ElementStatus;
    confidence_score: number;
    evidence_count: number;
  }>;
}
