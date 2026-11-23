/**
 * Pure comparison logic for check-no-bypass-connections, run on real
 * Hyperdrive/role data fetched read-only from production (no secrets).
 * member_of keeps only is_member=true rows; absent rows mean not a member.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { evaluate, parseHyperdrive, parseRoles } from '../identity/scripts/lib/no-bypass-check';

const load = (f: string) => JSON.parse(readFileSync(new URL(`./fixtures/${f}`, import.meta.url), 'utf-8'));
const configs = () => parseHyperdrive(load('no-bypass-hyperdrive.prod.json'));
const roles = () => parseRoles(load('no-bypass-roles.prod.json'));

describe('evaluate (real production data)', () => {
  it('refuses neondb-chittyos-core as neondb_owner and names every reason', () => {
    const v = evaluate(configs(), roles());
    expect(v.pass).toBe(false);
    expect(v.matched).toEqual(['comptroller-neon-reader', 'comptroller-neon-writer', 'neondb-chittyos-core']);
    expect(v.findings.map((f) => `${f.config}/${f.role}`)).toEqual(['neondb-chittyos-core/neondb_owner']);
    const reasons = v.findings[0].reasons.join('|');
    expect(reasons).toContain('BYPASSRLS');
    expect(reasons).toContain('owns');
    expect(reasons).toContain('neon_superuser');
  });

  it('does not flag the comptroller reader/writer roles', () => {
    const v = evaluate(configs().filter((c) => c.name.startsWith('comptroller')), roles());
    expect(v.findings).toEqual([]);
    expect(v.errors).toEqual([]);
    expect(v.pass).toBe(true);
  });

  it('refuses when the matched role is absent from roles data', () => {
    const r = roles();
    r.roles = r.roles.filter((x) => x.rolname !== 'neondb_owner');
    const v = evaluate(configs(), r);
    expect(v.pass).toBe(false);
    expect(v.errors.join()).toContain('absent');
  });

  it('refuses when nothing matches, and when scopes is missing', () => {
    expect(evaluate(configs(), roles(), 'ep-nonexistent').pass).toBe(false);
    const r = roles();
    r.tables = r.tables.filter((t) => t.table !== 'scopes');
    expect(evaluate(configs().filter((c) => c.name.startsWith('comptroller')), r).pass).toBe(false);
  });
});
