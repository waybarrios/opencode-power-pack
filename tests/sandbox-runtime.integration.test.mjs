import { createServer } from "node:http";
import { execFileSync } from "node:child_process";
import { chmod, link, mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  probeSandboxRuntime,
  runSandboxedCommand,
} from "../bin/sandbox/runtime.mjs";

const ENABLED = process.env.OPP_SANDBOX_INTEGRATION === "1";

function profile(name, capabilities) {
  return {
    name,
    description: name,
    riskLevel: 0,
    capabilities,
    enforcementLevel: "advisory",
  };
}

const OBSERVE = profile("observe", {
  workspace: "read",
  temporaryFiles: "write",
  network: "deny",
  credentials: "deny",
  externalSideEffects: "deny",
});
const DEVELOP = profile("develop", {
  workspace: "write",
  temporaryFiles: "write",
  network: "deny",
  credentials: "deny",
  externalSideEffects: "deny",
});
const NETWORK_READ = profile("network-read", {
  workspace: "write",
  temporaryFiles: "write",
  network: "explicit",
  credentials: "explicit",
  externalSideEffects: "deny",
});

async function run(profileValue, workspace, command, overrides = {}) {
  const { contextEnvironment = {}, ...executionOverrides } = overrides;
  return runSandboxedCommand({
    profile: profileValue,
    allowedDomains: [],
    allowedEnvironment: [],
    confirmExternalSideEffects: false,
    command,
    ...executionOverrides,
  }, {
    cwd: workspace,
    home: os.homedir(),
    env: {
      ...process.env,
      ...contextEnvironment,
      OPP_INTEGRATION_SECRET: "must-not-leak",
    },
  });
}

