// Auto-generated types for trust_scores table
// DO NOT EDIT - Regenerate via `npm run introspect && npm run generate:types`
// Source of truth: production schema in chittyos-core (project restless-grass-40598426)


/**
 * trust_scores table
 * Owner: chittyscore
 * ChittyTrust: Cached most-recent reckoning per entity. Per White Paper v2.1 the DRL
 * is reckoning, not record — computed from ledger entries; this table caches it.
 *
 * Column families:
 *   - Pre-TY/VY/RY (legacy): base_score, history_score, network_score, risk_penalty, final_score
 *     Constraints: 0..40, 0..30, 0..20, 0..10, 0..100 respectively. Still authoritative
 *     until consumers migrate to TY/VY/RY; future migration will drop these.
 *   - TY/VY/RY (canonical, per 004_trust_scores_ty_vy_ry.sql, applied 2026-05-01):
 *     ty_score (idenTitY), vy_score (connectiVitY), ry_score (authoRitY) — all 0..1.
 *   - Reckoning metadata: signal_count, reckoned_at, anchor_tx_hash.
 */
export interface TrustScores {
  id?: string;
  identity_id: string;

  // Pre-TY/VY/RY scoring columns (deprecated, retained until consumers migrate)
  base_score: number;
  history_score: number;
  network_score: number;
  risk_penalty: number;
  final_score: number;

  // Calculation metadata
  calculation_details?: Record<string, any> | null;
  calculated_at?: Date | string | null;

  // TY/VY/RY canonical scoring (added by 004_trust_scores_ty_vy_ry.sql)
  /** TY — idenTitY / ontological identity (0-1), per TY-VY-RY White Paper v2.1 */
  ty_score?: number | null;
  /** VY — connectiVitY / behavioral record and network experience (0-1) */
  vy_score?: number | null;
  /** RY — authoRitY / earned, revocable authority (0-1) */
  ry_score?: number | null;
  /** Number of ledger signals used in most recent reckoning */
  signal_count?: number | null;
  /** Timestamp of most recent DRL reckoning */
  reckoned_at?: Date | string | null;
  /** ChittyChain tx hash if reckoning was Hard-Minted */
  anchor_tx_hash?: string | null;
}

/**
 * Insert type for trust_scores (excludes auto-generated fields)
 */
export type TrustScoresInsert = Omit<TrustScores,
  'id' | 'calculated_at' | 'reckoned_at'
>;

/**
 * Update type for trust_scores (all fields optional except id)
 */
export type TrustScoresUpdate = Partial<TrustScores> & Pick<TrustScores, 'id'>;
