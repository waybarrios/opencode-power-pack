import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const REPO = process.env.REPO || process.cwd();
const packageJson = JSON.parse(readFileSync(join(REPO, "package.json"), "utf8"));
const plugin = JSON.parse(
  readFileSync(join(REPO, ".claude-plugin", "plugin.json"), "utf8"),
);
const marketplace = JSON.parse(
  readFileSync(join(REPO, ".claude-plugin", "marketplace.json"), "utf8"),
);

test("Claude Code plugin manifest identifies the package and bundled skills", () => {
  assert.equal(plugin.name, "opencode-power-pack");
  assert.equal(plugin.displayName, "OpenCode Power Pack");
  assert.equal(plugin.version, packageJson.version);
  assert.equal(plugin.skills, "./skills/");
  assert.equal(plugin.repository, "https://github.com/waybarrios/opencode-power-pack");
  assert.match(plugin.description, /Claude Code/i);
  assert.ok(plugin.keywords.includes("claude-code"));

  const names = readdirSync(join(REPO, "skills")).filter((name) =>
    existsSync(join(REPO, "skills", name, "SKILL.md")),
  );
  assert.equal(names.length, 54);
});

test("Claude Code marketplace installs the plugin from the repository root", () => {
  assert.equal(marketplace.name, "opencode-power-pack");
  assert.equal(marketplace.owner.name, "Wayner Barrios");
  assert.equal(marketplace.plugins.length, 1);

  const [entry] = marketplace.plugins;
  assert.equal(entry.name, plugin.name);
  assert.equal(entry.source, "./");
  assert.match(entry.description, /Fifty-four workflows/i);
});

test("README documents namespaced Claude Code installation and verification", () => {
  const readme = readFileSync(join(REPO, "README.md"), "utf8");
  assert.match(readme, /\/plugin marketplace add waybarrios\/opencode-power-pack/);
  assert.match(
    readme,
    /\/plugin install opencode-power-pack@opencode-power-pack/,
  );
  assert.match(readme, /claude plugin validate \. --strict/);
  assert.match(readme, /\/opencode-power-pack:code-review/);
});
