import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const REPO = process.env.REPO || process.cwd();
const skill = readFileSync(join(REPO, "skills/frontend-design/SKILL.md"), "utf8");
const command = readFileSync(join(REPO, "commands/frontend-design.md"), "utf8");

// Content-regression guards: these encode the improvement so it can't silently rot.

test("frontend-design: names the generic default fonts to avoid", () => {
  for (const font of ["Inter", "Roboto", "Arial"]) {
    assert.ok(skill.includes(font), `skill should name ${font} as a font to avoid`);
  }
  assert.ok(skill.includes("Space Grotesk"), "skill should warn about Space Grotesk convergence");
});

test("frontend-design: includes an objective self-critique rubric", () => {
  assert.match(skill, /##\s*Self-critique/i);
  assert.match(skill, /contrast/i);
  assert.match(skill, /prefers-reduced-motion/);
  assert.match(skill, /\balt\b/);
  assert.match(skill, /focus/i);
});

test("frontend-design: keeps the optional, cross-platform validation note", () => {
  assert.match(skill, /html-validate/);
  assert.match(skill, /Playwright/);
  // the screenshot loop must stay clearly optional / vision-gated
  assert.match(skill, /opt-in|optional/i);
});

test("frontend-design: command inlines the rubric (stays in sync)", () => {
  assert.match(command, /##\s*Self-critique/i);
  assert.ok(command.includes("prefers-reduced-motion"));
  assert.ok(command.includes("html-validate"));
});
