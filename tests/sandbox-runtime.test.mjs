import { execFile } from "node:child_process";
import { EventEmitter } from "node:events";
import {
  chmod,
  link,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildChildEnvironment,
  commandToShellString,
  compileSandboxExecution,
  assertNoExternalHardlinks,
  existingSystemReadRoots,
  probeSandboxRuntime,
  quotePosixArgument,
  runSandboxedCommand,
} from "../bin/sandbox/runtime.mjs";

const execFileAsync = promisify(execFile);
const REPO = process.env.REPO || process.cwd();

function profile(name, overrides = {}) {
  const capabilities = {
    workspace: "read",
    temporaryFiles: "write",
    network: "deny",
    credentials: "deny",
    externalSideEffects: "deny",
    ...overrides,
  };
  return { name, description: name, riskLevel: 0, capabilities, enforcementLevel: "advisory" };
}

function compile(overrides = {}) {
  return compileSandboxExecution({
    profile: profile("observe"),
    workspace: REPO,
    runRoot: "/tmp/opp-sandbox-unit",
    sourceEnvironment: {
      PATH: "/usr/bin:/bin",
      LANG: "C.UTF-8",
      GH_TOKEN: "secret-gh-token",
      SSH_AUTH_SOCK: "/tmp/agent.sock",
    },
    originalHome: os.homedir(),
    helperPaths: {
      bwrap: "/usr/bin/bwrap",
      rg: "/usr/bin/rg",
      socat: "/usr/bin/socat",
    },
    ...overrides,
  });
}

test("observe compiles to read-only workspace, private temporary writes, and a scrubbed environment", () => {
  const result = compile();

  assert.deepEqual(result.runtimeConfig.filesystem.allowRead, [REPO, "/tmp/opp-sandbox-unit"]);
  assert.deepEqual(result.runtimeConfig.filesystem.allowWrite, ["/tmp/opp-sandbox-unit"]);
  assert.deepEqual(result.runtimeConfig.filesystem.denyRead, [path.parse(REPO).root]);
  assert.equal(result.runtimeConfig.network.strictAllowlist, true);
  assert.deepEqual(result.runtimeConfig.network.allowedDomains, []);
  assert.equal(result.runtimeConfig.enableWeakerNestedSandbox, false);
  assert.equal(result.runtimeConfig.enableWeakerNetworkIsolation, false);
  assert.equal(result.runtimeConfig.allowAppleEvents, false);
  assert.equal(result.childEnvironment.GH_TOKEN, undefined);
  assert.equal(result.childEnvironment.SSH_AUTH_SOCK, undefined);
  assert.equal(result.childEnvironment.HOME, "/tmp/opp-sandbox-unit/home");
  assert.equal(result.childEnvironment.TMPDIR, "/tmp/opp-sandbox-unit/tmp");
  assert.ok(
    result.runtimeConfig.credentials.files.some((entry) => entry.path === path.join(REPO, ".env")),
  );
});

test("system runtime reads do not expose all of usr or usr-local configuration", async () => {
  const roots = await existingSystemReadRoots(process.platform);
  assert.equal(roots.includes("/usr"), false);
  assert.equal(roots.includes("/usr/local"), false);
  assert.ok(roots.includes(await realpath("/usr/bin")));
});

