import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const REPO = process.env.REPO || process.cwd();
const read = (path) => readFileSync(join(REPO, path), "utf8");
const review = read("skills/code-review/SKILL.md");
const reviewer = read("skills/code-reviewer/SKILL.md");

test("code-review freezes complete PR and local scopes", () => {
  assert.match(review, /MODE: pr \| range \| local/);
  for (const field of ["SCOPE_ID", "REPOSITORY_ROOT", "BASELINE", "IMPLEMENTATION", "DIFF_SOURCE", "CHANGED_PATHS_AND_STATUSES", "UNTRACKED_PATHS", "RULES_BY_PATH"]) {
    assert.ok(review.includes(field), `missing ${field}`);
  }
  for (const field of ["baseRefName", "baseRefOid", "headRefOid"]) assert.ok(review.includes(field));
  assert.match(review, /git diff --find-renames HEAD/);
  assert.match(review, /git ls-files --others --exclude-standard/);
  assert.doesNotMatch(review, /or the local `git diff`/);
});

test("code-review validates child output and bounds recovery", () => {
  for (const field of ["STATUS:", "SCOPE_ID:", "ROLE:", "COVERAGE:", "CANDIDATES:", "ERRORS:"]) assert.ok(review.includes(field));
  assert.match(review, /validate every child/i);
  assert.match(review, /resume the same .* exactly once/is);
  assert.match(review, /transient .* retry .* exactly once/is);
  assert.match(review, /permission denial.*do not retry/is);
  assert.match(review, /parallel dispatch.*serial/is);
  assert.match(review, /task dispatch.*denied.*parent/is);
  assert.match(review, /never .*failed.*blank.*partial.*no findings/is);
});

test("code-review gates clean output on complete ledgers", () => {
  assert.match(review, /detection coverage ledger/i);
  assert.match(review, /candidate ledger/i);
  assert.match(review, /Review incomplete/);
  assert.match(review, /Emit the exact no-issues sentence only when every detection role is complete and every candidate has a final disposition\./);
  assert.ok(review.includes("No issues found. Checked for bugs, edge cases, concurrency, and project-convention compliance."));
});

test("code-review reconciles confidence, runtime inputs, and posting", () => {
  assert.match(review, /final reporting threshold.*confidence\s*≥\s*80/i);
  assert.match(review, /required runtime state or input is not shown to be reachable/i);
  assert.ok(review.includes("<!-- opencode-power-pack:code-review"));
  assert.match(review, /gh api --paginate/);
  assert.match(review, /PATCH/);
  assert.match(review, /POST only when/i);
  assert.doesNotMatch(review, /A previous review by the agent already exists/);
});

test("code-reviewer honors authoritative handoffs and complete local changes", () => {
  assert.match(reviewer, /Dispatched handoff/i);
  assert.match(reviewer, /scope manifest.*authoritative/is);
  assert.match(reviewer, /do not .*rediscover|do not .*widen/i);
  assert.match(reviewer, /staged, unstaged, and untracked/i);
  assert.match(reviewer, /Status: complete \| partial \| blocked/i);
  assert.match(reviewer, /\*\*80\*\*.*reporting threshold/i);
  assert.doesNotMatch(reviewer, /By default, review unstaged changes/);
});
