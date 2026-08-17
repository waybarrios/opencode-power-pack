import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  discoverSkills,
  installSkills,
  isDirectInvocation,
  loadCatalog,
  main,
  resolveProjectRoot,
  resolveSelection,
} from "../bin/opencode-power-pack.mjs";

const REPO = process.env.REPO || process.cwd();

async function withTempDir(run) {
  const root = await mkdtemp(path.join(os.tmpdir(), "opp-installer-test-"));
  try {
    return await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("skill profiles and dependency edges reference packaged skills", async () => {
  const catalog = await loadCatalog(REPO);
  const skills = await discoverSkills(REPO);
  const available = new Set(skills.map((skill) => skill.name));

  assert.equal(catalog.schemaVersion, 1);
  assert.ok(Object.keys(catalog.profiles).length > 0);
  for (const profile of Object.values(catalog.profiles)) {
    assert.match(profile.description, /\S/);
    assert.ok(profile.skills.length > 0);
    for (const skillName of profile.skills) assert.ok(available.has(skillName), skillName);
  }
  for (const [skillName, dependencies] of Object.entries(catalog.dependencies)) {
    assert.ok(available.has(skillName), skillName);
    for (const dependency of dependencies) assert.ok(available.has(dependency), dependency);
  }
});

test("selection combines profiles and individual skills and expands dependencies", async () => {
  const catalog = await loadCatalog(REPO);
  const skills = await discoverSkills(REPO);
  const selected = resolveSelection(
    { skillNames: ["paper-summarizer"], profileNames: ["feature-dev"] },
    catalog,
    skills.map((skill) => skill.name),
  );

  assert.deepEqual(selected, [
    "code-architect",
    "code-explorer",
    "code-reviewer",
    "feature-dev",
    "paper-summarizer",
  ]);
  assert.throws(
    () => resolveSelection({ skillNames: ["missing"] }, catalog, skills.map((skill) => skill.name)),
    /Unknown skill: missing/,
  );
});

test("coordinator selections include every required companion skill", async () => {
  const catalog = await loadCatalog(REPO);
  const skills = await discoverSkills(REPO);
  const available = skills.map((skill) => skill.name);

  assert.deepEqual(
    resolveSelection({ skillNames: ["agents-md-revise"] }, catalog, available),
    ["agents-md-improver", "agents-md-revise"],
  );
  assert.deepEqual(
    resolveSelection(
      { skillNames: ["hf-cloud-sagemaker-deployment-planner"] },
      catalog,
      available,
    ),
    [
      "hf-cloud-aws-context-discovery",
      "hf-cloud-python-env-setup",
      "hf-cloud-sagemaker-deployment-planner",
      "hf-cloud-sagemaker-iam-preflight",
      "hf-cloud-sagemaker-production-defaults",
      "hf-cloud-serving-image-selection",
    ],
  );
});

test("installer copies only selected skills, skips existing skills, and replaces on force", async () => {
  await withTempDir(async (root) => {
    const destination = path.join(root, ".agents", "skills");
    let results = await installSkills({
      skillNames: ["code-review"],
      destination,
      packageRoot: REPO,
    });
    assert.deepEqual(results, [{ name: "code-review", status: "installed" }]);
    assert.match(await readFile(path.join(destination, "code-review", "SKILL.md"), "utf8"), /name: code-review/);
    assert.deepEqual(await readdir(destination), ["code-review"]);
    assert.match(
      await readFile(path.join(destination, "code-review", "UPSTREAMS.json"), "utf8"),
      /"name": "code-review"/,
    );
    assert.match(
      await readFile(path.join(destination, "code-review", "THIRD_PARTY_NOTICES.md"), "utf8"),
      /Third-Party Notices/,
    );
    assert.ok((await readdir(path.join(destination, "code-review", "LICENSES"))).length > 0);
    const sandboxPolicy = JSON.parse(
      await readFile(path.join(destination, "code-review", "SANDBOX_POLICY.json"), "utf8"),
    );
    assert.equal(sandboxPolicy.skill, "code-review");
    assert.equal(sandboxPolicy.profile.name, "observe");
    assert.equal(sandboxPolicy.enforcementLevel, "advisory");
    assert.match(sandboxPolicy.warning, /advisory/i);

    const sentinel = path.join(destination, "code-review", "stale.txt");
    await writeFile(sentinel, "stale", "utf8");
    results = await installSkills({
      skillNames: ["code-review"],
      destination,
      packageRoot: REPO,
    });
    assert.deepEqual(results, [{ name: "code-review", status: "skipped" }]);
    assert.equal(await readFile(sentinel, "utf8"), "stale");

    results = await installSkills({
      skillNames: ["code-review"],
      destination,
      force: true,
      packageRoot: REPO,
    });
    assert.deepEqual(results, [{ name: "code-review", status: "updated" }]);
    await assert.rejects(readFile(sentinel, "utf8"), { code: "ENOENT" });
  });
});

test("dry-run reports actions without creating the destination", async () => {
  await withTempDir(async (root) => {
    const destination = path.join(root, "missing", "skills");
    const results = await installSkills({
      skillNames: ["code-review"],
      destination,
      dryRun: true,
      packageRoot: REPO,
    });

    assert.deepEqual(results, [{ name: "code-review", status: "would-install" }]);
    await assert.rejects(readdir(destination), { code: "ENOENT" });
  });
});

test("installer rejects a concurrent update with an actionable lock path", async () => {
  await withTempDir(async (root) => {
    const destination = path.join(root, ".agents", "skills");
    const target = path.join(destination, "code-review");
    await mkdir(`${target}.opp-lock`, { recursive: true });

    await assert.rejects(
      installSkills({ skillNames: ["code-review"], destination, force: true, packageRoot: REPO }),
      (error) => {
        assert.match(error.message, /Another installation is updating code-review/);
        assert.ok(error.message.includes(`${target}.opp-lock`));
        return true;
      },
    );
  });
});

test("CLI installs profiles project-locally and lists the catalog", async () => {
  await withTempDir(async (root) => {
    await mkdir(path.join(root, ".git"));
    let output = "";
    const write = (text) => { output += text; };
    assert.equal(await main(["list"], { cwd: root, home: root, packageRoot: REPO, write }), 0);
    assert.match(output, /Profiles:/);
    assert.match(output, /recommended/);
    assert.match(output, /code-review/);

    output = "";
    assert.equal(await main(
      ["install", "--profile", "feature-dev", "--project"],
      { cwd: root, home: root, packageRoot: REPO, write },
    ), 0);
    assert.match(output, /Selected 4 skill\(s\)/);
    assert.deepEqual(
      await readdir(path.join(root, ".agents", "skills")),
      ["code-architect", "code-explorer", "code-reviewer", "feature-dev"],
    );
  });
});

test("project scope resolves the Git root from a nested working directory", async () => {
  await withTempDir(async (root) => {
    const nested = path.join(root, "packages", "api");
    await mkdir(path.join(root, ".git"));
    await mkdir(nested, { recursive: true });

    assert.equal(await resolveProjectRoot(nested), root);
    await main(
      ["install", "code-review", "--project"],
      { cwd: nested, home: root, packageRoot: REPO, write: () => {} },
    );
    assert.match(
      await readFile(path.join(root, ".agents", "skills", "code-review", "SKILL.md"), "utf8"),
      /name: code-review/,
    );
    await assert.rejects(readdir(path.join(nested, ".agents", "skills")), { code: "ENOENT" });
  });
});

test("CLI installs into the injected home by default", async () => {
  await withTempDir(async (root) => {
    const project = path.join(root, "project");
    let output = "";
    assert.equal(await main(
      ["install", "code-review"],
      {
        cwd: project,
        home: root,
        packageRoot: REPO,
        write: (text) => { output += text; },
      },
    ), 0);

    assert.ok(output.includes(path.join(root, ".agents", "skills")));
    assert.match(
      await readFile(path.join(root, ".agents", "skills", "code-review", "SKILL.md"), "utf8"),
      /name: code-review/,
    );
    await assert.rejects(readdir(path.join(project, ".agents", "skills")), { code: "ENOENT" });
  });
});

test("installed npm bin symlinks are recognized as direct CLI invocations", async () => {
  await withTempDir(async (root) => {
    const binLink = path.join(root, "opencode-power-pack");
    const binSource = path.join(REPO, "bin", "opencode-power-pack.mjs");
    await symlink(binSource, binLink);

    assert.equal(isDirectInvocation(binLink), true);
    assert.equal(isDirectInvocation(path.join(root, "missing")), false);
  });
});