test("real runtime enforces filesystem, environment, network, argv, and exit boundaries", {
  skip: !ENABLED,
  timeout: 120_000,
}, async () => {
  const readiness = await probeSandboxRuntime();
  assert.equal(readiness.runnerReady, true, readiness.errors.join("; "));

  const workspace = await mkdtemp(path.join(os.tmpdir(), "opp-runtime-workspace-"));
  const outside = await mkdtemp(path.join(os.tmpdir(), "opp-runtime-outside-"));
  const toolBundle = await mkdtemp(path.join(os.tmpdir(), "opp-runtime-tool-"));
  const linkedParent = await mkdtemp(path.join(os.tmpdir(), "opp-runtime-linked-"));
  const outsideFile = path.join(outside, "canary.txt");
  const bundledTool = path.join(toolBundle, "bin", "bundled-tool");
  const envTool = path.join(toolBundle, "bin", "env-tool");
  const interpreterBin = path.join(toolBundle, "interpreter-bin");
  const customNode = path.join(interpreterBin, "custom-node");
  const nestedWorkspace = path.join(workspace, "src", "nested");
  const linkedWorktree = path.join(linkedParent, "checkout");
  const submodule = path.join(workspace, "submodule");
  const submoduleGitDirectory = path.join(workspace, ".git", "modules", "submodule");
  const credentialSibling = path.join(workspace, "src", "sibling");
  const deepCredential = path.join(
    workspace,
    ...Array.from({ length: 12 }, (_value, index) => `level-${index}`),
    ".npmrc",
  );
  await writeFile(path.join(workspace, "readable.txt"), "workspace-readable", "utf8");
  await writeFile(path.join(workspace, ".env"), "TOP_SECRET=do-not-read", "utf8");
  await mkdir(path.join(workspace, ".ssh"));
  await writeFile(path.join(workspace, ".ssh", "id_test"), "private-key", "utf8");
  await symlink(process.execPath, path.join(workspace, ".ssh", "run"));
  await symlink(path.join(workspace, ".ssh"), path.join(workspace, "credential-tools"));
  await writeFile(outsideFile, "outside-unchanged", "utf8");
  await mkdir(path.join(toolBundle, "bin"));
  await mkdir(path.join(toolBundle, "lib"));
  await mkdir(interpreterBin);
  await mkdir(nestedWorkspace, { recursive: true });
  await writeFile(path.join(nestedWorkspace, ".env"), "NESTED_SECRET=blocked", "utf8");
  await writeFile(path.join(nestedWorkspace, ".npmrc"), "//registry.example/:_authToken=blocked", "utf8");
  await mkdir(path.join(nestedWorkspace, ".ssh"));
  await writeFile(path.join(nestedWorkspace, ".ssh", "id_test"), "nested-private-key", "utf8");
  await mkdir(path.join(credentialSibling, ".ssh"), { recursive: true });
  await writeFile(path.join(credentialSibling, ".npmrc"), "sibling-token", "utf8");
  await writeFile(path.join(credentialSibling, ".ssh", "id_test"), "sibling-key", "utf8");
  await mkdir(path.dirname(deepCredential), { recursive: true });
  await writeFile(deepCredential, "deep-token", "utf8");
  await writeFile(path.join(toolBundle, "package.json"), "{}\n", "utf8");
  await writeFile(path.join(toolBundle, "lib", "value"), "ok\n", "utf8");
  await writeFile(
    bundledTool,
    "#!/bin/sh\ntest \"$(cat \"$(dirname \"$0\")/../lib/value\")\" = ok\n",
    "utf8",
  );
  await chmod(bundledTool, 0o755);
  await writeFile(
    envTool,
    "#!/usr/bin/env custom-node\nprocess.exit(require('fs').readFileSync(require('path').join(__dirname,'../lib/value'),'utf8').trim() === 'ok' ? 0 : 9)\n",
    "utf8",
  );
  await chmod(envTool, 0o755);
  await symlink(process.execPath, customNode);
  execFileSync("git", ["init", "--quiet"], { cwd: workspace, stdio: "ignore" });
  execFileSync("git", ["worktree", "add", "--quiet", "--orphan", linkedWorktree], {
    cwd: workspace,
    stdio: "ignore",
  });
  await mkdir(path.join(linkedWorktree, "nested"));
  await mkdir(path.dirname(submoduleGitDirectory), { recursive: true });
  execFileSync("git", [
    "init",
    "--quiet",
    "--separate-git-dir",
    submoduleGitDirectory,
    submodule,
  ], { stdio: "ignore" });
  execFileSync("git", [
    "config",
    "--file",
    path.join(submoduleGitDirectory, "config"),
    "core.worktree",
    "../../../submodule",
  ], { stdio: "ignore" });
  await writeFile(path.join(workspace, ".gitmodules"), [
    '[submodule "submodule"]',
    "\tpath = submodule",
    "",
  ].join("\n"), "utf8");
  await mkdir(path.join(submodule, "nested"));
  await symlink(outsideFile, path.join(workspace, "outside-link"));

  try {
    assert.equal(await run(OBSERVE, workspace, [
      process.execPath,
      "-e",
      "process.exit(require('fs').readFileSync('readable.txt','utf8') === 'workspace-readable' ? 0 : 9)",
    ]), 0);

    assert.equal(await run(OBSERVE, workspace, [bundledTool]), 0);

    assert.equal(await run(OBSERVE, workspace, [envTool], {
      contextEnvironment: {
        PATH: `${interpreterBin}${path.delimiter}${process.env.PATH || ""}`,
      },
    }), 0);

    await assert.rejects(run(OBSERVE, workspace, [
      path.join(workspace, "credential-tools", "run"),
      "-e",
      "require('fs').readFileSync('.ssh/id_test')",
    ]), /unsafe executable symlink directory/);
    assert.equal(await readFile(path.join(workspace, ".ssh", "id_test"), "utf8"), "private-key");

    assert.equal(await run(OBSERVE, workspace, ["git", "status", "--short"]), 0);
    assert.equal(await run(OBSERVE, nestedWorkspace, ["git", "status", "--short"]), 0);
    assert.equal(await run(OBSERVE, path.join(linkedWorktree, "nested"), [
      "git",
      "status",
      "--short",
    ]), 0);
    assert.equal(await run(OBSERVE, path.join(submodule, "nested"), [
      "git",
      "status",
      "--short",
    ]), 0);

    assert.equal(await run(OBSERVE, nestedWorkspace, [
      process.execPath,
      "-e",
      "for(const f of ['.env','.npmrc','.ssh/id_test']){try{require('fs').readFileSync(f);process.exit(9)}catch{}}process.exit(7)",
    ]), 7);
    assert.notEqual(await run(DEVELOP, nestedWorkspace, [
      process.execPath,
      "-e",
      "require('fs').writeFileSync('.npmrc','changed')",
    ]), 0);
    assert.equal(
      await readFile(path.join(nestedWorkspace, ".npmrc"), "utf8"),
      "//registry.example/:_authToken=blocked",
    );
    assert.notEqual(await run(DEVELOP, nestedWorkspace, [
      process.execPath,
      "-e",
      "require('fs').writeFileSync('../sibling/.npmrc','changed')",
    ]), 0);
    assert.equal(await readFile(path.join(credentialSibling, ".npmrc"), "utf8"), "sibling-token");
    assert.equal(await run(DEVELOP, nestedWorkspace, [
      process.execPath,
      "-e",
      "require('fs').writeFileSync('../sibling/.ssh/id_test','changed')",
    ]), 0);
    assert.equal(
      await readFile(path.join(credentialSibling, ".ssh", "id_test"), "utf8"),
      "sibling-key",
    );
    assert.notEqual(await run(DEVELOP, nestedWorkspace, [
      process.execPath,
      "-e",
      `require('fs').writeFileSync(${JSON.stringify(deepCredential)},'changed')`,
    ]), 0);
    assert.equal(await readFile(deepCredential, "utf8"), "deep-token");

    assert.equal(await run(OBSERVE, workspace, [
      process.execPath,
      "-e",
      "process.exit(require('fs').readFileSync('/dev/null').length === 0 ? 0 : 9)",
    ]), 0);

    assert.equal(await run(OBSERVE, workspace, [
      process.execPath,
      "-e",
      "try{require('fs').readFileSync('.env');process.exit(0)}catch{process.exit(7)}",
    ]), 7);

    assert.equal(await run(OBSERVE, workspace, [
      process.execPath,
      "-e",
      "try{require('fs').readFileSync('.ssh/id_test');process.exit(0)}catch{process.exit(7)}",
    ]), 7);

    assert.notEqual(await run(OBSERVE, workspace, [
      process.execPath,
      "-e",
      "require('fs').writeFileSync('blocked.txt','bad')",
    ]), 0);
    await assert.rejects(readFile(path.join(workspace, "blocked.txt")), /ENOENT/);

    assert.equal(await run(DEVELOP, workspace, [
      process.execPath,
      "-e",
      "require('fs').writeFileSync('allowed.txt','ok')",
    ]), 0);
    assert.equal(await readFile(path.join(workspace, "allowed.txt"), "utf8"), "ok");

    assert.notEqual(await run(DEVELOP, workspace, [
      process.execPath,
      "-e",
      "require('fs').writeFileSync('.env.local','blocked')",
    ]), 0);
    await assert.rejects(stat(path.join(workspace, ".env.local")), /ENOENT/);

    assert.equal(await run(OBSERVE, workspace, [
      process.execPath,
      "-e",
      "try{require('fs').readFileSync('outside-link');process.exit(0)}catch{process.exit(7)}",
    ]), 7);

    assert.notEqual(await run(DEVELOP, workspace, [
      process.execPath,
      "-e",
      "require('fs').writeFileSync('outside-link','changed')",
    ]), 0);
    assert.equal(await readFile(outsideFile, "utf8"), "outside-unchanged");

    assert.equal(await run(OBSERVE, workspace, [
      process.execPath,
      "-e",
      `try{require('fs').readFileSync(${JSON.stringify(outsideFile)});process.exit(0)}catch{process.exit(7)}`,
    ]), 7);

    const hardlink = path.join(workspace, "outside-hardlink");
    await link(outsideFile, hardlink);
    await assert.rejects(run(OBSERVE, workspace, [
      process.execPath,
      "-e",
      "require('fs').readFileSync('outside-hardlink')",
    ]), /external hardlink/);
    await rm(hardlink, { force: true });

    assert.equal(await run(DEVELOP, workspace, [
      process.execPath,
      "-e",
      "require('fs').writeFileSync('environment.txt', process.env.OPP_INTEGRATION_SECRET || 'missing')",
    ]), 0);
    assert.equal(await readFile(path.join(workspace, "environment.txt"), "utf8"), "missing");

    assert.equal(await run(OBSERVE, workspace, [
      process.execPath,
      "-e",
      "const f=require('path').join(process.env.TMPDIR,'probe');require('fs').writeFileSync(f,'ok');process.exit(require('fs').readFileSync(f,'utf8')==='ok'?0:8)",
    ]), 0);

    assert.equal(await run(OBSERVE, workspace, [
      process.execPath,
      "-e",
      "const a=process.argv.slice(1);process.exit(JSON.stringify(a)===JSON.stringify(['space value',';$(literal)','雪'])?0:6)",
      "space value",
      ";$(literal)",
      "雪",
    ]), 0);
    assert.equal(await run(OBSERVE, workspace, [process.execPath, "-e", "process.exit(7)"]), 7);

    const networkDenied = await run(OBSERVE, workspace, [
      process.execPath,
      "-e",
      "const s=require('net').connect(9,'127.0.0.1');s.on('connect',()=>process.exit(0));s.on('error',()=>process.exit(7));setTimeout(()=>process.exit(7),1000)",
    ]);
    assert.equal(networkDenied, 7);

    const sharedTemporaryProbe = `/tmp/claude/opp-${process.pid}-probe`;
    assert.notEqual(await run(OBSERVE, workspace, [
      process.execPath,
      "-e",
      `require('fs').mkdirSync('/tmp/claude',{recursive:true});require('fs').writeFileSync(${JSON.stringify(sharedTemporaryProbe)},'bad')`,
    ]), 0);
    await assert.rejects(stat(sharedTemporaryProbe), /ENOENT/);

    let requests = [];
    const server = createServer((request, response) => {
      requests.push(request.method);
      response.end("ok");
    });
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const destination = `127.0.0.1:${address.port}`;
    try {
      assert.equal(await run(NETWORK_READ, workspace, [
        "curl",
        "--fail",
        "--silent",
        `http://${destination}/read`,
      ], { allowedDomains: [destination] }), 0);
      assert.notEqual(await run(NETWORK_READ, workspace, [
        "curl",
        "--fail",
        "--silent",
        "--request",
        "POST",
        `http://${destination}/write`,
      ], { allowedDomains: [destination] }), 0);
      assert.deepEqual(requests, ["GET"]);
    } finally {
      await new Promise((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
      });
    }
  } finally {
    await rm(workspace, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
    await rm(toolBundle, { recursive: true, force: true });
    await rm(linkedParent, { recursive: true, force: true });
  }
});
