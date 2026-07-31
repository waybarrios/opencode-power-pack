import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const REPO = process.env.REPO || process.cwd();
const skill = readFileSync(join(REPO, "skills/frontend-design/SKILL.md"), "utf8");

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

test("frontend-design: enforces variety / anti-convergence across generations", () => {
  assert.match(skill, /Vary across generations/i);
  assert.match(skill, /diverge/i);
});

test("frontend-design: resolves material requirements before implementation", () => {
  assert.match(skill, /##\s*Scope and requirements/i);
  assert.match(skill, /ask only about missing information.*materially changes/is);
  assert.ok(
    skill.indexOf("## Scope and requirements") < skill.indexOf("Then implement working code"),
    "scope planning precedes implementation",
  );
});

test("frontend-design: separates page and component ownership", () => {
  assert.match(skill, /Page or application/i);
  assert.match(skill, /information architecture.*navigation.*viewport/is);
  assert.match(skill, /Isolated or reusable component/i);
  assert.match(skill, /inputs.*events.*variants.*states.*host context/is);
  assert.match(skill, /Hybrid work/i);
  assert.match(skill, /component.*must not.*page shell.*global landmarks.*viewport metadata/is);
  assert.match(skill, /page.*must not.*collapse.*individual components/is);
});

test("frontend-design: preserves objective accessibility thresholds", () => {
  for (const value of ["4.5:1", "3:1", "320px", "line-height", "45-75", "three times per second"]) {
    assert.ok(skill.includes(value), `missing objective check ${value}`);
  }
  assert.match(skill, /keyboard-operable.*visible focus/is);
  assert.match(skill, /native element.*ARIA/is);
  assert.match(skill, /zoom is not disabled/i);
  assert.match(skill, /page.*exactly one `<h1>`.*landmarks/is);
  assert.match(skill, /component.*document-level `<h1>`.*landmarks.*`<meta name="viewport">`/is);
});
