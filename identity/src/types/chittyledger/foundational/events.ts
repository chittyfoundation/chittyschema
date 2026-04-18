/**
 * Events (EVNT) - Foundational Entity Type
 * Schema: public.events (41 columns)
 *
 * Represents any occurrence: transactions, incidents, hearings, filings, meetings
 * Includes participants, locations, financial data, and legal significance
 */

export type EventType =
  | 'TRANSACTION'
  | 'INCIDENT'
  | 'HEARING'
  | 'FILING'
  | 'MEETING'
  | 'DISCOVERY'
  | 'MOTION'
  | 'SETTLEMENT'
  | 'VIOLATION'
  | 'ACQUISITION'
  | 'TRANSFER'
  | 'CONTRACT_EXECUTION'
  | 'DEPOSITION'
  | 'TRIAL'
  | 'OTHER';

export type EventStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'postponed'
  | 'disputed';

export type ConfidentialityLevel =
  | 'public'
  | 'confidential'
  | 'attorney_client_privileged'
  | 'work_product'
  | 'sealed'
  | 'restricted';

export type LegalSignificance =
  | 'high'
  | 'medium'
  | 'low'
  | 'none';

/**
 * Events entity - represents any significant occurrence
 */
export interface Events {
  // Primary Identification
  id: string; // UUID primary key
  chitty_id: string; // ChittyID for the event
  event_type: EventType;

  // Description
  title: string;
  description: string | null;
  summary: string | null;

  // Temporal Information
  start_time: string; // ISO 8601 timestamp with timezone
  end_time: string | null; // ISO 8601 timestamp with timezone
  timezone: string | null; // e.g., "America/New_York"
  duration_minutes: number | null;

  // Location
  location_id: string | null; // Foreign key to places.id
  location_description: string | null; // Free-text location details

  // Participants
  primary_person_id: string | null; // Foreign key to people.id (main actor)
  secondary_person_id: string | null; // Foreign key to people.id (other party)
  witness_ids: string[] | null; // Array of people.id UUIDs
  participant_count: number | null;

  // Related Entities
  related_case_id: string | null; // Foreign key to cases table
  related_thing_ids: string[] | null; // Array of things.id UUIDs
  related_authority_ids: string[] | null; // Array of authorities.id UUIDs

  // Financial Data
  amount: number | null; // Decimal (transaction amount, settlement, etc.)
  currency: string | null; // ISO 4217 currency code
  from_account: string | null; // Account identifier
  to_account: string | null; // Account identifier
  payment_method: string | null;

  // Legal Significance
  legal_significance: LegalSignificance;
  confidentiality_level: ConfidentialityLevel;
  is_admissible: boolean | null; // Whether event itself is admissible evidence
  statute_of_limitations_date: string | null; // ISO 8601 date

  // Status
  status: EventStatus;
  outcome: string | null; // Free-text outcome description
  ruling: string | null; // Court ruling or decision

  // Evidence & Documentation
  evidence_ids: string[] | null; // Array of evidence.items.id UUIDs
  document_ids: string[] | null; // Array of things.id UUIDs for documents
  recording_url: string | null; // Audio/video recording URL
  transcript_id: string | null; // Foreign key to things.id

  // Temporal Versioning
  valid_from: string; // ISO 8601 timestamp
  valid_to: string; // ISO 8601 timestamp, defaults to 'infinity'
  version_number: number;

  // Metadata
  metadata: Record<string, unknown> | null; // JSONB for additional attributes
  tags: string[] | null;
  notes: string | null;

  // Audit Timestamps
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export type EventsInsert = Omit<
  Events,
  'id' | 'created_at' | 'updated_at' | 'valid_from' | 'valid_to' | 'version_number'
> & {
  id?: string;
  valid_from?: string;
  valid_to?: string;
  version_number?: number;
  created_at?: string;
  updated_at?: string;
};

export type EventsUpdate = Partial<Omit<Events, 'id' | 'chitty_id' | 'created_at' | 'created_by'>>;

/**
 * Query options for event searches
 */
export interface EventsQueryOptions {
  as_of?: string; // Historical point-in-time query
  event_type?: EventType | EventType[];
  date_range?: {
    start: string; // ISO 8601 timestamp
    end: string; // ISO 8601 timestamp
  };
  participant_id?: string; // Filter by participant
  case_id?: string; // Filter by related case
  confidentiality_level?: ConfidentialityLevel;
  legal_significance?: LegalSignificance;
}
