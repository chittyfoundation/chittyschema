/**
 * Event Store - Event Sourcing Infrastructure
 * Schema: public.event_store
 *
 * Immutable audit trail with cryptographic integrity
 * Records all changes to foundational entities
 */

export type EventStoreEntityType =
  | 'PEOPLE'
  | 'PLACES'
  | 'THINGS'
  | 'EVENTS'
  | 'AUTHORITIES'
  | 'CASE'
  | 'EVIDENCE'
  | 'CLAIM'
  | 'OTHER';

export type EventStoreAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'ARCHIVE'
  | 'RESTORE'
  | 'VERSION'
  | 'VERIFY'
  | 'APPROVE'
  | 'REJECT';

/**
 * Event Store - immutable event log for complete audit trail
 */
export interface EventStore {
  // Primary Identification
  id: string; // UUID primary key
  sequence_number: number; // Auto-incrementing sequence for ordering

  // Event Details
  event_type: string; // Specific event type (e.g., "PERSON_CREATED", "EVIDENCE_UPDATED")
  action: EventStoreAction;
  entity_type: EventStoreEntityType;
  entity_id: string; // UUID of the affected entity
  entity_chitty_id: string | null; // ChittyID of the affected entity

  // Event Data
  aggregate_id: string; // Aggregate root ID for event sourcing
  aggregate_version: number; // Version of the aggregate at this event
  payload: Record<string, unknown>; // JSONB - complete event data
  previous_state: Record<string, unknown> | null; // JSONB - state before change
  new_state: Record<string, unknown> | null; // JSONB - state after change

  // Actor Information
  actor_id: string | null; // UUID of user who triggered the event
  actor_chitty_id: string | null; // ChittyID of the actor
  actor_type: string | null; // e.g., "USER", "SYSTEM", "SERVICE"

  // Context
  correlation_id: string | null; // UUID linking related events
  causation_id: string | null; // UUID of the event that caused this event
  session_id: string | null; // Session identifier
  request_id: string | null; // API request ID

  // Metadata
  metadata: Record<string, unknown> | null; // JSONB - additional context
  ip_address: string | null;
  user_agent: string | null;
  source_service: string | null; // Service that generated the event

  // Cryptographic Integrity
  event_hash: string; // SHA-256 hash of event content
  previous_event_hash: string | null; // Hash of previous event (blockchain-style chain)
  signature: string | null; // Digital signature for non-repudiation

  // Timestamps
  occurred_at: string; // ISO 8601 timestamp - when the event actually occurred
  recorded_at: string; // ISO 8601 timestamp - when recorded in event store

  // Immutability
  is_deleted: boolean; // Soft delete flag (but event itself never truly deleted)
  deleted_at: string | null; // ISO 8601 timestamp
}

/**
 * Insert type for event store
 * Most fields auto-generated or computed
 */
export type EventStoreInsert = Omit<
  EventStore,
  'id' | 'sequence_number' | 'recorded_at' | 'event_hash' | 'previous_event_hash'
> & {
  id?: string;
  sequence_number?: number;
  recorded_at?: string;
  event_hash?: string;
  previous_event_hash?: string;
};

/**
 * Query options for event store
 */
export interface EventStoreQueryOptions {
  entity_type?: EventStoreEntityType | EventStoreEntityType[];
  entity_id?: string;
  entity_chitty_id?: string;
  action?: EventStoreAction | EventStoreAction[];
  actor_id?: string;
  actor_chitty_id?: string;
  correlation_id?: string;
  causation_id?: string;
  time_range?: {
    start: string; // ISO 8601 timestamp
    end: string; // ISO 8601 timestamp
  };
  aggregate_id?: string;
  source_service?: string;
  include_deleted?: boolean;
  order?: 'ASC' | 'DESC'; // By sequence_number
  limit?: number;
  offset?: number;
}

/**
 * Event replay options for event sourcing
 */
export interface EventReplayOptions {
  aggregate_id: string;
  until_version?: number; // Replay up to specific version
  until_timestamp?: string; // Replay up to specific time (ISO 8601)
  include_snapshots?: boolean; // Use snapshots for performance
}
