import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const REPO = process.env.REPO || process.cwd();
const skill = readFileSync(join(REPO, "skills/agents-md-revise/SKILL.md"), "utf8");
const command = readFileSync(join(REPO, "commands/agents-md-revise.md"), "utf8");

// Content-regression guards for the first-match-wins / shadowed-CLAUDE.md fix.

test("agents-md-revise: describes first-match-wins rules loading", () => {
  assert.match(skill, /first-match-wins/i);
});

test("agents-md-revise: warns against writing to a shadowed CLAUDE.md", () => {
  assert.match(skill, /shadow|never read|ignore/i);
  assert.match(skill, /CLAUDE\.md/);
});

test("agents-md-revise: command stays in sync with the skill", () => {
  assert.match(command, /first-match-wins/i);
  assert.match(command, /shadow|ignore/i);
});
