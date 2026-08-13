import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const REPO = process.env.REPO || process.cwd();
const manifestPath = join(REPO, ".codex-plugin", "plugin.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const marketplacePath = join(REPO, ".agents", "plugins", "marketplace.json");
const marketplace = JSON.parse(readFileSync(marketplacePath, "utf8"));

test("Codex plugin manifest identifies the repository and skills", () => {
  assert.equal(manifest.name, "opencode-power-pack");
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
  assert.equal(manifest.skills, "./skills/");
  assert.equal(manifest.repository, "https://github.com/waybarrios/opencode-power-pack");
  assert.match(manifest.description, /Codex/i);
  assert.match(manifest.description, /Claude Code/i);
  assert.match(manifest.description, /OpenCode/i);
  assert.match(manifest.description, /Pi/i);
  assert.ok(manifest.keywords.includes("codex"));
});

test("Codex plugin exposes every bundled skill with valid basic frontmatter", () => {
  const names = readdirSync(join(REPO, "skills"))
    .filter((name) => existsSync(join(REPO, "skills", name, "SKILL.md")));

  assert.equal(names.length, 54);
  for (const name of names) {
    const source = readFileSync(join(REPO, "skills", name, "SKILL.md"), "utf8");
    assert.match(source, /^---\r?\n/);
    assert.match(source, new RegExp(`(?:^|\\n)name: ${name}(?:\\r?\\n|$)`));
    assert.match(source, /(?:^|\n)description: .+/);
  }
});

test("overlapping code review skills have distinct Codex-facing identities", () => {
  const comprehensive = readFileSync(
    join(REPO, "skills", "code-review", "agents", "openai.yaml"),
    "utf8",
  );
  const focused = readFileSync(
    join(REPO, "skills", "code-reviewer", "agents", "openai.yaml"),
    "utf8",
  );

  assert.match(comprehensive, /display_name: "Comprehensive Code Review"/);
  assert.match(comprehensive, /default_prompt: "Use \$code-review /);
  assert.match(focused, /display_name: "Focused Code Review"/);
  assert.match(focused, /default_prompt: "Use \$code-reviewer /);
  assert.notEqual(comprehensive, focused);
});

test("Codex manifest does not declare absent plugin components", () => {
  assert.equal("apps" in manifest, false);
  assert.equal("mcpServers" in manifest, false);
  assert.equal("hooks" in manifest, false);
});

test("repository marketplace installs the root plugin from main", () => {
  assert.equal(marketplace.name, "opencode-power-pack");
  assert.equal(
    marketplace.interface.displayName,
    "Claude Code + Codex + OpenCode + Pi Power Pack",
  );
  assert.equal(marketplace.plugins.length, 1);

  const [entry] = marketplace.plugins;
  assert.equal(entry.name, manifest.name);
  assert.deepEqual(entry.source, {
    source: "url",
    url: "https://github.com/waybarrios/opencode-power-pack.git",
    ref: "main",
  });
  assert.deepEqual(entry.policy, {
    installation: "AVAILABLE",
    authentication: "ON_INSTALL",
  });
  assert.equal(entry.category, "Productivity");
});
