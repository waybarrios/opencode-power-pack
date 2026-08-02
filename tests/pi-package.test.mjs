import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const REPO = process.env.REPO || process.cwd();
const packageJson = JSON.parse(readFileSync(join(REPO, "package.json"), "utf8"));

test("Pi package declares the bundled skills directory", () => {
  assert.deepEqual(packageJson.pi, { skills: ["./skills"] });
  assert.ok(packageJson.keywords.includes("pi-package"));
  assert.ok(packageJson.keywords.includes("pi-coding-agent"));
  assert.match(packageJson.description, /Pi/);
});

test("Pi package exposes all forty-five SKILL.md workflows", () => {
  const skillRoot = join(REPO, packageJson.pi.skills[0]);
  const skills = readdirSync(skillRoot)
    .filter((name) => existsSync(join(skillRoot, name, "SKILL.md")));

  assert.equal(skills.length, 45);
});
