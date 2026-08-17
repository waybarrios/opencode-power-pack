import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const REPO = process.env.REPO || process.cwd();

test("published package ships every skill and the sandbox runtime entrypoint", () => {
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
  assert.ok(packaged.has(".codex-plugin/plugin.json"), "Codex plugin manifest is published");
  assert.ok(packaged.has(".claude-plugin/plugin.json"), "Claude Code plugin manifest is published");
  assert.ok(
    packaged.has(".claude-plugin/marketplace.json"),
    "Claude Code marketplace is published",
  );
  assert.ok(
    packaged.has("skills/code-review/agents/openai.yaml"),
    "comprehensive review metadata is published",
  );
  assert.ok(
    packaged.has("skills/code-reviewer/agents/openai.yaml"),
    "focused review metadata is published",
  );
  assert.ok(packaged.has("bin/opencode-power-pack.mjs"), "selective installer is published");
  assert.ok(packaged.has("bin/sandbox/policy.mjs"), "sandbox policy resolver is published");
  assert.ok(packaged.has("bin/sandbox/runtime.mjs"), "sandbox runtime adapter is published");
  assert.ok(packaged.has("sandbox/contract.json"), "sandbox contract is published");
  assert.ok(packaged.has("sandbox/contract.schema.json"), "sandbox schema is published");
  assert.ok(
    packaged.has("docs/sandbox-compatibility.md"),
    "cross-agent sandbox compatibility documentation is published",
  );
  assert.ok(packaged.has("skillsets.json"), "selective profiles are published");
  for (const prefix of ["evals/", "scripts/", "tests/", "docs/superpowers/"]) {
    assert.equal(
      files.some((file) => file.path.startsWith(prefix)),
      false,
      `${prefix} is contributor-only`,
    );
  }
});

test("plugin loads as an ES module without runtime warnings", () => {
  const packedRoot = mkdtempSync(join(tmpdir(), "opp-package-surface-"));
  try {
    mkdirSync(join(packedRoot, ".opencode"), { recursive: true });
    cpSync(join(REPO, ".opencode", "plugins"), join(packedRoot, ".opencode", "plugins"), { recursive: true });
    cpSync(join(REPO, "skills"), join(packedRoot, "skills"), { recursive: true });
    writeFileSync(join(packedRoot, "package.json"), '{"type":"module"}\n', "utf8");

    const result = spawnSync(
      process.execPath,
      ["--input-type=module", "--eval", "await import('./.opencode/plugins/opencode-power-pack.js')"],
      { cwd: packedRoot, encoding: "utf8" },
    );

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, "");
  } finally {
    rmSync(packedRoot, { recursive: true, force: true });
  }
});

test("packed npm artifact exposes a working selective-installer executable", () => {
  const packedRoot = mkdtempSync(join(tmpdir(), "opp-packed-bin-"));
  const installRoot = join(packedRoot, "consumer");
  const npmArtifactEnv = {
    ...process.env,
    npm_config_dry_run: "false",
    npm_config_json: "false",
    npm_config_loglevel: "silent",
    npm_config_registry: "https://registry.npmjs.org/",
  };
  try {
    mkdirSync(installRoot, { recursive: true });
    writeFileSync(join(installRoot, "package.json"), '{"private":true}\n', "utf8");
    const tarballName = execFileSync(
      "npm",
      ["pack", "--pack-destination", packedRoot],
      {
        cwd: REPO,
        encoding: "utf8",
        env: npmArtifactEnv,
      },
    ).trim().split(/\r?\n/).at(-1);
    const tarball = join(packedRoot, tarballName);
    execFileSync(
      "npm",
      ["install", "--ignore-scripts", "--no-audit", "--no-fund", tarball],
      { cwd: installRoot, encoding: "utf8", env: npmArtifactEnv },
    );

    const executable = join(
      installRoot,
      "node_modules",
      ".bin",
      process.platform === "win32" ? "opencode-power-pack.cmd" : "opencode-power-pack",
    );
    const output = execFileSync(executable, ["list"], { cwd: installRoot, encoding: "utf8" });
    assert.match(output, /Profiles:/);
    assert.match(output, /recommended/);
    assert.match(output, /code-review/);
    const sandboxDoctor = spawnSync(executable, ["sandbox", "doctor"], {
      cwd: installRoot,
      encoding: "utf8",
    });
    const sandboxOutput = sandboxDoctor.stdout;
    assert.match(sandboxOutput, /Sandbox contract: valid/);
    assert.match(sandboxOutput, /Assigned skills: 54\/54/);
    assert.match(sandboxOutput, /Backend: @anthropic-ai\/sandbox-runtime@0\.0\.73/);
    assert.match(sandboxOutput, /Strict ready: no/);
    assert.equal(
      sandboxDoctor.status,
      /Runner ready: yes/.test(sandboxOutput) ? 0 : 1,
      sandboxDoctor.stderr,
    );
    const installedManifest = JSON.parse(
      readFileSync(
        join(installRoot, "node_modules", "@waybarrios", "opencode-power-pack", "package.json"),
        "utf8",
      ),
    );
    assert.equal(installedManifest.dependencies["@anthropic-ai/sandbox-runtime"], "0.0.73");
    execFileSync(process.execPath, [
      "--input-type=module",
      "--eval",
      "const r=await import('@anthropic-ai/sandbox-runtime');if(typeof r.SandboxManager?.initialize!=='function')process.exit(2)",
    ], { cwd: installRoot, encoding: "utf8" });
    mkdirSync(join(installRoot, ".git"));
    execFileSync(executable, ["install", "code-review", "--project"], {
      cwd: installRoot,
      encoding: "utf8",
    });
    const installedPolicy = JSON.parse(
      readFileSync(
        join(installRoot, ".agents", "skills", "code-review", "SANDBOX_POLICY.json"),
        "utf8",
      ),
    );
    assert.equal(installedPolicy.skill, "code-review");
    assert.equal(installedPolicy.profile.name, "observe");
    assert.equal(installedPolicy.enforcementLevel, "advisory");
  } finally {
    rmSync(packedRoot, { recursive: true, force: true });
  }
});
