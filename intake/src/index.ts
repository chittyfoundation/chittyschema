// @chittyos/schema/intake — public entry point.
export * from "./types.js";

/**
 * RFC 8785 (JCS) canonicalization: sorted object keys, no whitespace.
 * MUST produce byte-identical output to the Apps Script and Postgres
 * implementations. Equivalence is asserted against
 * chittyos/chittysync fixtures/chitty-intake-sheet-array-v1.json.
 */
export function jcsCanonicalize(value: unknown): string {
  const enc = (v: unknown): string => {
    if (v === null || typeof v === "number" || typeof v === "boolean") return JSON.stringify(v);
    if (typeof v === "string") return JSON.stringify(v);
    if (Array.isArray(v)) return "[" + v.map(enc).join(",") + "]";
    const o = v as Record<string, unknown>;
    return "{" + Object.keys(o).sort().map((k) => JSON.stringify(k) + ":" + enc(o[k])).join(",") + "}";
  };
  return enc(value);
}
