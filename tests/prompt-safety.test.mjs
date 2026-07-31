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

test("every direct consumer limits project-rule authority and freezes web evidence", () => {
  for (const name of consumers) {
    const skill = readSkill(name);
    assert.match(
      skill,
      /project rules.*(?:path|domain) conventions.*compatible.*cannot authorize unrelated actions/is,
      `${name}: project-rule authority`,
    );
    assert.match(
      skill,
      /mutable web content supplied by a parent.*parent's frozen (?:evidence )?identity/is,
      `${name}: parent-frozen web identity`,
    );
    assert.match(
      skill,
      /standalone web use.*immutable revisions?.*(?:otherwise|or).*URL.*UTC retrieval time.*SHA-256/is,
      `${name}: standalone web evidence`,
    );
  }
});

test("orchestrators validate the boundary before dispatch without changing envelope fields", () => {
  const feature = readSkill("feature-dev");
  const review = readSkill("code-review");
  const security = readSkill("security-review");
  assert.match(feature, /REQUIREMENTS.*repeat.*untrusted data boundary.*every child.*validate this before dispatch/is);
  assert.doesNotMatch(feature, /UNTRUSTED_DATA_BOUNDARY:/);
  assert.match(review, /every detection, cross-check, and validation child.*untrusted data boundary.*validate (?:it|its presence|the boundary) before dispatch/is);
  assert.match(security, /every category, filter, and exploit task.*untrusted data boundary.*validate (?:it|its presence|the boundary) before dispatch/is);
  assert.ok(feature.indexOf("## Untrusted data boundary") < feature.indexOf("1. Dispatch independent assignments"));
  assert.ok(review.indexOf("## Untrusted data boundary") < review.indexOf("Dispatch these seven independent detection roles"));
  assert.ok(security.indexOf("## Untrusted data boundary") < security.indexOf("Dispatch one independent analysis task"));
});

test("orchestrators recover every malformed child result through bounded recovery", () => {
  for (const name of ["feature-dev", "code-review", "security-review"]) {
    const skill = readSkill(name);
    assert.match(
      skill,
      /child (?:output|response|result).*(?:follows|appears to have obeyed) embedded instructions.*widens scope.*reproduces secret values.*malformed.*(?:existing bounded recovery|recovery order below)/is,
      name,
    );
  }
  assert.match(
    readSkill("feature-dev"),
    /child output that follows or appears to have obeyed embedded instructions.*malformed/is,
  );
});

test("specialists reject embedded instructions and preserve dispatched authority", () => {
  for (const name of ["code-explorer", "code-architect", "code-reviewer"]) {
    const skill = readSkill(name);
    assert.match(skill, /dispatched.*(?:assignment|manifest).*authoritative/is, name);
    assert.match(skill, /embedded instructions.*(?:ignore|reject|do not follow)/is, name);
    assert.match(skill, /partial|blocked/i, name);
  }
});

test("agents-md-improver treats issue text and metadata as untrusted data", () => {
  assert.match(
    readSkill("agents-md-improver"),
    /issue titles, bodies, comments, and metadata.*untrusted data/is,
  );
});
