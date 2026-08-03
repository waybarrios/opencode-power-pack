import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn } from "node:child_process";

const version = process.argv[2] || "1.18.7";
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const plugin = pathToFileURL(path.join(repo, ".opencode/plugins/opencode-power-pack.js")).href;
const expectedSkills = [
  "agents-md-improver",
  "agents-md-revise",
  "code-architect",
  "code-explorer",
  "code-review",
  "code-reviewer",
  "feature-dev",
  "frontend-design",
  "mcp-builder",
  "security-review",
  "skill-creator",
];
const expectedAgents = ["code-architect", "code-explorer", "code-reviewer"];

async function availablePort() {
  const server = createServer();
  await new Promise((resolve, reject) => server.listen(0, "127.0.0.1", resolve).once("error", reject));
  const address = server.address();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return address.port;
}

async function waitForServer(url, child, stderr) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(`OpenCode exited early:\n${stderr.join("")}`);
    }
    try {
      const response = await fetch(`${url}/global/health`, {
        headers: { Connection: "close" },
        signal: AbortSignal.timeout(1_000),
      });
      if (response.ok) return;
    } catch {
      // Startup can take a few seconds while npx resolves the pinned package.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Timed out waiting for OpenCode:\n${stderr.join("")}`);
}

export async function fetchJson(url, timeoutMs = 10_000, retries = 5) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetchJsonOnce(url, timeoutMs);
    } catch (error) {
      // The health endpoint can report ready slightly before OpenCode finishes
      // registering every plugin's skills as native commands. With enough
      // skills, that window is long enough for a socket to be reset mid-response.
      // Retry with backoff instead of failing on the first transient close.
      const transient = error.cause?.code === "UND_ERR_SOCKET" || error.name === "TimeoutError";
      if (!transient || attempt >= retries) throw error;
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
}

async function fetchJsonOnce(url, timeoutMs) {
  try {
    // No `Connection: close` header here: pairing it with a large, still-being-
    // generated response body (the command list grows with every skill in the
    // pack) reproducibly triggers a premature socket reset in undici. Let the
    // client negotiate keep-alive normally instead.
    const response = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    if (error.name === "TimeoutError") {
      throw new Error(`Request timed out after ${timeoutMs}ms: ${url}`, { cause: error });
    }
    throw error;
  }
}

export async function stopServer(child, graceMs = 5_000) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = new Promise((resolve) => child.once("exit", resolve));

  try {
    if (process.platform === "win32") child.kill("SIGTERM");
    else process.kill(-child.pid, "SIGTERM");
  } catch (error) {
    if (error.code === "ESRCH") return;
    throw error;
  }

  await Promise.race([
    exited,
    new Promise((resolve) => setTimeout(resolve, graceMs)),
  ]);
  if (child.exitCode !== null || child.signalCode !== null) return;

  try {
    if (process.platform === "win32") child.kill("SIGKILL");
    else process.kill(-child.pid, "SIGKILL");
  } catch (error) {
    if (error.code === "ESRCH") return;
    throw error;
  }
  await Promise.race([
    exited,
    new Promise((resolve) => setTimeout(resolve, graceMs)),
  ]);
}

async function main() {
  const home = mkdtempSync(path.join(tmpdir(), "opencode-power-pack-"));
  const project = path.join(home, "project");
  mkdirSync(project);
  const port = await availablePort();
  const url = `http://127.0.0.1:${port}`;
  const stderr = [];
  const child = spawn(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["-y", `opencode-ai@${version}`, "serve", "--hostname", "127.0.0.1", "--port", String(port)],
    {
      cwd: project,
      env: {
        ...process.env,
        HOME: home,
        XDG_CONFIG_HOME: path.join(home, "config"),
        npm_config_cache: process.env.npm_config_cache || path.join(process.env.HOME || tmpdir(), ".npm"),
        OPENCODE_CONFIG_CONTENT: JSON.stringify({ plugin: [plugin] }),
      },
      detached: process.platform !== "win32",
      stdio: ["ignore", "ignore", "pipe"],
    },
  );
  child.stderr.on("data", (chunk) => stderr.push(chunk.toString()));

  try {
    await waitForServer(url, child, stderr);
    const commands = await fetchJson(`${url}/command`);
    const agents = await fetchJson(`${url}/agent`);

    for (const name of expectedSkills) {
      const command = commands.find((entry) => entry.name === name);
      assert.ok(command, `native command exists for ${name}`);
      assert.equal(command.source, "skill", `${name} command comes from its skill`);
    }
    for (const name of expectedAgents) {
      const agent = agents.find((entry) => entry.name === name);
      assert.ok(agent, `${name} agent exists`);
      assert.equal(agent.mode, "subagent");
      assert.equal(
        agent.permission.findLast((rule) => rule.permission === "read" && rule.pattern === "*.env")?.action,
        "deny",
        `${name} cannot read environment files`,
      );
      assert.equal(
        agent.permission.findLast((rule) => rule.permission === "edit" && rule.pattern === "*")?.action,
        "deny",
        `${name} cannot edit files`,
      );
    }
    const reviewer = agents.find((entry) => entry.name === "code-reviewer");
    assert.equal(
      reviewer.permission.findLast((rule) => rule.permission === "bash" && rule.pattern === "git *--output*")?.action,
      "deny",
      "code-reviewer cannot write through Git output options",
    );

    console.log(`OpenCode ${version}: ${expectedSkills.length} native commands and ${expectedAgents.length} agents verified`);
  } finally {
    try {
      await stopServer(child);
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
