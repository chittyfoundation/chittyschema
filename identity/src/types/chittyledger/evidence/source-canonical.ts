/**
 * Source Canonical (source_canonical)
 * Schema: chittyevidence / chittyledger
 * Canonical URI: chittycanon://evidence/tables/source-canonical
 *
 * Unified provenance tracking for all document ingest paths.
 * Maps: source_native_id ↔ sha256 ↔ r2_key ↔ document_chitty_id
 *
 * Every document in the system has exactly one source_canonical row per
 * ingest path (Gmail, Drive, upload, etc.). Multiple source rows can
 * share the same content_hash (dedup via content addressing).
 */

export type SourceType = 'gmail' | 'gdrive' | 'upload' | 'pipeline' | 'manual';

export type IntakeStatus = 'pending' | 'fetched' | 'hashed' | 'stored' | 'processed' | 'error';

export type ExportFormat = 'pdf_a2b' | 'xlsx' | 'pdf' | null;

/**
 * Source Canonical — unified document provenance
 */
export interface SourceCanonical {
  id: string; // UUID primary key

  // Source identification (where the document came from)
  source_type: SourceType;
  source_native_id: string;       // Gmail messageId, Drive fileId, upload batch ref
  source_account: string | null;  // email address or Drive account
  source_path: string | null;     // folder path in Drive, label in Gmail
  source_filename: string;        // original filename from source

  // Content addressing (dedup key)
  content_hash: string;           // sha256 hex of raw bytes
  content_size: number | null;    // file size in bytes
  content_type: string | null;    // MIME type

  // R2 storage location
  r2_bucket: string;              // default: 'chittyevidence-documents'
  r2_key: string;                 // sha256/{hex} canonical key

  // ChittyOS identity (assigned after intake, nullable until processing)
  document_chitty_id: string | null;  // links to evidence_documents.id
  document_type: string | null;       // classification result

  // Export metadata (for Google-native docs exported to PDF)
  export_format: ExportFormat;
  exported_at: Date | string | null;

  // Dedup tracking
  is_duplicate: boolean;
  canonical_source_id: string | null; // if duplicate, points to first source row

  // Lifecycle
  intake_status: IntakeStatus;
  intake_error: string | null;
  ingested_by: string | null;     // service/agent that performed intake
  ingested_at: Date | string;
  processed_at: Date | string | null;

  // Audit
  created_at: Date | string;
  updated_at: Date | string;
}

export type SourceCanonicalInsert = Omit<
  SourceCanonical,
  'id' | 'created_at' | 'updated_at' | 'ingested_at'
> & {
  id?: string;
  created_at?: Date | string;
  updated_at?: Date | string;
  ingested_at?: Date | string;
};

export type SourceCanonicalUpdate = Partial<
  Omit<SourceCanonical, 'id' | 'source_type' | 'source_native_id' | 'created_at'>
>;

/**
 * Query options for source canonical searches
 */
export interface SourceCanonicalQueryOptions {
  source_type?: SourceType | SourceType[];
  intake_status?: IntakeStatus | IntakeStatus[];
  content_hash?: string;
  r2_key?: string;
  document_chitty_id?: string;
  is_duplicate?: boolean;
  ingested_by?: string;
  source_account?: string;
}
