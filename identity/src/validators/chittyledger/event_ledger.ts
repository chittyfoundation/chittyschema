import { z } from 'zod';
import { EventType, EventSeverity } from './enums.js';

/**
 * Zod validator for event_ledger table
 * Owner: chittyledger
 */
export const EventLedgerSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  event_id: z.string(),
  event_type: z.nativeEnum(EventType),
  event_severity: z.nativeEnum(EventSeverity).optional().nullable(),
  service_name: z.string(),
  user_id: z.string().uuid().optional().nullable(),
  case_id: z.string().uuid().optional().nullable(),
  action: z.string(),
  entity_type: z.string().optional().nullable(),
  entity_id: z.string().uuid().optional().nullable(),
  ip_address: z.string().ip().optional().nullable(),
  user_agent: z.string().optional().nullable(),
  request_id: z.string().optional().nullable(),
  session_id: z.string().optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
  timestamp: z.union([z.date(), z.string().datetime()]).optional().nullable(),
});

/**
 * Validator for inserting into event_ledger
 */
export const EventLedgerSchemaInsert = EventLedgerSchema.omit({
  id: true,
  timestamp: true
}).extend({
  id: z.string().uuid().optional().nullable(),
  timestamp: z.union([z.date(), z.string().datetime()]).optional().nullable()
});

/**
 * Validator for updating event_ledger
 */
export const EventLedgerSchemaUpdate = EventLedgerSchema.partial().required({ id: true });

export type EventLedger = z.infer<typeof EventLedgerSchema>;
export type EventLedgerInsert = z.infer<typeof EventLedgerSchemaInsert>;
export type EventLedgerUpdate = z.infer<typeof EventLedgerSchemaUpdate>;