/**
 * Legal Schema (legal.*)
 *
 * Legal case management with claims, elements, parties, filings, and deadlines
 * - cases: Core case tracking with ChittyID integration
 * - claims: Legal claims (causes of action, defenses, charges)
 * - claim_elements: Individual elements to prove for each claim
 * - parties: Case parties with roles and representation
 * - filings: Court filings and documents
 * - deadlines: Critical deadline management
 * - evidence_elements: Links evidence to claim elements
 *
 * Protected by row-level security for attorney/paralegal access
 */

export * from './cases';
export * from './claims';
export * from './claim-elements';
export * from './parties';
export * from './filings';
export * from './deadlines';
export * from './evidence-elements';

// Re-export for convenience
export type {
  LegalCase,
  LegalCaseInsert,
  LegalCaseUpdate,
  LegalCaseQueryOptions,
  CaseStatus,
  CaseType,
  CaseStatistics,
} from './cases';

export type {
  LegalClaim,
  LegalClaimInsert,
  LegalClaimUpdate,
  LegalClaimQueryOptions,
  ClaimType,
  ClaimStatus,
  ClaimStrength,
} from './claims';

export type {
  ClaimElement,
  ClaimElementInsert,
  ClaimElementUpdate,
  ClaimElementQueryOptions,
  ElementStatus,
  ElementType,
  ElementProofMatrix,
} from './claim-elements';

export type {
  CaseParty,
  CasePartyInsert,
  CasePartyUpdate,
  CasePartyQueryOptions,
  PartyRole,
  PartyStatus,
  RepresentationType,
} from './parties';

export type {
  CourtFiling,
  CourtFilingInsert,
  CourtFilingUpdate,
  CourtFilingQueryOptions,
  FilingType,
  FilingStatus,
  FilingParty,
} from './filings';

export type {
  CaseDeadline,
  CaseDeadlineInsert,
  CaseDeadlineUpdate,
  CaseDeadlineQueryOptions,
  DeadlineType,
  DeadlineStatus,
  DeadlinePriority,
  DeadlineCalendarEntry,
  DeadlineStatistics,
} from './deadlines';

export type {
  EvidenceElement,
  EvidenceElementInsert,
  EvidenceElementUpdate,
  EvidenceElementQueryOptions,
  EvidenceRelevance,
  ElementEvidenceSummary,
  EvidenceCoverageMatrix,
} from './evidence-elements';
