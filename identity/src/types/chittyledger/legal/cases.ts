/**
 * Legal Cases (legal.cases)
 * Schema: legal.cases (16 columns)
 *
 * Core case tracking with ChittyID integration
 * Protected by row-level security for attorney/paralegal access
 */

export type CaseStatus =
  | 'active'
  | 'closed'
  | 'archived'
  | 'pending'
  | 'on_hold';

export type CaseType =
  | 'CIVIL'
  | 'CRIMINAL'
  | 'FAMILY'
  | 'PROBATE'
  | 'BANKRUPTCY'
  | 'ADMINISTRATIVE'
  | 'APPELLATE'
  | 'OTHER';

/**
 * Legal Cases - core case management
 */
export interface LegalCase {
  // Primary Identification
  id: string; // UUID primary key
  case_chitty_id: string; // ChittyID for the case
  case_number: string; // Court-assigned case number
  title: string; // Case caption/title

  // Classification
  case_type: CaseType;
  status: CaseStatus;

  // Court Information
  court: string | null; // Court name
  court_id: string | null; // Foreign key to places.id
  judge: string | null; // Judge name
  judge_id: string | null; // Foreign key to people.id

  // Dates
  filed_date: string | null; // ISO 8601 date
  close_date: string | null; // ISO 8601 date

  // Team Members (ChittyIDs)
  attorney_chitty_id: string | null; // Lead attorney ChittyID
  paralegal_chitty_id: string | null; // Assigned paralegal ChittyID
  client_chitty_id: string | null; // Client ChittyID

  // Opposing Party
  opposing_party: string | null; // Name or description
  opposing_party_id: string | null; // Foreign key to people.id
  opposing_counsel: string | null;
  opposing_counsel_id: string | null; // Foreign key to people.id

  // Case Details
  description: string | null;
  case_summary: string | null;
  legal_issues: string[] | null; // Array of legal issues
  relief_sought: string | null; // What we're asking for

  // Financial
  amount_in_controversy: number | null; // Decimal
  settlement_amount: number | null; // Decimal
  currency: string | null; // ISO 4217 currency code

  // Metadata
  metadata: Record<string, unknown> | null; // JSONB for flexible attributes
  tags: string[] | null;
  notes: string | null;

  // Audit Timestamps
  created_at: string;
  updated_at: string;
  created_by: string | null; // User ChittyID
  updated_by: string | null;
}

export type LegalCaseInsert = Omit<
  LegalCase,
  'id' | 'created_at' | 'updated_at'
> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type LegalCaseUpdate = Partial<
  Omit<LegalCase, 'id' | 'case_chitty_id' | 'created_at' | 'created_by'>
>;

/**
 * Query options for case searches
 */
export interface LegalCaseQueryOptions {
  case_chitty_id?: string;
  case_number?: string;
  case_type?: CaseType | CaseType[];
  status?: CaseStatus | CaseStatus[];
  attorney_chitty_id?: string;
  paralegal_chitty_id?: string;
  client_chitty_id?: string;
  court?: string;
  court_id?: string;
  judge?: string;
  filed_date_range?: {
    start: string; // ISO 8601 date
    end: string;
  };
  tags?: string[];
  search_text?: string; // Full-text search
}

/**
 * Case statistics
 */
export interface CaseStatistics {
  case_id: string;
  total_evidence: number;
  total_claims: number;
  total_filings: number;
  total_deadlines: number;
  upcoming_deadlines: number;
  overdue_deadlines: number;
  total_parties: number;
  status_summary: {
    evidence_admissible: number;
    evidence_questionable: number;
    evidence_excludable: number;
  };
}
