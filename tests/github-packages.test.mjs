import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WORKFLOW = fs.readFileSync(
  path.join(ROOT, ".github", "workflows", "publish-github-package.yml"),
  "utf8",
);
const README = fs.readFileSync(path.join(ROOT, "README.md"), "utf8");

test("GitHub Packages workflow publishes an exact release tag with least privilege", () => {
  assert.match(WORKFLOW, /release:\n\s+types: \[published\]/);
  assert.match(WORKFLOW, /workflow_dispatch:/);
  assert.match(WORKFLOW, /contents: read\n\s+packages: write/);
  assert.match(WORKFLOW, /ref: \$\{\{ env\.RELEASE_REF \}\}/);
  assert.match(WORKFLOW, /Release ref .* does not match package version/);
  assert.match(WORKFLOW, /registry-url: "https:\/\/npm\.pkg\.github\.com"/);
  assert.match(WORKFLOW, /scope: "@waybarrios"/);
  assert.match(
    WORKFLOW,
    /npm publish --registry=https:\/\/npm\.pkg\.github\.com --access public/,
  );
  assert.match(WORKFLOW, /NODE_AUTH_TOKEN: \$\{\{ secrets\.GITHUB_TOKEN \}\}/);
});

test("README distinguishes npmjs installation from the GitHub Packages mirror", () => {
  assert.match(README, /### GitHub Packages mirror/);
  assert.match(
    README,
    /npm login --scope=@waybarrios --auth-type=legacy --registry=https:\/\/npm\.pkg\.github\.com/,
  );
  assert.match(
    README,
    /npm install --global @waybarrios\/opencode-power-pack --registry=https:\/\/npm\.pkg\.github\.com/,
  );
  assert.match(README, /personal access token \(classic\).*`read:packages`/);
});
