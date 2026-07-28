import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const REPO = process.env.REPO || process.cwd();
const skill = readFileSync(join(REPO, "skills/mcp-builder/SKILL.md"), "utf8");
const pkg = JSON.parse(readFileSync(join(REPO, "package.json"), "utf8"));

test("mcp-builder selects stable immutable protocol and SDK evidence", () => {
  assert.ok(skill.includes("2025-11-25"));
  assert.ok(skill.includes("38c84e9f93ad191d9eb26d92b945d17bd0efcaf3"));
  assert.match(skill, /protocol revision.*SDK version.*immutable.*(?:tag|commit)/is);
  assert.match(skill, /URL.*UTC retrieval time.*SHA-256/is);
  assert.doesNotMatch(skill, /specification\/draft|raw\.githubusercontent\.com\/[^\s]+\/main\//i);
  assert.doesNotMatch(skill, /(?:use|select|install).*(?:latest|release candidate|prerelease)/i);
});

test("mcp-builder defines modern transport and security contracts", () => {
  assert.match(skill, /stdio.*local subprocess/is);
  assert.match(skill, /stdout.*protocol.*stderr.*log/is);
  assert.match(skill, /Streamable HTTP.*remote/is);
  assert.match(skill, /HTTP\+SSE.*compatibility-only|legacy HTTP\+SSE.*compatibility/is);
  for (const concept of ["Origin", "loopback", "authentication", "session", "protocol-version", "cancellation", "shutdown"]) {
    assert.match(skill, new RegExp(concept, "i"), concept);
  }
});

test("mcp-builder negotiates lifecycle and capabilities", () => {
  assert.match(skill, /`initialize`.*first/is);
  assert.match(skill, /protocol version.*capabilit/is);
  assert.match(skill, /notifications\/initialized/);
  assert.match(skill, /only.*negotiated|advertised.*capabilit/is);
  assert.match(skill, /listChanged/);
  assert.match(skill, /resource subscriptions?/i);
});

test("mcp-builder separates tools resources and prompts", () => {
  assert.match(skill, /tools?.*model-controlled/is);
  assert.match(skill, /resources?.*application-controlled/is);
  assert.match(skill, /prompts?.*user-controlled/is);
  assert.match(skill, /smallest.*task-oriented.*surface/is);
  assert.doesNotMatch(skill, /When uncertain, prioritize comprehensive API coverage/i);
  assert.doesNotMatch(skill, /structuredContent.*TypeScript SDK feature/i);
});

test("mcp-builder uses both MCP error channels", () => {
  assert.match(skill, /JSON-RPC errors?.*protocol|protocol.*JSON-RPC errors?/is);
  assert.match(skill, /`isError`:\s*true.*execution|execution.*`isError`:\s*true/is);
  assert.match(skill, /secret.*(?:redact|safe message)/is);
});

test("mcp-builder requires deterministic protocol tests before evaluations", () => {
  assert.match(skill, /deterministic protocol tests/i);
  assert.match(skill, /in-memory.*transport|paired transport/is);
  for (const concept of ["initialization", "capability", "pagination", "schema", "timeout", "cancellation", "teardown"]) {
    assert.match(skill, new RegExp(concept, "i"), concept);
  }
  assert.match(skill, /Inspector.*supplemental|supplemental.*Inspector/is);
  assert.doesNotMatch(skill, /Create 10 evaluation questions|<qa_pair>|XML file/i);
});

test("mcp-builder adds no MCP runtime dependency to this package", () => {
  const names = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies, ...pkg.optionalDependencies });
  assert.equal(names.some((name) => /modelcontextprotocol|fastmcp/i.test(name)), false);
});
