/**
 * Foundational Entity Types (Public Schema)
 *
 * The 5 fundamental entity types that form the basis of ChittyLedger:
 * - People (PEO) - Individuals, organizations, legal entities
 * - Places (PLACE) - Locations, jurisdictions, venues
 * - Things (PROP) - Assets, property, documents, evidence
 * - Events (EVNT) - Occurrences, transactions, hearings
 * - Authorities (AUTH) - Laws, regulations, case law, orders
 *
 * Plus event sourcing infrastructure for complete audit trail
 */

// The 5 Foundational Entities
export * from './people';
export * from './places';
export * from './things';
export * from './events';
export * from './authorities';

// Event Sourcing Infrastructure
export * from './event-store';

// Re-export for convenience
export type {
  People,
  PeopleInsert,
  PeopleUpdate,
  PeopleQueryOptions,
} from './people';

export type {
  Places,
  PlacesInsert,
  PlacesUpdate,
} from './places';

export type {
  Things,
  ThingsInsert,
  ThingsUpdate,
} from './things';

export type {
  Events,
  EventsInsert,
  EventsUpdate,
  EventsQueryOptions,
} from './events';

export type {
  Authorities,
  AuthoritiesInsert,
  AuthoritiesUpdate,
  AuthoritiesQueryOptions,
} from './authorities';

export type {
  EventStore,
  EventStoreInsert,
  EventStoreQueryOptions,
  EventReplayOptions,
} from './event-store';
