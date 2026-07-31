import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const REPO = process.env.REPO || process.cwd();
const manifestPath = join(REPO, "UPSTREAMS.json");
const COMMIT_RE = /^[0-9a-f]{40}$/;
const REVIEW_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function frontmatter(file) {
  const text = readFileSync(file, "utf8");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert.ok(match, `${file}: YAML frontmatter exists`);
  return Object.fromEntries(match[1].split(/\r?\n/).map((line) => {
    const separator = line.indexOf(":");
    return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
  }));
}

test("provenance manifest covers every shipped skill with an immutable source", () => {
  assert.ok(existsSync(manifestPath), "UPSTREAMS.json exists");

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const skillNames = readdirSync(join(REPO, "skills"))
    .filter((name) => existsSync(join(REPO, "skills", name, "SKILL.md")))
    .sort();
  const entries = manifest.skills.toSorted((a, b) => a.name.localeCompare(b.name));

  assert.deepEqual(entries.map((entry) => entry.name), skillNames);
  for (const entry of entries) {
    assert.match(entry.source.commit, COMMIT_RE, `${entry.name}: immutable source commit`);
    assert.match(entry.source.blob, COMMIT_RE, `${entry.name}: immutable source blob`);
    assert.match(entry.reviewedAt, REVIEW_DATE_RE, `${entry.name}: review date`);
    assert.match(entry.source.repository, /^https:\/\/github\.com\/[^/]+\/[^/]+$/);
    assert.ok(entry.source.path.length > 0, `${entry.name}: source path`);
    assert.ok(["Apache-2.0", "MIT"].includes(entry.license), `${entry.name}: known license`);
    assert.ok(["adapted", "ported", "translated"].includes(entry.adaptation), `${entry.name}: adaptation type`);
  }
});

test("distributed artifacts carry matching third-party license notices", () => {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const packageJson = JSON.parse(readFileSync(join(REPO, "package.json"), "utf8"));

  assert.equal(packageJson.license, "MIT AND Apache-2.0");

  for (const entry of manifest.skills) {
    const expected = `${entry.license} (modified`;
    const skill = frontmatter(join(REPO, "skills", entry.name, "SKILL.md"));
    assert.ok(skill.license?.startsWith(expected), `${entry.name}: skill marks the source as modified`);
  }

  for (const path of ["UPSTREAMS.json", "THIRD_PARTY_NOTICES.md", "LICENSES"]) {
    assert.ok(packageJson.files.includes(path), `package includes ${path}`);
  }
  assert.ok(existsSync(join(REPO, "LICENSES", "Apache-2.0.txt")));
  assert.ok(existsSync(join(REPO, "LICENSES", "Anthropic-security-review-MIT.txt")));
});

test("provenance includes the adapted OpenCode plugin pattern", () => {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  assert.ok(Array.isArray(manifest.components), "component provenance exists");
  const component = manifest.components.find((entry) => entry.name === "opencode-plugin-pattern");

  assert.equal(component.license, "MIT");
  assert.equal(component.source.repository, "https://github.com/obra/superpowers");
  assert.match(component.source.commit, COMMIT_RE);
  assert.match(component.source.blob, COMMIT_RE);
  assert.ok(existsSync(join(REPO, "LICENSES", "Superpowers-MIT.txt")));
});
