/**
 * Things (PROP) - Foundational Entity Type
 * Schema: public.things
 *
 * Represents assets, property, documents, financial accounts, and evidence items
 * Covers both physical and digital things
 */

export type ThingType =
  | 'DOCUMENT'
  | 'PHYSICAL_ASSET'
  | 'DIGITAL_ASSET'
  | 'FINANCIAL_ACCOUNT'
  | 'REAL_ESTATE'
  | 'VEHICLE'
  | 'INTELLECTUAL_PROPERTY'
  | 'EVIDENCE_ITEM'
  | 'CONTRACT'
  | 'OTHER';

export type OwnershipType =
  | 'OWNED'
  | 'LEASED'
  | 'LICENSED'
  | 'BORROWED'
  | 'SEIZED'
  | 'DISPUTED'
  | 'UNKNOWN';

export type ThingStatus =
  | 'active'
  | 'inactive'
  | 'lost'
  | 'destroyed'
  | 'sold'
  | 'transferred';

/**
 * Things entity - represents any tangible or intangible asset or object
 */
export interface Things {
  // Primary Identification
  id: string; // UUID primary key
  chitty_id: string; // ChittyID for the thing
  thing_type: ThingType;

  // Description
  name: string; // Common name or title
  description: string | null;
  serial_number: string | null; // VIN, serial, document number, etc.
  model: string | null;
  manufacturer: string | null;

  // Ownership & Location
  owner_id: string | null; // Foreign key to people.id
  ownership_type: OwnershipType;
  current_location_id: string | null; // Foreign key to places.id
  custody_holder_id: string | null; // Foreign key to people.id

  // Financial Information
  acquisition_date: string | null; // ISO 8601 date
  acquisition_cost: number | null; // Decimal
  current_value: number | null; // Decimal
  currency: string | null; // ISO 4217 currency code

  // Physical Characteristics (if applicable)
  weight: number | null; // Kilograms
  dimensions: string | null; // e.g., "10x5x3 cm"
  color: string | null;
  condition: string | null; // e.g., "New", "Good", "Fair", "Poor"

  // Digital Characteristics (if applicable)
  file_hash: string | null; // SHA-256 hash for digital things
  file_size: number | null; // Bytes
  file_format: string | null; // MIME type or file extension
  storage_location: string | null; // URL, path, or storage identifier

  // Status
  status: ThingStatus;

  // Temporal Versioning
  valid_from: string; // ISO 8601 timestamp
  valid_to: string; // ISO 8601 timestamp, defaults to 'infinity'
  version_number: number;

  // Metadata
  metadata: Record<string, unknown> | null; // JSONB for additional attributes
  tags: string[] | null; // Array of tags for categorization
  notes: string | null;

  // Audit Timestamps
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export type ThingsInsert = Omit<
  Things,
  'id' | 'created_at' | 'updated_at' | 'valid_from' | 'valid_to' | 'version_number'
> & {
  id?: string;
  valid_from?: string;
  valid_to?: string;
  version_number?: number;
  created_at?: string;
  updated_at?: string;
};

export type ThingsUpdate = Partial<Omit<Things, 'id' | 'chitty_id' | 'created_at' | 'created_by'>>;
