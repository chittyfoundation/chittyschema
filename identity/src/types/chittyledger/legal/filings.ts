/**
 * Court Filings (legal.filings)
 * Schema: legal.filings
 *
 * Tracks all court filings and submissions
 */

export type FilingType =
  | 'COMPLAINT'
  | 'ANSWER'
  | 'MOTION'
  | 'BRIEF'
  | 'MEMORANDUM'
  | 'DECLARATION'
  | 'AFFIDAVIT'
  | 'EXHIBIT'
  | 'NOTICE'
  | 'ORDER'
  | 'JUDGMENT'
  | 'STIPULATION'
  | 'DISCOVERY_REQUEST'
  | 'DISCOVERY_RESPONSE'
  | 'SUBPOENA'
  | 'APPEAL'
  | 'OTHER';

export type FilingStatus =
  | 'draft'
  | 'ready_for_filing'
  | 'filed'
  | 'served'
  | 'stricken'
  | 'withdrawn';

export type FilingParty =
  | 'plaintiff'
  | 'defendant'
  | 'court'
  | 'third_party'
  | 'joint';

/**
 * Court Filings - all court documents and submissions
 */
export interface CourtFiling {
  // Primary Identification
  id: string; // UUID primary key
  filing_id: string; // Internal filing identifier

  // Case Linkage
  case_id: string; // Foreign key to legal.cases.id

  // Filing Details
  filing_type: FilingType;
  filing_party: FilingParty;
  title: string;
  description: string | null;

  // Filing Information
  filing_date: string | null; // ISO 8601 date
  docket_number: string | null; // Court docket entry number
  filed_by_id: string | null; // Foreign key to people.id (attorney)
  filed_by_name: string | null; // Cached name

  // Status
  status: FilingStatus;

  // Service
  service_required: boolean;
  service_date: string | null; // ISO 8601 date
  service_method: string | null; // e.g., "Email", "Mail", "Personal Service"
  served_parties: string[] | null; // Array of party names or IDs

  // Response Information
  response_deadline: string | null; // ISO 8601 date
  response_received: boolean;
  response_filing_id: string | null; // Foreign key to filings.id

  // Hearing/Motion Information
  hearing_date: string | null; // ISO 8601 date
  hearing_time: string | null; // Time of hearing
  hearing_location: string | null;
  hearing_result: string | null; // e.g., "Granted", "Denied", "Continued"

  // Court Action
  court_order_issued: boolean;
  order_date: string | null; // ISO 8601 date
  order_summary: string | null;

  // Document References
  document_id: string | null; // Foreign key to things.id
  document_url: string | null;
  document_hash: string | null; // SHA-256 hash
  page_count: number | null;

  // Related Filings
  parent_filing_id: string | null; // Foreign key to filings.id (e.g., motion this brief supports)
  related_filing_ids: string[] | null; // Array of related filings.id UUIDs

  // Evidence & Exhibits
  exhibit_numbers: string[] | null; // Array of exhibit numbers
  evidence_ids: string[] | null; // Array of evidence.items.id UUIDs

  // Fees
  filing_fee: number | null; // Decimal
  fee_waived: boolean;
  currency: string | null; // ISO 4217 currency code

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

export type CourtFilingInsert = Omit<
  CourtFiling,
  'id' | 'created_at' | 'updated_at'
> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type CourtFilingUpdate = Partial<
  Omit<CourtFiling, 'id' | 'filing_id' | 'case_id' | 'created_at' | 'created_by'>
>;

/**
 * Query options for filing searches
 */
export interface CourtFilingQueryOptions {
  case_id?: string;
  filing_type?: FilingType | FilingType[];
  filing_party?: FilingParty;
  status?: FilingStatus | FilingStatus[];
  filed_by_id?: string;
  filing_date_range?: {
    start: string; // ISO 8601 date
    end: string;
  };
  hearing_date_range?: {
    start: string;
    end: string;
  };
  response_deadline_upcoming?: boolean; // Has deadline in next 30 days
  response_overdue?: boolean; // Deadline passed, no response
  has_hearing?: boolean;
  court_order_issued?: boolean;
  tags?: string[];
  search_text?: string;
}
