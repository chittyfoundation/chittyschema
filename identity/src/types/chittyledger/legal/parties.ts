/**
 * Case Parties (legal.parties)
 * Schema: legal.parties
 *
 * Many-to-many relationship between cases and people
 * Tracks party roles in each case
 */

export type PartyRole =
  | 'PLAINTIFF'
  | 'DEFENDANT'
  | 'PETITIONER'
  | 'RESPONDENT'
  | 'APPELLANT'
  | 'APPELLEE'
  | 'CLAIMANT'
  | 'INTERVENOR'
  | 'THIRD_PARTY_DEFENDANT'
  | 'WITNESS'
  | 'EXPERT_WITNESS'
  | 'INTERESTED_PARTY'
  | 'AMICUS_CURIAE'
  | 'OTHER';

export type PartyStatus =
  | 'active'
  | 'dismissed'
  | 'settled'
  | 'deceased'
  | 'withdrew'
  | 'substituted';

export type RepresentationType =
  | 'self_represented'
  | 'represented_by_counsel'
  | 'public_defender'
  | 'guardian_ad_litem';

/**
 * Case Parties - links people to cases with roles
 */
export interface CaseParty {
  // Primary Identification
  id: string; // UUID primary key

  // Linkage
  case_id: string; // Foreign key to legal.cases.id
  person_id: string; // Foreign key to people.id

  // Role
  party_role: PartyRole;
  party_number: number | null; // e.g., Defendant #1, #2, etc.
  is_primary: boolean; // Main party vs. additional parties

  // Status
  status: PartyStatus;
  date_added: string; // ISO 8601 date
  date_removed: string | null; // ISO 8601 date

  // Representation
  representation_type: RepresentationType;
  attorney_id: string | null; // Foreign key to people.id
  attorney_name: string | null; // Cached attorney name
  law_firm: string | null;

  // Contact Preferences
  service_address: string | null;
  email: string | null;
  phone: string | null;
  preferred_contact_method: string | null;

  // Insurance
  insurance_carrier: string | null;
  policy_number: string | null;
  claim_number: string | null;
  insurance_adjuster_id: string | null; // Foreign key to people.id

  // Settlement Authority
  settlement_authority_amount: number | null; // Decimal
  settlement_authority_notes: string | null;

  // Allegations/Defenses
  allegations_against: string | null; // What this party is accused of
  defenses_asserted: string[] | null; // Array of defenses
  counterclaims_filed: boolean;

  // Financial
  damages_claimed: number | null; // Decimal
  damages_awarded: number | null; // Decimal
  currency: string | null; // ISO 4217 currency code

  // Discovery
  discovery_responses_complete: boolean;
  interrogatories_answered: boolean;
  document_production_complete: boolean;
  deposition_completed: boolean;
  deposition_date: string | null; // ISO 8601 date

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

export type CasePartyInsert = Omit<
  CaseParty,
  'id' | 'created_at' | 'updated_at'
> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type CasePartyUpdate = Partial<
  Omit<CaseParty, 'id' | 'case_id' | 'person_id' | 'created_at' | 'created_by'>
>;

/**
 * Query options for party searches
 */
export interface CasePartyQueryOptions {
  case_id?: string;
  person_id?: string;
  party_role?: PartyRole | PartyRole[];
  status?: PartyStatus | PartyStatus[];
  is_primary?: boolean;
  representation_type?: RepresentationType;
  attorney_id?: string;
  has_counterclaims?: boolean;
  deposition_completed?: boolean;
  tags?: string[];
}
