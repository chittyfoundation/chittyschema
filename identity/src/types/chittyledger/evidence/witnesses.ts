/**
 * Witnesses (evidence.witnesses)
 * Schema: evidence.witnesses
 *
 * Tracks witnesses per case
 * Links to people table for witness entities
 */

export type WitnessType =
  | 'FACT'
  | 'EXPERT'
  | 'CHARACTER'
  | 'REBUTTAL'
  | 'IMPEACHMENT';

export type WitnessStatus =
  | 'potential'
  | 'identified'
  | 'contacted'
  | 'willing'
  | 'subpoenaed'
  | 'deposed'
  | 'testified'
  | 'declined'
  | 'unavailable';

export type WitnessReliability =
  | 'high'
  | 'medium'
  | 'low'
  | 'unknown';

export type WitnessBias =
  | 'favorable'
  | 'neutral'
  | 'adverse'
  | 'unknown';

/**
 * Witnesses - witness tracking per case
 */
export interface Witnesses {
  // Primary Identification
  id: string; // UUID primary key

  // Case & Person Linkage
  case_id: string; // Foreign key to legal.cases.id
  person_id: string; // Foreign key to people.id

  // Witness Classification
  witness_type: WitnessType;
  status: WitnessStatus;

  // Assessment
  reliability: WitnessReliability;
  bias: WitnessBias;
  credibility_score: number | null; // 0-100 score

  // Testimony Details
  testimony_summary: string | null;
  key_facts: string[] | null; // Array of facts this witness can testify to
  expected_testimony: string | null; // What we expect them to say
  areas_of_knowledge: string[] | null; // Topics they have knowledge of

  // Expert Witness Information (if applicable)
  is_expert: boolean;
  expertise_areas: string[] | null;
  qualifications: string | null;
  cv_url: string | null; // URL to CV/resume
  expert_report_url: string | null;
  hourly_rate: number | null; // Expert witness fee

  // Contact & Availability
  preferred_contact_method: string | null;
  availability_notes: string | null;
  willing_to_testify: boolean | null;

  // Legal Process
  subpoena_issued: boolean;
  subpoena_date: string | null; // ISO 8601 date
  subpoena_served: boolean;
  subpoena_served_date: string | null;
  deposition_date: string | null; // ISO 8601 date
  deposition_transcript_id: string | null; // Foreign key to things.id
  trial_testimony_date: string | null; // ISO 8601 date

  // Related Evidence
  related_evidence_ids: string[] | null; // Array of evidence.items.id UUIDs
  introduced_evidence_ids: string[] | null; // Evidence introduced through this witness

  // Impeachment
  impeachment_material: string | null;
  prior_inconsistent_statements: string[] | null;
  credibility_issues: string[] | null;

  // Preparation
  prep_sessions: number | null; // Number of prep sessions conducted
  last_prep_date: string | null; // ISO 8601 date
  prep_notes: string | null;

  // Metadata
  metadata: Record<string, unknown> | null;
  tags: string[] | null;
  notes: string | null;

  // Audit Timestamps
  created_at: string;
  updated_at: string;
  created_by: string | null; // User ChittyID
  updated_by: string | null;
}

export type WitnessesInsert = Omit<
  Witnesses,
  'id' | 'created_at' | 'updated_at'
> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type WitnessesUpdate = Partial<
  Omit<Witnesses, 'id' | 'case_id' | 'person_id' | 'created_at' | 'created_by'>
>;

/**
 * Query options for witness searches
 */
export interface WitnessesQueryOptions {
  case_id?: string;
  person_id?: string;
  witness_type?: WitnessType | WitnessType[];
  status?: WitnessStatus | WitnessStatus[];
  reliability?: WitnessReliability;
  bias?: WitnessBias;
  is_expert?: boolean;
  subpoena_issued?: boolean;
  deposition_completed?: boolean; // Has deposition_date
  testified?: boolean; // Has trial_testimony_date
  min_credibility_score?: number;
  tags?: string[];
  search_text?: string;
}

/**
 * Witness preparation tracking
 */
export interface WitnessPreparation {
  witness_id: string;
  session_date: string; // ISO 8601 timestamp
  duration_minutes: number;
  topics_covered: string[];
  concerns: string[];
  next_steps: string[];
  prepared_by: string; // Attorney ChittyID
  notes: string | null;
}
