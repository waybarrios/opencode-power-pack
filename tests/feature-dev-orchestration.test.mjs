import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const REPO = process.env.REPO || process.cwd();
const readSkill = (name) => readFileSync(join(REPO, "skills", name, "SKILL.md"), "utf8");
const feature = readSkill("feature-dev");
const explorer = readSkill("code-explorer");
const architect = readSkill("code-architect");

test("feature-dev defines assignments and a coverage ledger", () => {
  for (const field of [
    "ASSIGNMENT_ID", "PHASE", "SPECIALIST", "OBJECTIVE", "SCOPE",
    "FOCUS", "REQUIREMENTS", "EXCLUSIONS", "PRIOR_INPUTS",
    "REQUIRED_OUTPUT", "COMPLETION_CRITERIA",
  ]) assert.ok(feature.includes(field), `missing ${field}`);
  assert.match(feature, /coverage ledger/i);
  assert.match(feature, /pending.*valid.*blocked.*failed.*local-fallback/is);
});

test("feature-dev bounds recovery and preserves valid sibling results", () => {
  assert.match(feature, /resume the same .* at most once/is);
  assert.match(feature, /transient .* retry .* at most once/is);
  assert.match(feature, /permission denial.*does not consume.*retry/is);
  assert.match(feature, /parallel dispatch.*unavailable.*serial/is);
  assert.match(feature, /task dispatch.*(unavailable|denied).*parent/is);
  assert.match(feature, /preserve.*valid.*sibling/is);
  assert.match(feature, /degraded execution/i);
});

test("feature-dev captures the complete before-state before implementation", () => {
  for (const command of [
    "git rev-parse HEAD", "git status --short", "git diff",
    "git diff --cached", "git ls-files --others --exclude-standard",
  ]) assert.ok(feature.includes(command), command);
  assert.ok(
    feature.indexOf("git rev-parse HEAD") < feature.indexOf("Implement following the chosen architecture"),
    "baseline precedes edits",
  );
  assert.match(feature, /pre-existing change ledger/i);
  assert.match(feature, /implementation delta/i);
});

test("explorer and architect implement the feature-dev handoff", () => {
  for (const [name, skill] of [["code-explorer", explorer], ["code-architect", architect]]) {
    assert.match(skill, /Feature-dev handoff contract/i, name);
    assert.match(skill, /Required inputs/i, name);
    assert.match(skill, /Required output/i, name);
    assert.match(skill, /Status: complete \| partial \| blocked/i, name);
    assert.match(skill, /ASSIGNMENT_ID/i, name);
    assert.match(skill, /scope inspected/i, name);
  }
});
