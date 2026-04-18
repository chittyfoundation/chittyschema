/**
 * Authorities (AUTH) - Foundational Entity Type
 * Schema: public.authorities
 *
 * Represents legal authorities: laws, regulations, case law, court orders, precedents
 * Used for legal citations and authority references
 */

export type AuthorityType =
  | 'STATUTE'
  | 'REGULATION'
  | 'CASE_LAW'
  | 'COURT_ORDER'
  | 'ADMINISTRATIVE_ORDER'
  | 'EXECUTIVE_ORDER'
  | 'CONSTITUTION'
  | 'TREATY'
  | 'ORDINANCE'
  | 'RULE'
  | 'PRECEDENT'
  | 'LEGAL_OPINION'
  | 'OTHER';

export type AuthorityLevel =
  | 'FEDERAL'
  | 'STATE'
  | 'COUNTY'
  | 'MUNICIPAL'
  | 'TRIBAL'
  | 'INTERNATIONAL';

export type AuthorityStatus =
  | 'active'
  | 'repealed'
  | 'superseded'
  | 'overturned'
  | 'amended'
  | 'expired'
  | 'pending';

export type BindingLevel =
  | 'mandatory'
  | 'persuasive'
  | 'non_binding';

/**
 * Authorities entity - represents legal authorities and citations
 */
export interface Authorities {
  // Primary Identification
  id: string; // UUID primary key
  chitty_id: string; // ChittyID for the authority
  authority_type: AuthorityType;

  // Citation Information
  citation: string; // Formal legal citation (e.g., "42 U.S.C. § 1983")
  short_citation: string | null; // Abbreviated citation
  title: string; // Title or name of the authority
  full_title: string | null; // Complete formal title

  // Jurisdiction & Level
  authority_level: AuthorityLevel;
  jurisdiction_id: string | null; // Foreign key to places.id
  issuing_body: string | null; // Court, legislature, agency name
  issuing_authority_id: string | null; // Foreign key to people.id or places.id

  // Dates
  enactment_date: string | null; // ISO 8601 date
  effective_date: string | null; // ISO 8601 date
  expiration_date: string | null; // ISO 8601 date
  decision_date: string | null; // ISO 8601 date (for case law)

  // Content
  summary: string | null;
  full_text: string | null; // Complete text of the authority
  key_provisions: string[] | null; // Array of key sections or holdings
  holding: string | null; // Legal holding (for case law)

  // Case Law Specific
  case_name: string | null; // e.g., "Roe v. Wade"
  case_number: string | null; // Docket number
  court_name: string | null;
  judge_name: string | null;
  parties: string[] | null; // Array of party names

  // Legal Effect
  status: AuthorityStatus;
  binding_level: BindingLevel;
  precedential_value: number | null; // 0-100 score
  applicability_scope: string | null; // Description of when/where applicable

  // Relationships
  supersedes_authority_id: string | null; // Foreign key to authorities.id
  superseded_by_authority_id: string | null; // Foreign key to authorities.id
  related_authority_ids: string[] | null; // Array of authorities.id UUIDs
  cited_by_count: number | null; // Number of times cited

  // Document References
  official_url: string | null; // Official source URL
  document_id: string | null; // Foreign key to things.id
  pdf_url: string | null;

  // Temporal Versioning
  valid_from: string; // ISO 8601 timestamp
  valid_to: string; // ISO 8601 timestamp, defaults to 'infinity'
  version_number: number;

  // Metadata
  metadata: Record<string, unknown> | null; // JSONB for additional attributes
  tags: string[] | null; // e.g., ["civil rights", "employment", "discrimination"]
  topics: string[] | null; // Legal topics/areas
  notes: string | null;

  // Audit Timestamps
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export type AuthoritiesInsert = Omit<
  Authorities,
  'id' | 'created_at' | 'updated_at' | 'valid_from' | 'valid_to' | 'version_number'
> & {
  id?: string;
  valid_from?: string;
  valid_to?: string;
  version_number?: number;
  created_at?: string;
  updated_at?: string;
};

export type AuthoritiesUpdate = Partial<
  Omit<Authorities, 'id' | 'chitty_id' | 'created_at' | 'created_by'>
>;

/**
 * Query options for authority searches
 */
export interface AuthoritiesQueryOptions {
  as_of?: string; // Historical point-in-time query
  authority_type?: AuthorityType | AuthorityType[];
  authority_level?: AuthorityLevel;
  status?: AuthorityStatus;
  jurisdiction_id?: string;
  binding_level?: BindingLevel;
  tags?: string[];
  topics?: string[];
  search_text?: string; // Full-text search
}
