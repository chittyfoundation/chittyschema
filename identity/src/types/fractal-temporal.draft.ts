/**
 * Temporal model for the existing TY/VY/RY trinity.
 * Draft F-070 contract, NOT canonical or certified policy.
 *
 * Values are branded only AFTER runtime parsing. Literal limits (10/45/60/90)
 * are proposed defaults, not independently ratified CANON-FRACTAL-01 rules.
 */
declare const isoBrand: unique symbol;
declare const shaBrand: unique symbol;
declare const idBrand: unique symbol;
declare const millisBrand: unique symbol;
declare const epochBrand: unique symbol;
export type Iso8601UtcString = string & { readonly [isoBrand]: true };
export type Sha256HexHash = string & { readonly [shaBrand]: true };
export type ChittyEntityId = string & { readonly [idBrand]: true };
export type Milliseconds = number & { readonly [millisBrand]: true };
export type EpochSeconds = number & { readonly [epochBrand]: true };

export interface LedgerSequenceAnchor {
  readonly eventId: ChittyEntityId;
  readonly sequenceNumber: bigint;
  readonly blockHash: Sha256HexHash;
  readonly anchorTimestamp: Iso8601UtcString;
  readonly maxLagTolerance: 10;
}
export interface LedgerLagEvaluation {
  readonly localSequence: bigint;
  readonly canonicalHeight: bigint;
  readonly lagDelta: bigint;
  readonly isAcceptable: boolean;
}
export interface KeyValidityWindow {
  readonly notBefore: Iso8601UtcString;
  readonly notAfter: Iso8601UtcString;
  readonly maxLifespanDays: 90;
}
export interface LineageTemporalAttestation {
  readonly parentEntityId: ChittyEntityId;
  readonly attestationTimestamp: Iso8601UtcString;
  readonly verifiedSequenceNumber: bigint;
}
export interface IdentityPlaneTyTemporal {
  readonly genesisTimestamp: Iso8601UtcString;
  readonly keyValidity: KeyValidityWindow;
  readonly rotationEpoch: number;
  readonly lineage: LineageTemporalAttestation;
  readonly anchor: LedgerSequenceAnchor;
}
export interface InteractionMetricsTemporal {
  readonly interactionId: string;
  readonly timestamp: Iso8601UtcString;
  readonly durationMs: Milliseconds;
  readonly interArrivalIntervalMs: Milliseconds;
}
export interface RollingWindow90Day {
  readonly windowStart: Iso8601UtcString;
  readonly windowEnd: Iso8601UtcString;
  readonly interactionCount: number;
  readonly rawWeightSum: number;
  readonly decayedWeightSum: number;
}
export interface EntropyMetricsTemporal {
  readonly durationVariance: number;
  readonly interArrivalEntropyScore: number;
  readonly replayConfidenceScore: number;
}
export interface ConnectivityPlaneVyTemporal {
  readonly recentInteractions: readonly InteractionMetricsTemporal[];
  readonly rollingWindow: RollingWindow90Day;
  readonly decayHalfLifeDays: 45;
  readonly lastReckoningTimestamp: Iso8601UtcString;
  readonly entropy: EntropyMetricsTemporal;
  readonly anchor: LedgerSequenceAnchor;
}
/** A short-lived *evaluation ticket*, NOT the renewable ChittyTasks execution lease. */
export interface DispatchLeaseTemporal {
  readonly leaseTokenId: string;
  readonly issuedAt: Iso8601UtcString;
  readonly expiresAt: Iso8601UtcString;
  readonly maxDurationSeconds: 60;
  readonly isRevoked: boolean;
}
export interface DelegationScopeTemporal {
  readonly scopeId: string;
  readonly grantedAt: Iso8601UtcString;
  readonly timeoutAt: Iso8601UtcString;
  readonly requiresReattestation: boolean;
}
export interface RevocationStatusTemporal {
  readonly isRevoked: boolean;
  readonly revocationEffectiveAt: Iso8601UtcString | null;
  readonly crlSequenceNumber: bigint | null;
}
export interface AuthorityPlaneRyTemporal {
  readonly activeLease: DispatchLeaseTemporal | null;
  readonly delegations: readonly DelegationScopeTemporal[];
  readonly revocation: RevocationStatusTemporal;
  readonly anchor: LedgerSequenceAnchor;
}
export type TemporalSyncStatus = 'SYNCHRONIZED' | 'DEGRADED' | 'HALTED';
export interface FractalTemporalAggregate {
  readonly entityId: ChittyEntityId;
  readonly ty: IdentityPlaneTyTemporal;
  readonly vy: ConnectivityPlaneVyTemporal;
  readonly ry: AuthorityPlaneRyTemporal;
  readonly canonicalLedgerHeight: bigint;
  readonly maxObservedLag: bigint;
  readonly syncStatus: TemporalSyncStatus;
}

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/;
const SHA256 = /^[0-9a-f]{64}$/;
const DAY_MS = 86_400_000;

