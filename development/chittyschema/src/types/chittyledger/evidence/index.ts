/**
 * Evidence Schema (evidence.*)
 *
 * Evidence management with legal analysis and chain of custody tracking
 * - items: Core evidence with admissibility analysis, hearsay status, scoring
 * - chain_of_custody: Custody tracking for evidence integrity
 * - witnesses: Witness tracking per case
 *
 * Protected by row-level security policies for attorney/paralegal access
 */

export * from './items';
export * from './chain-of-custody';
export * from './witnesses';

// Re-export for convenience
export type {
  EvidenceItems,
  EvidenceItemsInsert,
  EvidenceItemsUpdate,
  EvidenceItemsQueryOptions,
  Admissibility,
  HearsayStatus,
  PartyImpact,
  EvidencePurpose,
  StrengthTag,
} from './items';

export type {
  ChainOfCustody,
  ChainOfCustodyInsert,
  ChainOfCustodyUpdate,
  ChainOfCustodyQueryOptions,
  CustodyEventType,
  CustodyStatus,
  CustodyChainValidation,
} from './chain-of-custody';

export type {
  Witnesses,
  WitnessesInsert,
  WitnessesUpdate,
  WitnessesQueryOptions,
  WitnessType,
  WitnessStatus,
  WitnessReliability,
  WitnessBias,
  WitnessPreparation,
} from './witnesses';
