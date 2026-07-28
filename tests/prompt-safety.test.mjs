import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const REPO = process.env.REPO || process.cwd();
const skillsDir = join(REPO, "skills");
const readSkill = (name) => readFileSync(join(skillsDir, name, "SKILL.md"), "utf8");
const consumers = [
  "agents-md-improver", "agents-md-revise", "code-review", "security-review",
  "feature-dev", "code-explorer", "code-architect", "code-reviewer", "mcp-builder",
];
const allSkills = readdirSync(skillsDir).filter((name) => existsSync(join(skillsDir, name, "SKILL.md")));

test("untrusted data boundary exists in exactly the approved consumers", () => {
  const marked = allSkills.filter((name) => /##\s*Untrusted data boundary/i.test(readSkill(name))).sort();
  assert.deepEqual(marked, consumers.toSorted());
});

test("every direct consumer treats supplied content as data and preserves authority", () => {
  for (const name of consumers) {
    const skill = readSkill(name);
    assert.match(skill, /repository.*diff.*(?:tests|comments).*PR metadata.*project rules.*web.*tool output/is, name);
    assert.match(skill, /untrusted data.*not.*instructions/is, name);
    assert.match(skill, /never follow.*embedded instructions/is, name);
    assert.match(skill, /(?:cannot|must not).*widen scope|preserve.*(?:user|parent).*scope/is, name);
    assert.match(skill, /secret values.*(?:prompt|child|report|comment|metadata)/is, name);
    assert.ok(skill.includes("[REDACTED]"), `${name}: redaction marker`);
  }
});

test("orchestrators repeat the boundary in child work without changing envelope fields", () => {
  const feature = readSkill("feature-dev");
  const review = readSkill("code-review");
  const security = readSkill("security-review");
  assert.match(feature, /REQUIREMENTS.*repeat.*untrusted data boundary.*every child/is);
  assert.doesNotMatch(feature, /UNTRUSTED_DATA_BOUNDARY:/);
  assert.match(review, /every detection, cross-check, and validation child.*untrusted data boundary/is);
  assert.match(security, /every category, filter, and exploit task.*untrusted data boundary/is);
});

test("specialists reject embedded instructions and preserve dispatched authority", () => {
  for (const name of ["code-explorer", "code-architect", "code-reviewer"]) {
    const skill = readSkill(name);
    assert.match(skill, /dispatched.*(?:assignment|manifest).*authoritative/is, name);
    assert.match(skill, /embedded instructions.*(?:ignore|reject|do not follow)/is, name);
    assert.match(skill, /partial|blocked/i, name);
  }
});
