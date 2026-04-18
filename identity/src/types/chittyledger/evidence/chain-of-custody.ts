/**
 * Chain of Custody (evidence.chain_of_custody)
 * Schema: evidence.chain_of_custody
 *
 * Tracks custody transfers for evidence integrity
 * Critical for maintaining admissibility in court
 */

export type CustodyEventType =
  | 'COLLECTED'
  | 'RECEIVED'
  | 'TRANSFERRED'
  | 'ANALYZED'
  | 'STORED'
  | 'RETRIEVED'
  | 'RETURNED'
  | 'SEALED'
  | 'UNSEALED'
  | 'PHOTOGRAPHED'
  | 'COPIED'
  | 'DESTROYED';

export type CustodyStatus =
  | 'in_custody'
  | 'transferred'
  | 'sealed'
  | 'destroyed';

/**
 * Chain of Custody - complete custody history for evidence
 */
export interface ChainOfCustody {
  // Primary Identification
  id: string; // UUID primary key

  // Evidence Reference
  evidence_id: string; // Foreign key to evidence.items.id

  // Custody Event
  event_type: CustodyEventType;
  event_date: string; // ISO 8601 timestamp

  // Custodian Information
  from_custodian_id: string | null; // Foreign key to people.id (previous custodian)
  to_custodian_id: string; // Foreign key to people.id (new custodian)
  from_custodian_name: string | null; // Cached name for historical record
  to_custodian_name: string; // Cached name for historical record

  // Location
  location_id: string | null; // Foreign key to places.id
  location_description: string | null; // Free-text location

  // Transfer Details
  reason: string; // Reason for transfer/event
  method: string | null; // How transfer occurred (hand-delivery, mail, etc.)
  tracking_number: string | null; // Shipping/courier tracking number

  // Condition & Integrity
  condition_before: string | null; // Description of condition before event
  condition_after: string; // Description of condition after event
  seal_number: string | null; // Evidence seal/tamper-evident number
  seal_intact: boolean | null; // Whether seal was intact

  // Verification
  witness_ids: string[] | null; // Array of people.id UUIDs who witnessed transfer
  signature: string | null; // Digital signature or signature image URL
  verified_at: string | null; // ISO 8601 timestamp
  verified_by: string | null; // Verifier ChittyID

  // Status
  status: CustodyStatus;

  // Documentation
  photos: string[] | null; // Array of photo URLs
  documents: string[] | null; // Array of document URLs/IDs
  notes: string | null;

  // Metadata
  metadata: Record<string, unknown> | null;

  // Audit Timestamps
  created_at: string;
  updated_at: string;
  created_by: string | null; // User ChittyID
  updated_by: string | null;
}

export type ChainOfCustodyInsert = Omit<
  ChainOfCustody,
  'id' | 'created_at' | 'updated_at'
> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type ChainOfCustodyUpdate = Partial<
  Omit<ChainOfCustody, 'id' | 'evidence_id' | 'created_at' | 'created_by'>
>;

/**
 * Query options for chain of custody
 */
export interface ChainOfCustodyQueryOptions {
  evidence_id?: string;
  event_type?: CustodyEventType | CustodyEventType[];
  custodian_id?: string; // Either from or to custodian
  location_id?: string;
  status?: CustodyStatus;
  date_range?: {
    start: string; // ISO 8601 timestamp
    end: string;
  };
  seal_intact?: boolean;
  order?: 'ASC' | 'DESC'; // By event_date
}

/**
 * Custody chain validation result
 */
export interface CustodyChainValidation {
  is_valid: boolean;
  breaks: Array<{
    between_event_id_1: string;
    between_event_id_2: string;
    issue: string;
    severity: 'warning' | 'error';
  }>;
  warnings: string[];
  complete_chain: ChainOfCustody[];
}
