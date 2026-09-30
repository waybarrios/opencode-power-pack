#!/usr/bin/env node
import assert from "node:assert/strict";
import { appendFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";
import { spawn } from "node:child_process";

const args = process.argv.slice(2);
if (args[0] === "--version") {
  console.log(process.env.FAKE_VERSION ?? "2.0.14");
  process.exit(0);
}

const behavior = process.env.FAKE_BEHAVIOR ?? "text";
if (behavior === "exit") {
  console.error("fake-opencode-sensitive-stderr");
  process.exitCode = 7;
} else {
  assert.equal(args[0], "serve");
  assert.equal(args[1], "--hostname");
  assert.equal(args[2], "127.0.0.1");
  assert.equal(args[3], "--port");
  assert.equal(args.length, 5);
  const port = Number(args[4]);
  assert.ok(Number.isInteger(port) && port > 0);

  const config = JSON.parse(process.env.OPENCODE_CONFIG_CONTENT);
  assert.deepEqual(config.permissions, [{ action: "*", resource: "*", effect: "deny" }]);
  assert.equal(config.plugins.length, 1);
  assert.match(readFileSync(join(config.plugins[0], "index.js"), "utf8"), /opencode-power-pack\.js/);
  assert.equal(process.env.OPENCODE_EVAL_MODEL, "provider/model");
  assert.ok(process.env.OPENCODE_SERVER_PASSWORD);

  if (process.env.FAKE_CWD_PATH) writeFileSync(process.env.FAKE_CWD_PATH, process.cwd());
  if (process.env.FAKE_ENV_PATH) {
    const authPath = join(process.env.XDG_DATA_HOME, "opencode", "auth.json");
    writeFileSync(process.env.FAKE_ENV_PATH, JSON.stringify({
      HOME: process.env.HOME,
      XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME,
      XDG_DATA_HOME: process.env.XDG_DATA_HOME,
      XDG_CACHE_HOME: process.env.XDG_CACHE_HOME,
      XDG_STATE_HOME: process.env.XDG_STATE_HOME,
      OPENCODE_CONFIG: process.env.OPENCODE_CONFIG,
      OPENCODE_CONFIG_DIR: process.env.OPENCODE_CONFIG_DIR,
      OPENCODE_SERVER_PASSWORD: process.env.OPENCODE_SERVER_PASSWORD,
      OPENCODE_EVAL_MODEL: process.env.OPENCODE_EVAL_MODEL,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      authContent: existsSync(authPath) ? readFileSync(authPath, "utf8") : null,
      authMode: existsSync(authPath) ? statSync(authPath).mode & 0o777 : null,
      sessionsExist: existsSync(join(process.env.XDG_DATA_HOME, "opencode", "sessions.json")),
      globalConfigExists: existsSync(join(process.env.XDG_CONFIG_HOME, "opencode", "opencode.json")),
    }));
  }

  const authorization = `Basic ${Buffer.from(`opencode:${process.env.OPENCODE_SERVER_PASSWORD}`).toString("base64")}`;
  let promptText = "";

  if (behavior === "state") {
    for (const root of [
      process.env.HOME,
      process.env.XDG_CONFIG_HOME,
      process.env.XDG_DATA_HOME,
      process.env.XDG_CACHE_HOME,
      process.env.XDG_STATE_HOME,
    ]) {
      mkdirSync(root, { recursive: true });
      writeFileSync(join(root, "generated-state"), "state");
    }
  }

  const respondJson = (response, status, value) => {
    const body = JSON.stringify(value);
    response.writeHead(status, { "content-type": "application/json", "content-length": Buffer.byteLength(body) });
    response.end(body);
  };

  const server = createServer((request, response) => {
    if (request.headers.authorization !== authorization) {
      response.writeHead(401);
      response.end();
      return;
    }
    let body = "";
    request.on("data", (chunk) => (body += chunk));
    request.on("end", () => {
      if (request.method === "GET" && request.url === "/api/info") {
        respondJson(response, 200, {});
        return;
      }
      if (behavior === "hang" || behavior === "hang-with-descendant") {
        return;
      }
      if (request.method === "POST" && request.url === "/api/session") {
        if (process.env.FAKE_SESSION_PATH) writeFileSync(process.env.FAKE_SESSION_PATH, body);
        respondJson(response, 200, { data: { id: "ses_fake" } });
        return;
      }
      if (request.method === "POST" && request.url === "/api/session/ses_fake/prompt") {
        const parsed = JSON.parse(body);
        promptText = parsed.text;
        if (process.env.FAKE_PROMPT_PATH) writeFileSync(process.env.FAKE_PROMPT_PATH, body);
        if (process.env.FAKE_ORDER_PATH) appendFileSync(process.env.FAKE_ORDER_PATH, `start:${promptText}\n`);
        respondJson(response, 200, { data: { id: "msg_fake" } });
        return;
      }
      if (request.method === "POST" && request.url === "/api/experimental/session/ses_fake/wait") {
        if (process.env.FAKE_ORDER_PATH) appendFileSync(process.env.FAKE_ORDER_PATH, `end:${promptText}\n`);
        response.writeHead(204);
        response.end();
        return;
      }
      if (request.method === "GET" && request.url === "/api/session/ses_fake/context") {
        if (behavior === "malformed") {
          response.writeHead(200, { "content-type": "application/json" });
          response.end("malformed-sensitive-response");
          return;
        }
        const content = [];
        if (behavior !== "empty") {
          content.push({ type: "text", text: process.env.FAKE_RESPONSE ?? "MOCK=RESPONSE" });
        }
        if (behavior === "tool") {
          content.push({ type: "tool", id: "prt_fake", name: "read", state: { type: "completed" }, time: { created: 1 } });
        }
        respondJson(response, 200, { data: [{ id: "msg_fake", type: "assistant", content }] });
        return;
      }
      response.writeHead(404);
      response.end();
    });
  });
  server.listen(port, "127.0.0.1");

  if (behavior === "hang-with-descendant") {
    const source = "process.on('SIGTERM', () => {}); setInterval(() => {}, 1000);";
    const descendant = spawn(process.execPath, ["--input-type=module", "-e", source], { stdio: "ignore" });
    writeFileSync(process.env.FAKE_DESCENDANT_PID, String(descendant.pid));
  }
}
