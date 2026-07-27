import { once } from "node:events";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchJson, stopServer } from "../scripts/opencode-smoke.mjs";

test("fetchJson aborts a stalled OpenCode response", async () => {
  const server = createServer(() => {});
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();

  try {
    await assert.rejects(fetchJson(`http://127.0.0.1:${port}/agent`, 50), /timed out/i);
  } finally {
    server.closeAllConnections();
    server.close();
  }
});

test("stopServer tolerates a child that already exited by signal", async () => {
  const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
    detached: process.platform !== "win32",
    stdio: "ignore",
  });

  if (process.platform === "win32") child.kill("SIGKILL");
  else process.kill(-child.pid, "SIGKILL");
  await once(child, "exit");

  await stopServer(child, 50);
  assert.notEqual(child.signalCode, null);
});
