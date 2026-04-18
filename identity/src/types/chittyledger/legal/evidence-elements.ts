/**
 * Evidence-Elements Linkage (legal.evidence_elements)
 * Schema: legal.evidence_elements
 *
 * Many-to-many relationship linking evidence to claim elements
 * Shows which evidence proves which elements
 */

export type EvidenceRelevance =
  | 'directly_proves'
  | 'supports'
  | 'weakly_supports'
  | 'contradicts'
  | 'weakly_contradicts'
  | 'neutral';

/**
 * Evidence-Elements Linkage - connects evidence to claim elements
 */
export interface EvidenceElement {
  // Primary Identification
  id: string; // UUID primary key

  // Linkage
  evidence_id: string; // Foreign key to evidence.items.id
  element_id: string; // Foreign key to legal.claim_elements.id

  // Relationship Assessment
  relevance: EvidenceRelevance;
  weight: number; // 0-100 score of how much this evidence proves element
  confidence: number; // 0-100 confidence in this assessment

  // Analysis
  explanation: string | null; // How this evidence relates to element
  key_quote: string | null; // Key quote or excerpt from evidence
  page_reference: string | null; // Where in evidence this is found

  // Opposition
  opposing_interpretation: string | null; // How opposition might interpret
  rebuttal: string | null; // Our rebuttal to opposing interpretation

  // Usage
  used_in_brief: boolean; // Whether cited in legal brief
  used_in_motion: boolean; // Whether used in motion
  used_at_trial: boolean; // Whether introduced at trial

  // Metadata
  metadata: Record<string, unknown> | null;
  notes: string | null;

  // Audit Timestamps
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export type EvidenceElementInsert = Omit<
  EvidenceElement,
  'id' | 'created_at' | 'updated_at'
> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type EvidenceElementUpdate = Partial<
  Omit<EvidenceElement, 'id' | 'evidence_id' | 'element_id' | 'created_at' | 'created_by'>
>;

/**
 * Query options for evidence-element linkages
 */
export interface EvidenceElementQueryOptions {
  evidence_id?: string;
  element_id?: string;
  relevance?: EvidenceRelevance | EvidenceRelevance[];
  min_weight?: number;
  min_confidence?: number;
  used_in_brief?: boolean;
  used_in_motion?: boolean;
  used_at_trial?: boolean;
}

/**
 * Element evidence summary
 */
export interface ElementEvidenceSummary {
  element_id: string;
  element_name: string;
  total_evidence: number;
  directly_proving: number;
  supporting: number;
  contradicting: number;
  strongest_evidence: Array<{
    evidence_id: string;
    evidence_title: string;
    relevance: EvidenceRelevance;
    weight: number;
    confidence: number;
  }>;
  overall_strength: number; // Calculated overall strength (0-100)
}

/**
 * Evidence coverage matrix
 */
export interface EvidenceCoverageMatrix {
  claim_id: string;
  claim_name: string;
  elements: Array<{
    element_id: string;
    element_name: string;
    evidence_count: number;
    coverage_score: number; // 0-100
    gaps: string[]; // Identified gaps in evidence
  }>;
  overall_coverage: number; // 0-100
}
