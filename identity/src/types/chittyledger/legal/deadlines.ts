/**
 * Case Deadlines (legal.deadlines)
 * Schema: legal.deadlines
 *
 * Critical deadline tracking for case management
 */

export type DeadlineType =
  | 'FILING'
  | 'DISCOVERY'
  | 'HEARING'
  | 'TRIAL'
  | 'APPEAL'
  | 'STATUTE_OF_LIMITATIONS'
  | 'RESPONSE'
  | 'MOTION'
  | 'PRODUCTION'
  | 'SUBPOENA'
  | 'SETTLEMENT_CONFERENCE'
  | 'MEDIATION'
  | 'ARBITRATION'
  | 'ADMINISTRATIVE'
  | 'OTHER';

export type DeadlineStatus =
  | 'pending'
  | 'completed'
  | 'missed'
  | 'extended'
  | 'waived'
  | 'cancelled';

export type DeadlinePriority =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low';

/**
 * Case Deadlines - critical deadline management
 */
export interface CaseDeadline {
  // Primary Identification
  id: string; // UUID primary key
  deadline_id: string; // Internal deadline identifier

  // Case Linkage
  case_id: string; // Foreign key to legal.cases.id

  // Deadline Details
  deadline_type: DeadlineType;
  title: string;
  description: string | null;

  // Date & Time
  deadline_date: string; // ISO 8601 date
  deadline_time: string | null; // Specific time if applicable
  timezone: string | null;

  // Priority & Status
  priority: DeadlinePriority;
  status: DeadlineStatus;
  is_statutory: boolean; // Whether deadline is statutory (non-negotiable)
  is_court_ordered: boolean; // Whether deadline is court-ordered

  // Completion
  completed_date: string | null; // ISO 8601 date
  completed_by_id: string | null; // Foreign key to people.id
  completion_notes: string | null;

  // Extension
  original_deadline: string | null; // Original date if extended (ISO 8601 date)
  extension_granted_date: string | null; // ISO 8601 date
  extension_reason: string | null;

  // Notifications
  reminder_days_before: number[]; // Array of days (e.g., [30, 14, 7, 1])
  last_reminder_sent: string | null; // ISO 8601 timestamp
  notify_users: string[] | null; // Array of user ChittyIDs to notify

  // Assignment
  assigned_to_id: string | null; // Foreign key to people.id
  assigned_to_name: string | null; // Cached name
  backup_assigned_to_id: string | null; // Backup person

  // Related Items
  filing_id: string | null; // Foreign key to legal.filings.id if related to filing
  claim_id: string | null; // Foreign key to legal.claims.id if related to claim
  related_deadline_ids: string[] | null; // Array of related deadlines.id UUIDs

  // Court Information
  court_order_id: string | null; // Reference to court order establishing deadline
  rule_citation: string | null; // Rule or statute citation (e.g., "FRCP 26(a)")

  // Consequences
  consequences_if_missed: string | null;
  grace_period_days: number | null;

  // Action Items
  action_required: string | null; // What needs to be done
  preparation_checklist: string[] | null; // Array of tasks
  estimated_hours: number | null; // Estimated work hours needed

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

export type CaseDeadlineInsert = Omit<
  CaseDeadline,
  'id' | 'created_at' | 'updated_at'
> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type CaseDeadlineUpdate = Partial<
  Omit<CaseDeadline, 'id' | 'deadline_id' | 'case_id' | 'created_at' | 'created_by'>
>;

/**
 * Query options for deadline searches
 */
export interface CaseDeadlineQueryOptions {
  case_id?: string;
  deadline_type?: DeadlineType | DeadlineType[];
  status?: DeadlineStatus | DeadlineStatus[];
  priority?: DeadlinePriority | DeadlinePriority[];
  assigned_to_id?: string;
  is_statutory?: boolean;
  is_court_ordered?: boolean;
  date_range?: {
    start: string; // ISO 8601 date
    end: string;
  };
  upcoming_days?: number; // Deadlines in next N days
  overdue?: boolean; // Deadline passed, status not completed
  needs_reminder?: boolean; // Should send reminder
  tags?: string[];
  search_text?: string;
}

/**
 * Deadline calendar view
 */
export interface DeadlineCalendarEntry {
  date: string; // ISO 8601 date
  deadlines: Array<{
    id: string;
    title: string;
    priority: DeadlinePriority;
    case_id: string;
    case_title: string;
    assigned_to: string | null;
  }>;
  total_count: number;
  critical_count: number;
  high_priority_count: number;
}

/**
 * Deadline dashboard statistics
 */
export interface DeadlineStatistics {
  total_deadlines: number;
  pending_deadlines: number;
  completed_deadlines: number;
  missed_deadlines: number;
  upcoming_this_week: number;
  upcoming_this_month: number;
  overdue: number;
  by_priority: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  by_type: Record<DeadlineType, number>;
}
