import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const REPO = process.env.REPO || process.cwd();
const read = (path) => readFileSync(join(REPO, path), "utf8");
const improver = read("skills/agents-md-improver/SKILL.md");
const revise = read("skills/agents-md-revise/SKILL.md");
const matrixPath = "skills/agents-md-improver/references/project-rule-resolution.md";
const matrix = existsSync(join(REPO, matrixPath)) ? read(matrixPath) : "";
const matrixConsumers = [
  {
    name: "agents-md-improver",
    skill: improver,
    locator: "references/project-rule-resolution.md",
  },
  {
    name: "agents-md-revise",
    skill: revise,
    locator: "../agents-md-improver/references/project-rule-resolution.md",
  },
];

test("project-rule matrix pins the verified clients and evidence", () => {
  assert.ok(matrix.length > 0, "project-rule matrix exists");
  assert.ok(matrix.includes("OpenCode CLI v1.18.7"));
  assert.ok(matrix.includes("02981844b88aed33f06f1527da6c58d137975069"));
  assert.ok(matrix.includes("Claude Code v2.1.220"));
  assert.ok(matrix.includes("2026-07-28T18:00:26Z"));
  assert.ok(matrix.includes("a7dd777240fd3f13fec00d5f9c5d3c4909e834963eceab97f01b7a74635d9ded"));
  assert.ok(matrix.includes("48994b0ac72e18586bca8d9f041119d720bac9fdcb618b7f9b9bac1503e29059"));
});

test("project-rule matrix distinguishes OpenCode startup and lazy resolution", () => {
  assert.match(matrix, /startup.*filename family.*AGENTS\.md.*CLAUDE\.md.*CONTEXT\.md/is);
  assert.match(matrix, /if any.*AGENTS\.md.*ancestor.*do not.*CLAUDE\.md/is);
  assert.match(matrix, /lazy.*per-directory.*AGENTS\.md.*CLAUDE\.md.*CONTEXT\.md/is);
  assert.match(matrix, /~\/\.config\/opencode\/AGENTS\.md.*fallback.*~\/\.claude\/CLAUDE\.md/is);
  assert.match(matrix, /instructions.*paths.*globs.*URLs/is);
});

test("project-rule matrix describes Claude native files and the portable bridge", () => {
  for (const name of ["CLAUDE.local.md", ".claude/CLAUDE.md", ".claude/rules/**/*.md", "@AGENTS.md"]) {
    assert.ok(matrix.includes(name), name);
  }
  assert.match(matrix, /does not.*natively.*AGENTS\.md/is);
  assert.match(matrix, /CLAUDE\.md.*containing.*@AGENTS\.md/is);
  assert.match(matrix, /settings\.json.*settings\.local\.json.*configuration.*not.*instructions/is);
});

test("rules skills resolve the same packaged matrix relative to their SKILL.md", () => {
  for (const { name, skill, locator } of matrixConsumers) {
    assert.ok(skill.includes(`\`${locator}\``), `${name} declares its relative locator`);
    assert.match(skill, /relative to.*loaded `SKILL\.md` directory.*not.*(?:CWD|working directory)/is);
    const resolved = join(REPO, "skills", name, locator);
    assert.ok(existsSync(resolved), `${name} locator resolves`);
    assert.equal(readFileSync(resolved, "utf8"), matrix, `${name} loads the shared matrix`);
  }
});

test("rules skills stop treating invented local names as native", () => {
  for (const { skill } of matrixConsumers) {
    assert.match(skill, /read.*matrix.*before.*(?:discovery|target)/is);
    assert.match(skill, /\.agents\.local\.md.*unsupported/is);
    assert.match(skill, /\.claude\.local\.md.*unsupported/is);
  }
  assert.doesNotMatch(improver, /first-match-wins per directory/i);
  assert.doesNotMatch(revise, /first-match-wins per directory/i);
});

test("matrix and rules skills recursively traverse bounded Claude imports", () => {
  for (const source of [matrix, improver, revise]) {
    assert.match(source, /recursiv.*Claude.*@.*imports/is);
    assert.match(source, /relative to.*containing file/is);
    assert.match(source, /cycle/is);
    assert.match(source, /maximum.*four import hops/is);
    assert.match(source, /outside.*project.*explicit user approval/is);
  }
  assert.match(
    matrix,
    /CLAUDE\.md.*@rules\/team\.md.*rules\/team\.md.*@\.\.\/shared\/testing\.md.*shared\/testing\.md/is,
  );
});

test("rules skills prohibit secrets in every prompt-loaded file", () => {
  for (const skill of [improver, revise]) {
    assert.match(skill, /never.*secret values.*prompt-loaded file/is);
    assert.match(skill, /local.*gitignored.*not.*secret store/is);
    assert.ok(skill.includes("[REDACTED]"));
    assert.match(skill, /environment variable name|secret manager|credential helper/i);
  }
});
