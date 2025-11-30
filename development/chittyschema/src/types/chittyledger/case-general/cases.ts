/**
 * General Cases (case_general.cases)
 * Schema: case_general.cases
 *
 * Catch-all repository for cases not requiring specialized schemas
 * Simpler structure for standard cases
 */

export type GeneralCaseStatus =
  | 'open'
  | 'active'
  | 'pending'
  | 'closed'
  | 'archived';

export type GeneralCaseType =
  | 'CIVIL'
  | 'CRIMINAL'
  | 'FAMILY'
  | 'PROBATE'
  | 'BANKRUPTCY'
  | 'ADMINISTRATIVE'
  | 'SMALL_CLAIMS'
  | 'TRAFFIC'
  | 'OTHER';

/**
 * General Cases - standard case repository
 */
export interface GeneralCase {
  // Primary Identification
  id: string; // UUID primary key
  case_number: string; // Internal or court case number

  // Basic Information
  case_type: GeneralCaseType;
  title: string;
  description: string | null;

  // Status
  status: GeneralCaseStatus;
  opened_date: string; // ISO 8601 date
  closed_date: string | null; // ISO 8601 date

  // Court Information
  court_name: string | null;
  judge_name: string | null;
  jurisdiction: string | null;

  // Parties (simplified)
  client_name: string | null;
  client_id: string | null; // Foreign key to people.id
  opposing_party_name: string | null;
  opposing_party_id: string | null; // Foreign key to people.id

  // Assignment
  assigned_attorney: string | null;
  assigned_attorney_id: string | null; // Foreign key to people.id
  assigned_paralegal: string | null;
  assigned_paralegal_id: string | null; // Foreign key to people.id

  // Financial
  amount_in_dispute: number | null; // Decimal
  settlement_amount: number | null; // Decimal
  fees_billed: number | null; // Decimal
  currency: string | null; // ISO 4217 currency code

  // Important Dates
  statute_of_limitations: string | null; // ISO 8601 date
  next_hearing_date: string | null; // ISO 8601 date
  trial_date: string | null; // ISO 8601 date

  // Case Summary
  summary: string | null;
  outcome: string | null;
  lessons_learned: string | null;

  // Metadata
  metadata: Record<string, unknown> | null; // JSONB for flexible attributes
  tags: string[] | null;
  notes: string | null;

  // Audit Timestamps
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export type GeneralCaseInsert = Omit<
  GeneralCase,
  'id' | 'created_at' | 'updated_at'
> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type GeneralCaseUpdate = Partial<
  Omit<GeneralCase, 'id' | 'case_number' | 'created_at' | 'created_by'>
>;

/**
 * Query options for general case searches
 */
export interface GeneralCaseQueryOptions {
  case_number?: string;
  case_type?: GeneralCaseType | GeneralCaseType[];
  status?: GeneralCaseStatus | GeneralCaseStatus[];
  assigned_attorney_id?: string;
  assigned_paralegal_id?: string;
  client_id?: string;
  opened_date_range?: {
    start: string; // ISO 8601 date
    end: string;
  };
  tags?: string[];
  search_text?: string;
}
