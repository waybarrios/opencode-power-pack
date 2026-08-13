import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("logo release metadata matches the shipped package", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  const logo = fs.readFileSync(path.join(ROOT, "assets", "logo.svg"), "utf8");
  const skillCount = fs
    .readdirSync(path.join(ROOT, "skills"), { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() && fs.existsSync(path.join(ROOT, "skills", entry.name, "SKILL.md")),
    ).length;

  assert.ok(logo.includes(`>v${packageJson.version}</text>`));
  assert.match(logo, new RegExp(`>\\s*${skillCount}\\s+SKILLS\\s+·`));
  assert.match(
    logo,
    /aria-label="OpenCode Power Pack for Claude Code, Codex, OpenCode, and Pi"/,
  );
});
