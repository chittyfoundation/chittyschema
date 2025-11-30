/**
 * Places (PLACE) - Foundational Entity Type
 * Schema: public.places
 *
 * Represents locations, jurisdictions, venues, and geographic data
 * Used for court locations, addresses, incorporation jurisdictions, etc.
 */

export type PlaceType =
  | 'ADDRESS'
  | 'CITY'
  | 'COUNTY'
  | 'STATE'
  | 'COUNTRY'
  | 'COURT_VENUE'
  | 'JURISDICTION'
  | 'PROPERTY'
  | 'BUSINESS_LOCATION'
  | 'OTHER';

export type JurisdictionType =
  | 'FEDERAL'
  | 'STATE'
  | 'COUNTY'
  | 'MUNICIPAL'
  | 'TRIBAL'
  | 'INTERNATIONAL';

/**
 * Places entity - represents any geographic location or jurisdiction
 */
export interface Places {
  // Primary Identification
  id: string; // UUID primary key
  chitty_id: string; // ChittyID for the place
  place_type: PlaceType;

  // Location Details
  name: string; // Official name of the place
  full_address: string | null;
  street_address: string | null;
  city: string | null;
  county: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;

  // Geographic Coordinates
  latitude: number | null;
  longitude: number | null;
  elevation: number | null; // Meters above sea level

  // Jurisdiction Information
  jurisdiction_type: JurisdictionType | null;
  jurisdiction_code: string | null; // FIPS code, ISO code, etc.
  parent_jurisdiction_id: string | null; // Foreign key to places.id

  // Court-Specific Information
  court_name: string | null;
  court_type: string | null; // e.g., 'District', 'Circuit', 'Supreme'
  court_level: string | null; // e.g., 'Federal', 'State', 'Municipal'

  // Temporal Versioning
  valid_from: string; // ISO 8601 timestamp
  valid_to: string; // ISO 8601 timestamp, defaults to 'infinity'
  version_number: number;

  // Metadata
  metadata: Record<string, unknown> | null; // JSONB for additional attributes
  notes: string | null;

  // Audit Timestamps
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export type PlacesInsert = Omit<
  Places,
  'id' | 'created_at' | 'updated_at' | 'valid_from' | 'valid_to' | 'version_number'
> & {
  id?: string;
  valid_from?: string;
  valid_to?: string;
  version_number?: number;
  created_at?: string;
  updated_at?: string;
};

export type PlacesUpdate = Partial<Omit<Places, 'id' | 'chitty_id' | 'created_at' | 'created_by'>>;