function isParent(candidate, target) {
  const relative = path.relative(candidate, target);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

test("develop permits workspace writes without granting network or credentials", () => {
  const result = compile({
    profile: profile("develop", { workspace: "write" }),
  });

  assert.deepEqual(result.runtimeConfig.filesystem.allowWrite, [REPO, "/tmp/opp-sandbox-unit"]);
  assert.deepEqual(result.runtimeConfig.network.allowedDomains, []);
  assert.equal(result.childEnvironment.GH_TOKEN, undefined);
  assert.ok(result.runtimeConfig.filesystem.denyWrite.includes(path.join(REPO, ".git", "hooks")));
  assert.ok(result.runtimeConfig.filesystem.denyWrite.includes(path.join(REPO, ".agents")));
});

test("compilation denies upstream shared Claude temporary paths on every platform", () => {
  const result = compile({
    temporaryRoot: "/private/var/folders/example/T",
  });

  assert.ok(result.runtimeConfig.filesystem.denyWrite.includes("/tmp/claude"));
  assert.ok(result.runtimeConfig.filesystem.denyWrite.includes("/private/tmp/claude"));
  assert.ok(
    result.runtimeConfig.filesystem.denyWrite.includes("/private/var/folders/example/T/claude"),
  );
});

test("workspace hardlink scan allows internal links and rejects links to external inodes", async () => {
  const fixture = await mkdtemp(path.join(os.tmpdir(), "opp-hardlink-unit-"));
  const workspace = path.join(fixture, "workspace");
  const outside = path.join(fixture, "outside.txt");
  await mkdir(workspace);
  await writeFile(outside, "outside", "utf8");
  await link(outside, path.join(workspace, "external-link"));
  try {
    await assert.rejects(assertNoExternalHardlinks(workspace), /external hardlink/);
    await rm(path.join(workspace, "external-link"));
    await writeFile(path.join(workspace, "internal-a"), "inside", "utf8");
    await link(path.join(workspace, "internal-a"), path.join(workspace, "internal-b"));
    await assert.doesNotReject(assertNoExternalHardlinks(workspace));
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test("network-read blocks raw protocols and mutation-oriented HTTP methods", async () => {
  const result = compile({
    profile: profile("network-read", {
      workspace: "write",
      network: "explicit",
      credentials: "explicit",
    }),
    allowedDomains: ["api.github.com:443"],
    readOnlySocksProxyPort: 43123,
  });

  assert.deepEqual(result.runtimeConfig.network.allowedDomains, ["api.github.com:443"]);
  assert.equal(result.runtimeConfig.network.socksProxyPort, 43123);
  assert.deepEqual(result.runtimeConfig.network.tlsTerminate, {});
  assert.deepEqual(
    await result.runtimeConfig.network.filterRequest(new Request("https://api.github.com", {
      method: "GET",
    })),
    { action: "allow" },
  );
  assert.equal(
    (await result.runtimeConfig.network.filterRequest(new Request("https://api.github.com", {
      method: "POST",
    }))).action,
    "deny",
  );
});

test("capability grants and publish confirmation fail closed", () => {
  assert.throws(() => compile({ allowedDomains: ["example.com"] }), /does not permit network/);
  assert.throws(() => compile({ allowedEnvironment: ["GH_TOKEN"] }), /does not permit credential/);
  assert.throws(
    () => compile({ confirmExternalSideEffects: true }),
    /does not permit external side-effect confirmation/,
  );
  assert.throws(
    () => compile({
      profile: profile("publish", {
        workspace: "write",
        network: "explicit",
        credentials: "explicit",
        externalSideEffects: "confirm",
      }),
    }),
    /requires --confirm-external-side-effects/,
  );
  assert.throws(
    () => compile({
      profile: profile("publish", {
        workspace: "write",
        network: "explicit",
        credentials: "explicit",
        externalSideEffects: "confirm",
      }),
      allowedEnvironment: ["NODE_OPTIONS"],
      confirmExternalSideEffects: true,
    }),
    /cannot be granted/,
  );
});

test("an explicit credential exposes only the named variable", () => {
  const result = compile({
    profile: profile("publish", {
      workspace: "write",
      network: "explicit",
      credentials: "explicit",
      externalSideEffects: "confirm",
    }),
    allowedEnvironment: ["GH_TOKEN"],
    confirmExternalSideEffects: true,
  });

  assert.equal(result.childEnvironment.GH_TOKEN, "secret-gh-token");
  assert.equal(result.childEnvironment.SSH_AUTH_SOCK, undefined);
  assert.ok(result.runtimeConfig.credentials.envVars.some((entry) => entry.name === "SSH_AUTH_SOCK"));
  assert.ok(!result.runtimeConfig.credentials.envVars.some((entry) => entry.name === "GH_TOKEN"));
});

test("child environment removes workspace-controlled PATH entries", () => {
  const environment = buildChildEnvironment({
    sourceEnvironment: {
      PATH: `${REPO}/bin${path.delimiter}/usr/bin${path.delimiter}relative/bin`,
      LANG: "C",
    },
    allowedEnvironment: [],
    workspace: REPO,
    runRoot: "/tmp/opp-sandbox-unit",
  });

  assert.equal(environment.PATH, "/usr/bin");
  assert.equal(environment.LANG, "C");
});

test("POSIX quoting preserves shell metacharacters as literal argv", async () => {
  const values = [
    "plain",
    "space value",
    "",
    "single'quote",
    "$(printf injected)",
    "`printf injected`",
    "semi;colon",
    "line\nbreak",
    "*.mjs",
    "--skill",
    "unicode-雪",
  ];
  const command = commandToShellString([
    process.execPath,
    "-e",
    "process.stdout.write(JSON.stringify(process.argv.slice(1)))",
    ...values,
  ]);
  const { stdout } = await execFileAsync("/bin/sh", ["-c", command], { cwd: REPO });

  assert.deepEqual(JSON.parse(stdout), values);
  assert.equal(quotePosixArgument("a'b"), `'a'"'"'b'`);
  assert.throws(() => quotePosixArgument("bad\0value"), /NUL/);
});

test("runtime probing reports readiness and fails closed on unsupported or missing backends", async () => {
  const ready = await probeSandboxRuntime({
    platform: "linux",
    loadRuntime: async () => ({
      SandboxManager: {
        isSupportedPlatform: () => true,
        checkDependenciesAsync: async () => ({ errors: [], warnings: ["preview"] }),
      },
    }),
    hostProbe: async () => ({ errors: [], warnings: [] }),
  });
  assert.equal(ready.runnerReady, true);
  assert.equal(ready.executionLevel, "shell-contained");
  assert.deepEqual(ready.warnings, ["preview"]);

  const unsupported = await probeSandboxRuntime({ platform: "win32" });
  assert.equal(unsupported.runnerReady, false);
  assert.match(unsupported.errors[0], /Unsupported platform/);

  const missing = await probeSandboxRuntime({
    platform: "linux",
    loadRuntime: async () => { throw new Error("module missing"); },
  });
  assert.equal(missing.runnerReady, false);
  assert.deepEqual(missing.errors, ["module missing"]);
});

function fakeSpawn(exitCode, onSpawn) {
  return (file, args, options) => {
    onSpawn?.(file, args, options);
    const child = new EventEmitter();
    queueMicrotask(() => child.emit("close", exitCode, null));
    return child;
  };
}

test("runner initializes before spawn, uses shell false, propagates exit codes, and resets once", async () => {
  let initialized;
  let resetCount = 0;
  let spawnOptions;
  let wrappedCommand;
  const manager = {
    isSupportedPlatform: () => true,
    initialize: async (config) => { initialized = config; },
    wrapWithSandboxArgv: async (command) => {
      wrappedCommand = command;
      return { argv: ["/fake/sandbox", "wrapped"], env: { SHOULD_NOT_LEAK: "yes" } };
    },
    reset: async () => { resetCount += 1; },
  };
  let diagnostics = "";
  const exitCode = await runSandboxedCommand({
    profile: profile("observe"),
    allowedDomains: [],
    allowedEnvironment: [],
    confirmExternalSideEffects: false,
    command: ["printf", "%s", "literal;$(not-run)"],
  }, {
    cwd: REPO,
    home: os.homedir(),
    env: { PATH: "/usr/bin:/bin", GH_TOKEN: "secret" },
    helperPaths: { bwrap: "/usr/bin/bwrap", rg: "/usr/bin/rg", socat: "/usr/bin/socat" },
    platform: "linux",
    loadRuntime: async () => ({
      SandboxManager: manager,
      SandboxRuntimeConfigSchema: { parse: (config) => config },
    }),
    spawn: fakeSpawn(7, (_file, _args, options) => { spawnOptions = options; }),
    writeError: (text) => { diagnostics += text; },
  });

  assert.equal(exitCode, 7);
  assert.equal(resetCount, 1);
  assert.equal(spawnOptions.shell, false);
  assert.equal(spawnOptions.env.GH_TOKEN, undefined);
  assert.equal(spawnOptions.env.SHOULD_NOT_LEAK, undefined);
  assert.equal(initialized.enableWeakerNestedSandbox, false);
  assert.equal(wrappedCommand, `'printf' '%s' 'literal;$(not-run)'`);
  assert.match(diagnostics, /Sandbox: observe, shell-contained/);
  assert.doesNotMatch(diagnostics, /GH_TOKEN|secret|literal/);
});

test("runner canonicalizes a symlinked temporary root before compiling private paths", async () => {
  const fixture = await mkdtemp(path.join(os.tmpdir(), "opp-canonical-temp-"));
  const actualTemporaryRoot = path.join(fixture, "actual-temp");
  const linkedTemporaryRoot = path.join(fixture, "linked-temp");
  const workspace = path.join(fixture, "workspace");
  await mkdir(actualTemporaryRoot);
  await mkdir(workspace);
  await symlink(actualTemporaryRoot, linkedTemporaryRoot);
  let spawnEnvironment;
  const manager = {
    isSupportedPlatform: () => true,
    initialize: async () => {},
    wrapWithSandboxArgv: async () => ({ argv: ["/fake/sandbox"], env: {} }),
    reset: async () => {},
  };

  try {
    assert.equal(await runSandboxedCommand({
      profile: profile("observe"),
      allowedDomains: [],
      allowedEnvironment: [],
      confirmExternalSideEffects: false,
      command: ["true"],
    }, {
      cwd: workspace,
      home: os.homedir(),
      temporaryRoot: linkedTemporaryRoot,
      env: { PATH: "/usr/bin:/bin" },
      platform: "darwin",
      loadRuntime: async () => ({
        SandboxManager: manager,
        SandboxRuntimeConfigSchema: { parse: (config) => config },
      }),
      spawn: fakeSpawn(0, (_file, _args, options) => { spawnEnvironment = options.env; }),
    }), 0);
    assert.ok(spawnEnvironment.HOME.startsWith(`${await realpath(actualTemporaryRoot)}${path.sep}`));
    assert.ok(spawnEnvironment.TMPDIR.startsWith(`${await realpath(actualTemporaryRoot)}${path.sep}`));
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test("runner rejects a workspace inside an upstream shared-write compatibility path", async () => {
  const fixture = await mkdtemp(path.join(os.tmpdir(), "opp-shared-write-root-"));
  const workspace = path.join(fixture, "claude", "project");
  await mkdir(workspace, { recursive: true });
  try {
    await assert.rejects(runSandboxedCommand({
      profile: profile("develop", { workspace: "write" }),
      allowedDomains: [],
      allowedEnvironment: [],
      confirmExternalSideEffects: false,
      command: ["true"],
    }, {
      cwd: workspace,
      home: os.homedir(),
      temporaryRoot: fixture,
      env: { PATH: "/usr/bin:/bin" },
      platform: "darwin",
    }), /protected shared-write path/);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test("runner rejects Linux helpers from an attacker-writable PATH directory", async () => {
  const fixture = await mkdtemp(path.join(os.tmpdir(), "opp-helper-trust-"));
  const workspace = path.join(fixture, "workspace");
  const hostileBin = path.join(fixture, "hostile-bin");
  await mkdir(workspace);
  await mkdir(hostileBin);
  for (const helper of ["bwrap", "rg", "socat"]) {
    const executable = path.join(hostileBin, helper);
    await writeFile(executable, "#!/bin/sh\nexit 0\n", "utf8");
    await chmod(executable, 0o755);
  }
  try {
    await assert.rejects(runSandboxedCommand({
      profile: profile("observe"),
      allowedDomains: [],
      allowedEnvironment: [],
      confirmExternalSideEffects: false,
      command: ["true"],
    }, {
      cwd: workspace,
      home: os.homedir(),
      temporaryRoot: fixture,
      env: { PATH: hostileBin },
      platform: "linux",
    }), /trusted host paths/);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test("runner exposes an explicitly selected executable outside static system roots", async () => {
  const fixture = await mkdtemp(path.join(os.tmpdir(), "opp-command-root-"));
  const workspace = path.join(fixture, "workspace");
  const tools = path.join(fixture, "toolcache", "bin");
  const executable = path.join(tools, "custom-node");
  const runtimeResource = path.join(fixture, "toolcache", "lib", "resource.txt");
  await mkdir(workspace);
  await mkdir(tools, { recursive: true });
  await mkdir(path.dirname(runtimeResource), { recursive: true });
  await writeFile(path.join(fixture, "toolcache", "package.json"), "{}\n", "utf8");
  await writeFile(runtimeResource, "runtime-resource", "utf8");
  await writeFile(executable, "#!/bin/sh\nexit 0\n", "utf8");
  await chmod(executable, 0o755);
  let runtimeConfig;
  const manager = {
    isSupportedPlatform: () => true,
    initialize: async (config) => { runtimeConfig = config; },
    wrapWithSandboxArgv: async () => ({ argv: ["/fake/sandbox"], env: {} }),
    reset: async () => {},
  };
  try {
    assert.equal(await runSandboxedCommand({
      profile: profile("observe"),
      allowedDomains: [],
      allowedEnvironment: [],
      confirmExternalSideEffects: false,
      command: [executable],
    }, {
      cwd: workspace,
      home: os.homedir(),
      temporaryRoot: fixture,
      env: { PATH: "/usr/bin:/bin" },
      helperPaths: { bwrap: "/usr/bin/bwrap", rg: "/usr/bin/rg", socat: "/usr/bin/socat" },
      platform: "linux",
      loadRuntime: async () => ({
        SandboxManager: manager,
        SandboxRuntimeConfigSchema: { parse: (config) => config },
      }),
      spawn: fakeSpawn(0),
    }), 0);
    assert.ok(runtimeConfig.filesystem.allowRead.some(
      (allowed) => allowed === executable || isParent(allowed, executable),
    ));
    assert.ok(runtimeConfig.filesystem.allowRead.some(
      (allowed) => allowed === runtimeResource || isParent(allowed, runtimeResource),
    ));
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test("runner exposes an env shebang interpreter and its bounded runtime", async () => {
  const fixture = await mkdtemp(path.join(os.tmpdir(), "opp-shebang-root-"));
  const workspace = path.join(fixture, "workspace");
  const toolRoot = path.join(fixture, "tool");
  const executable = path.join(toolRoot, "bin", "env-tool");
  const fakeHome = path.join(fixture, "home");
  const interpreterBin = path.join(fakeHome, "bin");
  const interpreter = path.join(interpreterBin, "custom-node");
  await mkdir(workspace);
  await mkdir(path.dirname(executable), { recursive: true });
  await mkdir(interpreterBin, { recursive: true });
  await mkdir(path.join(fakeHome, "lib", "node_modules"), { recursive: true });
  await writeFile(path.join(toolRoot, "package.json"), "{}\n", "utf8");
  await writeFile(executable, "#!/usr/bin/env -S custom-node --no-warnings\n", "utf8");
  await chmod(executable, 0o755);
  await symlink(process.execPath, interpreter);
  let runtimeConfig;
  const manager = {
    isSupportedPlatform: () => true,
    initialize: async (config) => { runtimeConfig = config; },
    wrapWithSandboxArgv: async () => ({ argv: ["/fake/sandbox"], env: {} }),
    reset: async () => {},
  };
  try {
    assert.equal(await runSandboxedCommand({
      profile: profile("observe"),
      allowedDomains: [],
      allowedEnvironment: [],
      confirmExternalSideEffects: false,
      command: [executable],
    }, {
      cwd: workspace,
      home: fakeHome,
      temporaryRoot: fixture,
      env: { PATH: `${interpreterBin}${path.delimiter}/usr/bin:/bin` },
      platform: "darwin",
      loadRuntime: async () => ({
        SandboxManager: manager,
        SandboxRuntimeConfigSchema: { parse: (config) => config },
      }),
      spawn: fakeSpawn(0),
    }), 0);
    assert.ok(runtimeConfig.filesystem.allowRead.includes(interpreter));
    assert.ok(runtimeConfig.filesystem.allowRead.includes(await realpath(process.execPath)));
    for (const broadRoot of ["/usr", "/usr/local", fakeHome, fixture]) {
      assert.equal(runtimeConfig.filesystem.allowRead.includes(broadRoot), false);
    }
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test("runner discovers Git roots from nested directories and validates linked worktrees", async () => {
  const fixture = await mkdtemp(path.join(os.tmpdir(), "opp-git-root-"));
  const repository = path.join(fixture, "repository");
  const nested = path.join(repository, "src", "nested");
  const linkedWorktree = path.join(fixture, "linked-worktree");
  const submodule = path.join(repository, "submodule");
  const submoduleGitDirectory = path.join(repository, ".git", "modules", "submodule");
  const siblingSubmodule = path.join(repository, "sibling-submodule");
  const siblingSubmoduleGitDirectory = path.join(repository, ".git", "modules", "sibling-submodule");
  const credentialSibling = path.join(repository, "src", "sibling");
  const deepCredential = path.join(
    repository,
    ...Array.from({ length: 12 }, (_value, index) => `level-${index}`),
    ".npmrc",
  );
  await mkdir(nested, { recursive: true });
  await mkdir(path.join(credentialSibling, ".ssh"), { recursive: true });
  await writeFile(path.join(credentialSibling, ".npmrc"), "credential", "utf8");
  await mkdir(path.dirname(deepCredential), { recursive: true });
  await writeFile(deepCredential, "deep-credential", "utf8");
  await execFileAsync("git", ["init", "--quiet", repository]);
  await mkdir(path.dirname(submoduleGitDirectory), { recursive: true });
  await execFileAsync("git", [
    "init",
    "--quiet",
    "--separate-git-dir",
    submoduleGitDirectory,
    submodule,
  ]);
  await execFileAsync("git", [
    "init",
    "--quiet",
    "--separate-git-dir",
    siblingSubmoduleGitDirectory,
    siblingSubmodule,
  ]);
  await execFileAsync("git", [
    "config",
    "--file",
    path.join(submoduleGitDirectory, "config"),
    "core.worktree",
    "../../../submodule",
  ]);
  await execFileAsync("git", [
    "config",
    "--file",
    path.join(siblingSubmoduleGitDirectory, "config"),
    "core.worktree",
    "../../../sibling-submodule",
  ]);
  await writeFile(path.join(repository, ".gitmodules"), [
    '[submodule "submodule"]',
    "\tpath = submodule",
    '[submodule "sibling-submodule"]',
    "\tpath = sibling-submodule",
    "",
  ].join("\n"), "utf8");
  const submoduleNested = path.join(submodule, "nested");
  await mkdir(submoduleNested);
  await execFileAsync("git", [
    "-C",
    repository,
    "worktree",
    "add",
    "--quiet",
    "--orphan",
    linkedWorktree,
  ]);
  const linkedNested = path.join(linkedWorktree, "src");
  await mkdir(linkedNested);
  let runtimeConfig;
  let wrappedCwd;
  const manager = {
    isSupportedPlatform: () => true,
    initialize: async (config) => { runtimeConfig = config; },
    wrapWithSandboxArgv: async (_command, _shell, _a, _b, cwd) => {
      wrappedCwd = cwd;
      return { argv: ["/fake/sandbox"], env: {} };
    },
    reset: async () => {},
  };
  const execute = (cwd) => runSandboxedCommand({
    profile: profile("observe"),
    allowedDomains: [],
    allowedEnvironment: [],
    confirmExternalSideEffects: false,
    command: ["git", "status", "--short"],
  }, {
    cwd,
    home: os.homedir(),
    temporaryRoot: fixture,
    env: { PATH: "/usr/bin:/bin" },
    platform: "darwin",
    loadRuntime: async () => ({
      SandboxManager: manager,
      SandboxRuntimeConfigSchema: { parse: (config) => config },
    }),
    spawn: fakeSpawn(0),
  });
  try {
    assert.equal(await execute(nested), 0);
    assert.equal(wrappedCwd, nested);
    assert.ok(runtimeConfig.filesystem.allowRead.includes(repository));
    assert.ok(runtimeConfig.credentials.files.some(
      (entry) => entry.path === path.join(nested, ".env") && entry.mode === "deny",
    ));
    assert.ok(runtimeConfig.credentials.files.some(
      (entry) => entry.path === path.join(repository, "**", ".env") && entry.mode === "deny",
    ));
    assert.ok(runtimeConfig.filesystem.denyWrite.includes(path.join(nested, ".npmrc")));
    assert.ok(runtimeConfig.filesystem.denyWrite.includes(path.join(credentialSibling, ".npmrc")));
    assert.ok(runtimeConfig.filesystem.denyWrite.includes(path.join(credentialSibling, ".ssh")));
    assert.ok(runtimeConfig.filesystem.denyWrite.includes(deepCredential));
    assert.ok(runtimeConfig.filesystem.denyWrite.includes(path.join(submodule, ".git")));
    assert.ok(runtimeConfig.filesystem.denyWrite.includes(
      path.join(submoduleGitDirectory, "config"),
    ));

    assert.equal(await execute(linkedNested), 0);
    assert.equal(wrappedCwd, linkedNested);
    assert.ok(runtimeConfig.filesystem.allowRead.includes(linkedWorktree));
    assert.ok(runtimeConfig.filesystem.allowRead.includes(path.join(repository, ".git")));
    assert.ok(runtimeConfig.filesystem.denyWrite.includes(path.join(repository, ".git", "config")));

    assert.equal(await execute(submoduleNested), 0);
    assert.equal(wrappedCwd, submoduleNested);
    assert.ok(runtimeConfig.filesystem.allowRead.includes(submodule));
    assert.ok(runtimeConfig.filesystem.allowRead.includes(submoduleGitDirectory));
    assert.equal(runtimeConfig.filesystem.allowRead.includes(repository), false);
    assert.ok(runtimeConfig.filesystem.denyWrite.includes(path.join(submodule, ".git")));

    await writeFile(
      path.join(submodule, ".git"),
      `gitdir: ${siblingSubmoduleGitDirectory}\n`,
      "utf8",
    );
    await writeFile(path.join(repository, ".gitmodules"), [
      '[submodule "sibling-submodule"]',
      "\tpath = submodule",
      "",
    ].join("\n"), "utf8");
    await assert.rejects(execute(submoduleNested), /Untrusted submodule Git metadata/);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test("runner rejects concurrent in-process execution instead of sharing global sandbox state", async () => {
  let releaseSpawn;
  const spawnStarted = new Promise((resolve) => { releaseSpawn = resolve; });
  let finishChild;
  const childFinished = new Promise((resolve) => { finishChild = resolve; });
  const manager = {
    isSupportedPlatform: () => true,
    initialize: async () => {},
    wrapWithSandboxArgv: async () => ({ argv: ["/fake/sandbox"], env: {} }),
    reset: async () => {},
  };
  const context = {
    cwd: REPO,
    home: os.homedir(),
    env: { PATH: "/usr/bin:/bin" },
    helperPaths: { bwrap: "/usr/bin/bwrap", rg: "/usr/bin/rg", socat: "/usr/bin/socat" },
    platform: "linux",
    loadRuntime: async () => ({
      SandboxManager: manager,
      SandboxRuntimeConfigSchema: { parse: (config) => config },
    }),
    spawn: () => {
      const child = new EventEmitter();
      releaseSpawn();
      childFinished.then(() => child.emit("close", 0, null));
      return child;
    },
  };
  const options = {
    profile: profile("observe"),
    allowedDomains: [],
    allowedEnvironment: [],
    confirmExternalSideEffects: false,
    command: ["true"],
  };

  const first = runSandboxedCommand(options, context);
  await spawnStarted;
  await assert.rejects(runSandboxedCommand(options, context), /already active/);
  finishChild();
  assert.equal(await first, 0);
  assert.equal(await runSandboxedCommand(options, {
    ...context,
    spawn: fakeSpawn(0),
  }), 0);
});

test("runner forwards termination to the isolated child group and restores signal handlers", async () => {
  const signalSource = new EventEmitter();
  let existingSignalHandlerRuns = 0;
  const existingSignalHandler = () => { existingSignalHandlerRuns += 1; };
  signalSource.on("SIGTERM", existingSignalHandler);
  const child = new EventEmitter();
  child.pid = 4321;
  let spawnOptions;
  let notifySpawn;
  const spawned = new Promise((resolve) => { notifySpawn = resolve; });
  const kills = [];
  let backendSignalCleanupRan = false;
  function cleanupHandler() { backendSignalCleanupRan = true; }
  const manager = {
    isSupportedPlatform: () => true,
    initialize: async () => {
      signalSource.once("SIGINT", cleanupHandler);
      signalSource.once("SIGTERM", cleanupHandler);
      signalSource.once("exit", cleanupHandler);
    },
    wrapWithSandboxArgv: async () => ({ argv: ["/fake/sandbox"], env: {} }),
    reset: async () => {},
  };
  const execution = runSandboxedCommand({
    profile: profile("observe"),
    allowedDomains: [],
    allowedEnvironment: [],
    confirmExternalSideEffects: false,
    command: ["true"],
  }, {
    cwd: REPO,
    home: os.homedir(),
    env: { PATH: "/usr/bin:/bin" },
    helperPaths: { bwrap: "/usr/bin/bwrap", rg: "/usr/bin/rg", socat: "/usr/bin/socat" },
    platform: "linux",
    loadRuntime: async () => ({
      SandboxManager: manager,
      SandboxRuntimeConfigSchema: { parse: (config) => config },
    }),
    spawn: (_file, _args, options) => {
      spawnOptions = options;
      notifySpawn();
      return child;
    },
    signalSource,
    runtimeSignalSource: signalSource,
    killProcess: (pid, signal) => {
      kills.push([pid, signal]);
      queueMicrotask(() => child.emit("close", 0, null));
    },
  });

  await spawned;
  signalSource.emit("SIGTERM");
  assert.equal(await execution, 143);
  assert.equal(spawnOptions.detached, true);
  assert.deepEqual(kills, [[-4321, "SIGTERM"]]);
  assert.equal(backendSignalCleanupRan, false);
  assert.equal(existingSignalHandlerRuns, 1);
  assert.equal(signalSource.listenerCount("exit"), 0);
  assert.equal(signalSource.listenerCount("SIGINT"), 0);
  assert.deepEqual(signalSource.listeners("SIGTERM"), [existingSignalHandler]);
  signalSource.removeListener("SIGTERM", existingSignalHandler);
});

test("runner treats SIGHUP as fail-closed child-group termination", async () => {
  const signalSource = new EventEmitter();
  const child = new EventEmitter();
  child.pid = 9876;
  let notifySpawn;
  const spawned = new Promise((resolve) => { notifySpawn = resolve; });
  const kills = [];
  const manager = {
    isSupportedPlatform: () => true,
    initialize: async () => {},
    wrapWithSandboxArgv: async () => ({ argv: ["/fake/sandbox"], env: {} }),
    reset: async () => {},
  };
  const execution = runSandboxedCommand({
    profile: profile("observe"),
    allowedDomains: [],
    allowedEnvironment: [],
    confirmExternalSideEffects: false,
    command: ["true"],
  }, {
    cwd: REPO,
    home: os.homedir(),
    env: { PATH: "/usr/bin:/bin" },
    helperPaths: { bwrap: "/usr/bin/bwrap", rg: "/usr/bin/rg", socat: "/usr/bin/socat" },
    platform: "linux",
    loadRuntime: async () => ({
      SandboxManager: manager,
      SandboxRuntimeConfigSchema: { parse: (config) => config },
    }),
    spawn: () => {
      notifySpawn();
      return child;
    },
    signalSource,
    runtimeSignalSource: signalSource,
    killProcess: (pid, signal) => {
      kills.push([pid, signal]);
      queueMicrotask(() => child.emit("close", 0, null));
    },
  });

  await spawned;
  signalSource.emit("SIGHUP");
  assert.equal(await execution, 129);
  assert.deepEqual(kills, [[-9876, "SIGHUP"]]);
  assert.equal(signalSource.listenerCount("SIGHUP"), 0);
});

test("initialization failures never spawn and still reset the backend", async () => {
  let spawned = false;
  let resetCount = 0;
  const manager = {
    isSupportedPlatform: () => true,
    initialize: async () => { throw new Error("backend init failed"); },
    reset: async () => { resetCount += 1; },
  };

  await assert.rejects(
    runSandboxedCommand({
      profile: profile("observe"),
      allowedDomains: [],
      allowedEnvironment: [],
      confirmExternalSideEffects: false,
      command: ["true"],
    }, {
      cwd: REPO,
      home: os.homedir(),
      env: { PATH: "/usr/bin:/bin" },
      helperPaths: { bwrap: "/usr/bin/bwrap", rg: "/usr/bin/rg", socat: "/usr/bin/socat" },
      platform: "linux",
      loadRuntime: async () => ({
        SandboxManager: manager,
        SandboxRuntimeConfigSchema: { parse: (config) => config },
      }),
      spawn: () => { spawned = true; },
    }),
    /backend init failed/,
  );
  assert.equal(spawned, false);
  assert.equal(resetCount, 1);
});

test("the runtime dependency is exactly pinned in package metadata and lock data", async () => {
  const packageJson = JSON.parse(await readFile(path.join(REPO, "package.json"), "utf8"));
  const lock = JSON.parse(await readFile(path.join(REPO, "package-lock.json"), "utf8"));

  assert.equal(packageJson.dependencies["@anthropic-ai/sandbox-runtime"], "0.0.73");
  assert.equal(packageJson.engines.node, ">=20.11.0");
  assert.equal(lock.packages[""].dependencies["@anthropic-ai/sandbox-runtime"], "0.0.73");
  assert.equal(
    lock.packages["node_modules/@anthropic-ai/sandbox-runtime"].integrity,
    "sha512-F608iUirrCqwvInZYGRRgJWDQj0tt6fNVE9aPagpotLJ5LhC4JbrMFIIZww5MFjb+HRCkpE0+xdI79c30tdVYg==",
  );
});
