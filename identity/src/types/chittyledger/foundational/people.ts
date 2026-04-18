/**
 * People (PEO) - Foundational Entity Type
 * Schema: public.people (37 columns)
 *
 * Represents legal entities: individuals, organizations, government bodies
 * Includes temporal versioning, GDPR compliance, and hierarchical relationships
 */

export type EntityType =
  | 'INDIVIDUAL'
  | 'LLC'
  | 'CORP'
  | 'TRUST'
  | 'PARTNERSHIP'
  | 'GOVERNMENT'
  | 'NGO';

export type PersonStatus =
  | 'active'
  | 'inactive'
  | 'deceased'
  | 'dissolved'
  | 'suspended';

export type VerificationStatus =
  | 'unverified'
  | 'pending'
  | 'verified'
  | 'rejected'
  | 'expired';

export type GDPRLawfulBasis =
  | 'consent'
  | 'contract'
  | 'legal_obligation'
  | 'vital_interests'
  | 'public_task'
  | 'legitimate_interests';

export type GDPRConsentStatus =
  | 'not_required'
  | 'pending'
  | 'given'
  | 'withdrawn'
  | 'expired';

/**
 * People entity - represents any legal entity (person or organization)
 */
export interface People {
  // Primary Identification
  id: string; // UUID primary key
  chitty_id: string; // ChittyID in DID format (e.g., 01-C-AAA-1234-P-2511-A-X)
  legal_name: string;
  entity_type: EntityType;
  sub_type: string | null; // Additional entity classification

  // Identification Numbers
  ssn: string | null; // Social Security Number (encrypted)
  ein: string | null; // Employer Identification Number
  foreign_id: string | null; // Foreign identification numbers

  // Personal Information (for INDIVIDUAL entities)
  date_of_birth: string | null; // ISO 8601 date
  date_of_incorporation: string | null; // ISO 8601 date (for organizations)
  place_of_birth_id: string | null; // Foreign key to places table
  incorporation_place_id: string | null; // Foreign key to places table

  // Contact Information
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;

  // Hierarchical Relationships
  parent_entity_id: string | null; // Foreign key to people.id (e.g., employee -> employer)

  // Status & Verification
  status: PersonStatus;
  verification_status: VerificationStatus;
  verification_date: string | null; // ISO 8601 timestamp
  verification_method: string | null;

  // GDPR Compliance
  gdpr_lawful_basis: GDPRLawfulBasis | null;
  gdpr_consent_status: GDPRConsentStatus | null;
  gdpr_consent_date: string | null; // ISO 8601 timestamp
  gdpr_data_retention_date: string | null; // ISO 8601 date

  // Temporal Versioning (Point-in-Time Queries)
  valid_from: string; // ISO 8601 timestamp, defaults to NOW()
  valid_to: string; // ISO 8601 timestamp, defaults to 'infinity'
  version_number: number; // Increments with each version

  // Metadata
  metadata: Record<string, unknown> | null; // JSONB for flexible attributes
  notes: string | null;

  // Audit Timestamps
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
  created_by: string | null; // User ChittyID
  updated_by: string | null; // User ChittyID
}

/**
 * Insert type for creating new people records
 * Omits auto-generated and default fields
 */
export type PeopleInsert = Omit<
  People,
  'id' | 'created_at' | 'updated_at' | 'valid_from' | 'valid_to' | 'version_number'
> & {
  id?: string;
  valid_from?: string;
  valid_to?: string;
  version_number?: number;
  created_at?: string;
  updated_at?: string;
};

/**
 * Update type for modifying people records
 * All fields optional except those that should never change
 */
export type PeopleUpdate = Partial<Omit<People, 'id' | 'chitty_id' | 'created_at' | 'created_by'>>;

/**
 * Query type for point-in-time queries
 */
export interface PeopleQueryOptions {
  as_of?: string; // ISO 8601 timestamp for historical queries
  include_history?: boolean; // Include all versions
  version?: number; // Specific version number
}