/** Strict UTC string parsing. JS Date only represents millisecond precision. */
export function parseIso8601Utc(value: string): Iso8601UtcString {
  if (!ISO_UTC.test(value) || !Number.isFinite(Date.parse(value)))
    throw new RangeError('Invalid ISO 8601 UTC timestamp');
  // Forbid impossible calendar dates normalized by Date.parse.
  const [head] = value.split('.');
  const base = head.endsWith('Z') ? head.slice(0, -1) : head;
  const ms = Date.parse(value);
  if (new Date(ms).toISOString().slice(0, 19) !== base)
    throw new RangeError('Invalid UTC calendar date');
  return value as Iso8601UtcString;
}
export function parseSha256Hex(value: string): Sha256HexHash {
  if (!SHA256.test(value)) throw new RangeError('Invalid SHA-256 hex digest');
  return value as Sha256HexHash;
}
export function parseChittyEntityId(value: string): ChittyEntityId {
  // Final canonical grammar is owned by ChittyID / ChittySchema; reject blanks,
  // do not claim this partial parser certifies identity or registration.
  if (!value || value.trim() !== value || /\s/.test(value))
    throw new RangeError('Invalid entity ID');
  return value as ChittyEntityId;
}
export function milliseconds(value: number): Milliseconds {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new RangeError('Expected nonnegative integer milliseconds');
  return value as Milliseconds;
}
export function epochSeconds(value: number): EpochSeconds {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new RangeError('Expected nonnegative integer epoch seconds');
  return value as EpochSeconds;
}
export function evaluateLedgerLag(anchor: LedgerSequenceAnchor, canonicalHeight: bigint): LedgerLagEvaluation {
  if (anchor.sequenceNumber < 0n || canonicalHeight < 0n || canonicalHeight < anchor.sequenceNumber)
    throw new RangeError('Invalid/reversed ledger sequence');
  const lagDelta = canonicalHeight - anchor.sequenceNumber;
  return { localSequence: anchor.sequenceNumber, canonicalHeight, lagDelta,
    isAcceptable: lagDelta <= BigInt(anchor.maxLagTolerance) };
}
export function isLeaseValid(lease: DispatchLeaseTemporal, currentTimeUtc: Iso8601UtcString): boolean {
  const issued = Date.parse(lease.issuedAt);
  const expires = Date.parse(lease.expiresAt);
  const now = Date.parse(currentTimeUtc);
  if (![issued, expires, now].every(Number.isFinite)) return false;
  const lifespan = expires - issued;
  return !lease.isRevoked && lifespan > 0 && lifespan <= lease.maxDurationSeconds * 1000
    && now >= issued && now < expires;
}
export function computeExponentialDecay(
  initialWeight: number, elapsedMilliseconds: Milliseconds, halfLifeDays: 45 = 45
): number {
  if (!Number.isFinite(initialWeight) || initialWeight < 0 || !Number.isFinite(elapsedMilliseconds)
      || elapsedMilliseconds < 0 || !Number.isFinite(halfLifeDays) || halfLifeDays <= 0)
    throw new RangeError('Invalid decay input');
  return initialWeight * Math.exp(-Math.LN2 * elapsedMilliseconds / (halfLifeDays * DAY_MS));
}
export function validateKeyExpiry(keyWindow: KeyValidityWindow, evaluationTimeUtc: Iso8601UtcString): boolean {
  const before=Date.parse(keyWindow.notBefore);
  const after=Date.parse(keyWindow.notAfter);
  const now=Date.parse(evaluationTimeUtc);
  if (![before,after,now].every(Number.isFinite)) return false;
  return after > before && (after - before) <= keyWindow.maxLifespanDays * DAY_MS
    && now >= before && now < after;
}
export type IsLeaseValidFn = typeof isLeaseValid;
export type EvaluateLedgerLagFn = typeof evaluateLedgerLag;
export type ComputeExponentialDecayFn = typeof computeExponentialDecay;
export type ValidateKeyExpiryFn = typeof validateKeyExpiry;
