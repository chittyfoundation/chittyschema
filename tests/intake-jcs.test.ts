import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { jcsCanonicalize } from "../intake/src/index.js";

const H = "0123456789abcdef".repeat(4);
const input = [
  { transition: "PREPARED", source_sheet_row: 2, sha256: H, file_name_hash: H, source_previous_event_hash: null },
  { source_sheet_row: 3, transition: "PRIMARY_COMMITTED", file_name_hash: H, sha256: H, source_previous_event_hash: H },
];
const EXPECTED_SHA256 = "3f2b1b30f9fca0674bdf64c12c10219cb3d3dc6dd34931ccb04c50e24bd7d93f";

describe("intake JCS canonicalization", () => {
  it("matches the cross-runtime fixture digest", () => {
    const canon = jcsCanonicalize(input);
    const digest = createHash("sha256").update(Buffer.from(canon, "utf8")).digest("hex");
    expect(digest).toBe(EXPECTED_SHA256);
  });
  it("sorts object keys and emits no whitespace", () => {
    expect(jcsCanonicalize({ b: 1, a: 2 })).toBe("{\"a\":2,\"b\":1}");
  });
  it("preserves null and array order", () => {
    expect(jcsCanonicalize([3, null, "x"])).toBe("[3,null,\"x\"]");
  });
});
