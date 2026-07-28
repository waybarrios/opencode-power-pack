import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const REPO = process.env.REPO || process.cwd();

test("published package relies on native commands and ships every skill", () => {
  const output = execFileSync("npm", ["pack", "--dry-run", "--json"], {
    cwd: REPO,
    encoding: "utf8",
  });
  const [{ files }] = JSON.parse(output);
  const packaged = new Set(files.map((file) => file.path));
  const skillNames = readdirSync(join(REPO, "skills"))
    .filter((name) => existsSync(join(REPO, "skills", name, "SKILL.md")));

  assert.equal(
    files.some((file) => file.path.startsWith("commands/")),
    false,
    "legacy command copies are not published",
  );
  for (const name of skillNames) {
    assert.ok(packaged.has(`skills/${name}/SKILL.md`), `${name} is published`);
  }
  assert.ok(
    packaged.has("skills/agents-md-improver/references/project-rule-resolution.md"),
    "project-rule resolution matrix is published",
  );
});

test("plugin loads as an ES module without runtime warnings", () => {
  const result = spawnSync(
    process.execPath,
    ["--input-type=module", "--eval", "await import('./.opencode/plugins/opencode-power-pack.js')"],
    { cwd: REPO, encoding: "utf8" },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
});
