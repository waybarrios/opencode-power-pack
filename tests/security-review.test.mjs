import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const REPO = process.env.REPO || process.cwd();
const skill = readFileSync(join(REPO, "skills/security-review/SKILL.md"), "utf8");

test("security-review resolves explicit, PR, and complete local scopes", () => {
  assert.match(skill, /explicit (user|requested).*scope.*takes precedence/is);
  for (const field of ["baseRefName", "baseRefOid", "headRefOid"]) assert.ok(skill.includes(field));
  assert.match(skill, /git diff --find-renames HEAD/);
  assert.match(skill, /git ls-files --others --exclude-standard/);
  assert.match(skill, /scope manifest/i);
  assert.ok(skill.includes("No reviewable changes found in the resolved scope."));
});

test("security-review filters path-only requests over the resolved change set", () => {
  assert.match(skill, /path-only.*resolve.*(?:PR|current.branch|local).*change set.*(?:filter|restrict)/is);
  assert.match(skill, /(?:filter|restrict).*requested paths.*committed.*(?:branch|PR) changes/is);
});

test("security-review content-addresses worktree scope and detects mutation", () => {
  assert.match(skill, /worktree.*(?:exact bytes|content hash|SHA-256|frozen patch)/is);
  assert.match(skill, /SCOPE_ID.*(?:worktree|snapshot).*(?:hash|digest)/is);
  assert.match(skill, /recompute.*SCOPE_ID.*(?:worktree|snapshot|hash)/is);
  assert.match(skill, /(?:re-read|recompute|verify|compare).*worktree.*mismatch.*incomplete/is);
});

test("security-review requires baseline evidence and validated handoffs", () => {
  assert.match(skill, /implementation baseline/i);
  assert.match(skill, /absent at base/i);
  for (const field of ["candidate_id", "changed_location", "baseline_evidence", "controlled_input", "trust_boundary"]) assert.ok(skill.includes(field));
  assert.match(skill, /reject.*mismatched|mismatched.*reject/is);
  assert.match(skill, /missing fields/i);
  assert.match(skill, /out-of-range/i);
});

test("security-review uses bounded recovery and coverage ledgers", () => {
  assert.match(skill, /resume.*exactly once/is);
  assert.match(skill, /transient.*retry.*exactly once/is);
  assert.match(skill, /parallel.*denied.*serial/is);
  assert.match(skill, /task dispatch.*(unavailable|denied).*parent/is);
  assert.match(skill, /scope coverage ledger/i);
  assert.match(skill, /analysis coverage ledger/i);
});

test("security-review reconciles confidence, secrets, and runtime inputs", () => {
  assert.match(skill, /at least 8\/10/i);
  assert.match(skill, /at least 80%/i);
  assert.doesNotMatch(skill, /greater than 80%/i);
  assert.match(skill, /hardcoded.*credentials.*reportable/is);
  assert.match(skill, /tests.*fixtures.*documentation/is);
  assert.match(skill, /demonstrably inert/i);
  assert.ok(skill.includes("Environment variables and CLI flags are trust-boundary inputs, not automatically trusted."));
});

test("security-review defines complete, empty, and incomplete outcomes", () => {
  assert.ok(skill.includes("No security vulnerabilities found in the reviewed scope."));
  assert.ok(skill.includes("No reviewable changes found in the resolved scope."));
  assert.ok(skill.includes("Security review incomplete; absence of findings is not established."));
  assert.match(skill, /no-findings.*only.*complete/is);
});

test("security-review posting is requested and idempotent", () => {
  assert.match(skill, /only when.*requested/is);
  assert.ok(skill.includes("<!-- opencode-power-pack:security-review -->"));
  assert.match(skill, /authenticated author/i);
  assert.match(skill, /update.*existing.*rather than.*creat/is);
  assert.match(skill, /head SHA/i);
  assert.match(skill, /ambiguous.*failure.*query again/is);
});
