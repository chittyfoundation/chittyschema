/**
 * General Case Documents (case_general.documents)
 * Schema: case_general.documents
 *
 * Document tracking for general cases
 */

export type GeneralDocumentType =
  | 'PLEADING'
  | 'MOTION'
  | 'BRIEF'
  | 'ORDER'
  | 'EVIDENCE'
  | 'CONTRACT'
  | 'CORRESPONDENCE'
  | 'DISCOVERY'
  | 'SETTLEMENT'
  | 'OTHER';

export type GeneralDocumentStatus =
  | 'draft'
  | 'final'
  | 'filed'
  | 'served'
  | 'archived';

/**
 * General Case Documents - document repository
 */
export interface GeneralDocument {
  // Primary Identification
  id: string; // UUID primary key
  document_id: string; // Internal document identifier

  // Case Linkage
  case_id: string; // Foreign key to case_general.cases.id

  // Document Details
  document_type: GeneralDocumentType;
  title: string;
  description: string | null;

  // Status
  status: GeneralDocumentStatus;
  version_number: number; // Document version

  // File Information
  file_path: string | null; // Storage path or URL
  file_name: string | null;
  file_hash: string | null; // SHA-256 hash
  file_size: number | null; // Bytes
  mime_type: string | null;
  page_count: number | null;

  // Dates
  document_date: string | null; // ISO 8601 date (date on document)
  created_date: string; // ISO 8601 date (when uploaded)
  filed_date: string | null; // ISO 8601 date (if filed with court)

  // Authorship
  author_name: string | null;
  author_id: string | null; // Foreign key to people.id
  prepared_by: string | null; // Attorney/paralegal who prepared
  prepared_by_id: string | null; // Foreign key to people.id

  // Related Documents
  parent_document_id: string | null; // Foreign key to documents.id
  supersedes_document_id: string | null; // Document this replaces
  related_document_ids: string[] | null; // Array of related documents.id UUIDs

  // Content
  summary: string | null;
  key_points: string[] | null;
  extracted_text: string | null; // OCR or extracted text

  // Access Control
  is_confidential: boolean;
  is_privileged: boolean;
  access_restricted: boolean;

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

export type GeneralDocumentInsert = Omit<
  GeneralDocument,
  'id' | 'created_at' | 'updated_at'
> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type GeneralDocumentUpdate = Partial<
  Omit<GeneralDocument, 'id' | 'document_id' | 'case_id' | 'created_at' | 'created_by'>
>;

/**
 * Query options for document searches
 */
export interface GeneralDocumentQueryOptions {
  case_id?: string;
  document_type?: GeneralDocumentType | GeneralDocumentType[];
  status?: GeneralDocumentStatus | GeneralDocumentStatus[];
  author_id?: string;
  prepared_by_id?: string;
  is_confidential?: boolean;
  is_privileged?: boolean;
  document_date_range?: {
    start: string; // ISO 8601 date
    end: string;
  };
  tags?: string[];
  search_text?: string; // Search title, description, extracted_text
}
