import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const REPO = process.env.REPO || process.cwd();
const read = (p) => readFileSync(join(REPO, p), "utf8");

// Full Working-discipline block in the skills that write or design code.
for (const name of ["feature-dev", "code-architect", "mcp-builder"]) {
  test(`${name}: Working discipline section present`, () => {
    const s = read(`skills/${name}/SKILL.md`);
    const c = read(`commands/${name}.md`);
    assert.match(s, /##\s*Working discipline/);
    assert.match(s, /Simplicity first/);
    assert.match(s, /Surgical changes/);
    assert.ok(c.includes("Working discipline"), "command must inline the section");
  });
}

// Lighter reviewer-criterion addition in the review skills.
for (const name of ["code-review", "code-reviewer"]) {
  test(`${name}: flags scope creep / speculative complexity`, () => {
    const s = read(`skills/${name}/SKILL.md`);
    const c = read(`commands/${name}.md`);
    assert.match(s, /scope creep/i);
    assert.match(c, /scope creep/i);
  });
}
