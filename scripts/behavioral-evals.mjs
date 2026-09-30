import { createHash, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const MANIFEST_FIELDS = new Set(["version", "targetSkills", "cases"]);
const CASE_FIELDS = new Set([
  "id", "skill", "category", "timeoutMs", "prompt", "sentinels",
  "fictitiousSecrets", "required", "forbidden",
]);
const REQUIRED_FIELDS = new Set(["id", "anyOf"]);
const FORBIDDEN_FIELDS = new Set(["id", "values"]);
const MUTATION_FIELDS = new Set(["id", "caseId", "operation", "from", "value", "expectedFailure"]);
const REPORT_FIELDS = new Set([
  "version", "model", "opencodeVersion", "startedAt", "completedAt", "status", "cases",
]);
const REPORT_CASE_FIELDS = new Set([
  "caseId", "skill", "category", "status", "failures", "response", "model",
  "opencodeVersion", "skillHash", "caseHash", "durationMs", "completedAt",
]);
const SNAPSHOT_FILE_FIELDS = new Set(["version", "snapshots"]);
const SNAPSHOT_FIELDS = new Set([
  "caseId", "model", "opencodeVersion", "skillHash", "caseHash", "verdict", "response",
]);

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
}

export function caseHash(testCase) {
  return sha256(JSON.stringify(canonical(testCase)));
}

export function hashSkill(repo, skill) {
  const skillPath = path.join(repo, "skills", skill, "SKILL.md");
  if (!existsSync(skillPath)) throw new TypeError(`skill ${skill} must have a SKILL.md`);
  return sha256(readFileSync(skillPath));
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertObject(value, label) {
  if (!isObject(value)) throw new TypeError(`${label} must be an object`);
}

function assertFields(value, fields, label) {
  for (const field of Object.keys(value)) {
    if (!fields.has(field)) throw new TypeError(`${label}: unknown field ${field}`);
  }
  for (const field of fields) {
    if (!Object.hasOwn(value, field)) throw new TypeError(`${label}: missing field ${field}`);
  }
}

function assertNonEmptyString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${label} must be a non-empty string`);
  }
}

function copyStringArray(value, label, allowEmpty = true) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    throw new TypeError(`${label} must be a non-empty array`);
  }
  return value.map((entry, index) => {
    assertNonEmptyString(entry, `${label}[${index}]`);
    return entry;
  });
}

function copyOracles(value, fields, valuesField, label) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty array`);
  }
  return value.map((oracle, index) => {
    const oracleLabel = `${label}[${index}]`;
    assertObject(oracle, oracleLabel);
    assertFields(oracle, fields, oracleLabel);
    assertNonEmptyString(oracle.id, `${oracleLabel}.id`);
    return {
      id: oracle.id,
      [valuesField]: copyStringArray(oracle[valuesField], `${oracleLabel}.${valuesField}`, false),
    };
  });
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const entry of Object.values(value)) deepFreeze(entry);
    Object.freeze(value);
  }
  return value;
}

export function validateManifest(value) {
  assertObject(value, "manifest");
  assertFields(value, MANIFEST_FIELDS, "manifest");
  if (value.version !== 1) throw new TypeError("manifest.version must equal 1");

  const targetSkills = copyStringArray(value.targetSkills, "manifest.targetSkills", false);
  const targetSkillSet = new Set();
  for (const skill of targetSkills) {
    if (targetSkillSet.has(skill)) throw new TypeError(`duplicate target skill ${skill}`);
    targetSkillSet.add(skill);
  }
  if (!Array.isArray(value.cases)) throw new TypeError("manifest.cases must be an array");

  const caseIds = new Set();
  const sentinels = new Set();
  const coveredSkills = new Set();
  const cases = value.cases.map((testCase, index) => {
    const initialLabel = isObject(testCase) && typeof testCase.id === "string" && testCase.id !== ""
      ? testCase.id
      : `case[${index}]`;
    assertObject(testCase, initialLabel);
    assertFields(testCase, CASE_FIELDS, initialLabel);
    assertNonEmptyString(testCase.id, `${initialLabel}.id`);
    assertNonEmptyString(testCase.skill, `${testCase.id}.skill`);
    assertNonEmptyString(testCase.category, `${testCase.id}.category`);
    assertNonEmptyString(testCase.prompt, `${testCase.id}.prompt`);
    if (!Number.isInteger(testCase.timeoutMs)
      || testCase.timeoutMs < 10
      || testCase.timeoutMs > 300000) {
      throw new TypeError(`${testCase.id}.timeoutMs must be an integer from 10 through 300000`);
    }
    if (caseIds.has(testCase.id)) throw new TypeError(`duplicate case id ${testCase.id}`);
    if (!targetSkillSet.has(testCase.skill)) {
      throw new TypeError(`${testCase.id}: case uses undeclared skill ${testCase.skill}`);
    }

    const caseSentinels = copyStringArray(testCase.sentinels, `${testCase.id}.sentinels`);
    for (const sentinel of caseSentinels) {
      if (sentinels.has(sentinel)) throw new TypeError(`duplicate sentinel ${sentinel}`);
      sentinels.add(sentinel);
    }
    caseIds.add(testCase.id);
    coveredSkills.add(testCase.skill);

    return {
      id: testCase.id,
      skill: testCase.skill,
      category: testCase.category,
      timeoutMs: testCase.timeoutMs,
      prompt: testCase.prompt,
      sentinels: caseSentinels,
      fictitiousSecrets: copyStringArray(
        testCase.fictitiousSecrets,
        `${testCase.id}.fictitiousSecrets`,
      ),
      required: copyOracles(
        testCase.required,
        REQUIRED_FIELDS,
        "anyOf",
        `${testCase.id}.required`,
      ),
      forbidden: copyOracles(
        testCase.forbidden,
        FORBIDDEN_FIELDS,
        "values",
        `${testCase.id}.forbidden`,
      ),
    };
  });

  for (const skill of targetSkills) {
    if (!coveredSkills.has(skill)) throw new TypeError(`target skill ${skill} is without a case`);
  }

  return deepFreeze({ version: 1, targetSkills, cases });
}

export function validateMutations(value, manifest) {
  if (!Array.isArray(value)) throw new TypeError("mutations must be an array");

  const cases = new Map(manifest.cases.map((testCase) => [testCase.id, testCase]));
  const mutationIds = new Set();
  const mutations = value.map((mutation, index) => {
    const label = isObject(mutation) && typeof mutation.id === "string" && mutation.id !== ""
      ? mutation.id
      : `mutation[${index}]`;
    assertObject(mutation, label);
    for (const field of Object.keys(mutation)) {
      if (!MUTATION_FIELDS.has(field)) throw new TypeError(`${label}: unknown field ${field}`);
    }
    for (const field of ["id", "caseId", "operation", "value", "expectedFailure"]) {
      if (!Object.hasOwn(mutation, field)) throw new TypeError(`${label}: missing field ${field}`);
      assertNonEmptyString(mutation[field], `${label}.${field}`);
    }
    if (mutationIds.has(mutation.id)) throw new TypeError(`duplicate mutation id ${mutation.id}`);
    mutationIds.add(mutation.id);

    if (mutation.operation === "append") {
      if (Object.hasOwn(mutation, "from")) {
        throw new TypeError(`${label}: append operation forbids from`);
      }
    } else if (mutation.operation === "replace") {
      if (!Object.hasOwn(mutation, "from")) {
        throw new TypeError(`${label}: replace operation requires from`);
      }
      assertNonEmptyString(mutation.from, `${label}.from`);
    } else {
      throw new TypeError(`${label}.operation must be append or replace`);
    }

    const testCase = cases.get(mutation.caseId);
    if (!testCase) throw new TypeError(`${label}: unknown case ${mutation.caseId}`);
    const failureIds = new Set([
      ...testCase.required.map(({ id }) => `required:${id}`),
      ...testCase.forbidden.map(({ id }) => `forbidden:${id}`),
    ]);
    if (testCase.sentinels.length > 0) failureIds.add("forbidden:sentinel");
    if (testCase.fictitiousSecrets.length > 0) failureIds.add("forbidden:fictitious-secret");
    if (!failureIds.has(mutation.expectedFailure)) {
      throw new TypeError(`${label}: unknown expected failure ${mutation.expectedFailure}`);
    }

    return Object.hasOwn(mutation, "from")
      ? {
          id: mutation.id,
          caseId: mutation.caseId,
          operation: mutation.operation,
          from: mutation.from,
          value: mutation.value,
          expectedFailure: mutation.expectedFailure,
        }
      : {
          id: mutation.id,
          caseId: mutation.caseId,
          operation: mutation.operation,
          value: mutation.value,
          expectedFailure: mutation.expectedFailure,
        };
  });

  return deepFreeze(mutations);
}

export function gradeResponse(testCase, response) {
  if (typeof response !== "string" || response.trim() === "") {
    return { status: "fail", failures: ["incomplete:empty-response"] };
  }
  const folded = response.toLocaleLowerCase("en-US");
  const failures = [];
  for (const oracle of testCase.required) {
    if (!oracle.anyOf.some((value) => folded.includes(value.toLocaleLowerCase("en-US")))) {
      failures.push(`required:${oracle.id}`);
    }
  }
  for (const oracle of testCase.forbidden) {
    if (oracle.values.some((value) => folded.includes(value.toLocaleLowerCase("en-US")))) {
      failures.push(`forbidden:${oracle.id}`);
    }
  }
  if (testCase.sentinels.some((value) => folded.includes(value.toLocaleLowerCase("en-US")))) {
    failures.push("forbidden:sentinel");
  }
  if (testCase.fictitiousSecrets.some((value) => folded.includes(value.toLocaleLowerCase("en-US")))) {
    failures.push("forbidden:fictitious-secret");
  }
  return { status: failures.length === 0 ? "pass" : "fail", failures };
}

function assertHash(value, label) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) {
    throw new TypeError(`${label} must be 64 lowercase hexadecimal characters`);
  }
}

function assertTimestamp(value, label) {
  const parsed = typeof value === "string" ? new Date(value) : undefined;
  if (!parsed || Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new TypeError(`${label} must be an ISO timestamp`);
  }
}

export function validateReport(value, manifest, repo) {
  assertObject(value, "report");
  assertFields(value, REPORT_FIELDS, "report");
  if (value.version !== 1) throw new TypeError("report.version must equal 1");
  assertNonEmptyString(value.model, "report.model");
  assertNonEmptyString(value.opencodeVersion, "report.opencodeVersion");
  assertTimestamp(value.startedAt, "report.startedAt");
  assertTimestamp(value.completedAt, "report.completedAt");
  if (value.status !== "pass") throw new TypeError("report status must be pass");
  if (!Array.isArray(value.cases)) throw new TypeError("report.cases must be an array");

  const currentCases = new Map(manifest.cases.map((testCase) => [testCase.id, testCase]));
  const seen = new Set();
  const cases = value.cases.map((entry, index) => {
    const label = isObject(entry) && typeof entry.caseId === "string" && entry.caseId !== ""
      ? entry.caseId
      : `report.cases[${index}]`;
    assertObject(entry, label);
    assertFields(entry, REPORT_CASE_FIELDS, label);
    assertNonEmptyString(entry.caseId, `${label}.caseId`);
    if (seen.has(entry.caseId)) throw new TypeError(`duplicate case ${entry.caseId}`);
    seen.add(entry.caseId);
    const testCase = currentCases.get(entry.caseId);
    if (!testCase) throw new TypeError(`unknown case ${entry.caseId}`);

    assertNonEmptyString(entry.skill, `${label}.skill`);
    assertNonEmptyString(entry.category, `${label}.category`);
    if (entry.skill !== testCase.skill) throw new TypeError(`${label}: skill does not match manifest`);
    if (entry.category !== testCase.category) {
      throw new TypeError(`${label}: category does not match manifest`);
    }
    if (entry.status !== "pass") throw new TypeError(`${label}: case status must be pass`);
    if (!Array.isArray(entry.failures) || entry.failures.length !== 0) {
      throw new TypeError(`${label}: passing case failures must be empty`);
    }
    assertNonEmptyString(entry.response, `${label}.response`);
    assertNonEmptyString(entry.model, `${label}.model`);
    assertNonEmptyString(entry.opencodeVersion, `${label}.opencodeVersion`);
    if (entry.model !== value.model) throw new TypeError(`${label}: model does not match report`);
    if (entry.opencodeVersion !== value.opencodeVersion) {
      throw new TypeError(`${label}: OpenCode version does not match report`);
    }
    assertHash(entry.skillHash, `${label}.skillHash`);
    assertHash(entry.caseHash, `${label}.caseHash`);
    if (entry.skillHash !== hashSkill(repo, testCase.skill)) {
      throw new TypeError(`${label}: stale skill hash`);
    }
    if (entry.caseHash !== caseHash(testCase)) throw new TypeError(`${label}: stale case hash`);
    if (!Number.isInteger(entry.durationMs) || entry.durationMs < 0) {
      throw new TypeError(`${label}.durationMs must be a non-negative integer`);
    }
    assertTimestamp(entry.completedAt, `${label}.completedAt`);
    const grade = gradeResponse(testCase, entry.response);
    if (grade.status !== "pass") {
      throw new TypeError(`${label}: response failed grading (${grade.failures.join(", ")})`);
    }

    return {
      caseId: entry.caseId,
      skill: entry.skill,
      category: entry.category,
      status: entry.status,
      failures: [],
      response: entry.response,
      model: entry.model,
      opencodeVersion: entry.opencodeVersion,
      skillHash: entry.skillHash,
      caseHash: entry.caseHash,
      durationMs: entry.durationMs,
      completedAt: entry.completedAt,
    };
  });

  for (const testCase of manifest.cases) {
    if (!seen.has(testCase.id)) throw new TypeError(`missing case ${testCase.id}`);
  }
  return deepFreeze({
    version: 1,
    model: value.model,
    opencodeVersion: value.opencodeVersion,
    startedAt: value.startedAt,
    completedAt: value.completedAt,
    status: "pass",
    cases,
  });
}

export function acceptReport({ report, manifest, repo, snapshotsPath }) {
  const validated = validateReport(report, manifest, repo);
  const currentCases = new Map(manifest.cases.map((testCase) => [testCase.id, testCase]));
  const snapshots = validated.cases.map((entry) => {
    const testCase = currentCases.get(entry.caseId);
    return {
      caseId: entry.caseId,
      model: entry.model,
      opencodeVersion: entry.opencodeVersion,
      skillHash: entry.skillHash,
      caseHash: entry.caseHash,
      verdict: "pass",
      response: normalizeResponse(redactResponse(entry.response, testCase)),
    };
  }).sort((left, right) => (left.caseId < right.caseId ? -1 : left.caseId > right.caseId ? 1 : 0));
  const snapshotFile = deepFreeze({ version: 1, snapshots });
  const replayed = replaySnapshots(snapshotFile, manifest, repo);
  if (replayed.status !== "pass") {
    const detail = replayed.failures
      .map(({ caseId, failures }) => `${caseId}: ${failures.join(", ")}`)
      .join("; ");
    throw new TypeError(`snapshot responses failed replay grading: ${detail}`);
  }
  mkdirSync(path.dirname(snapshotsPath), { recursive: true });
  const tempPath = `${snapshotsPath}.tmp`;
  writeFileSync(tempPath, `${JSON.stringify(snapshotFile, null, 2)}\n`);
  renameSync(tempPath, snapshotsPath);
  return snapshotFile;
}

export function validateSnapshots(value, manifest, repo) {
  assertObject(value, "snapshots");
  assertFields(value, SNAPSHOT_FILE_FIELDS, "snapshots");
  if (value.version !== 1) throw new TypeError("snapshots.version must equal 1");
  if (!Array.isArray(value.snapshots)) throw new TypeError("snapshots.snapshots must be an array");

  const currentCases = new Map(manifest.cases.map((testCase) => [testCase.id, testCase]));
  const seen = new Set();
  const snapshots = value.snapshots.map((snapshot, index) => {
    const label = isObject(snapshot) && typeof snapshot.caseId === "string" && snapshot.caseId !== ""
      ? snapshot.caseId
      : `snapshots[${index}]`;
    assertObject(snapshot, label);
    assertFields(snapshot, SNAPSHOT_FIELDS, label);
    assertNonEmptyString(snapshot.caseId, `${label}.caseId`);
    if (seen.has(snapshot.caseId)) throw new TypeError(`duplicate snapshot ${snapshot.caseId}`);
    seen.add(snapshot.caseId);
    const testCase = currentCases.get(snapshot.caseId);
    if (!testCase) throw new TypeError(`unknown snapshot case ${snapshot.caseId}`);

    assertNonEmptyString(snapshot.model, `${label}.model`);
    assertNonEmptyString(snapshot.opencodeVersion, `${label}.opencodeVersion`);
    assertHash(snapshot.skillHash, `${label}.skillHash`);
    assertHash(snapshot.caseHash, `${label}.caseHash`);
    if (snapshot.skillHash !== hashSkill(repo, testCase.skill)) {
      throw new TypeError(`${label}: stale skill hash`);
    }
    if (snapshot.caseHash !== caseHash(testCase)) throw new TypeError(`${label}: stale case hash`);
    if (snapshot.verdict !== "pass") throw new TypeError(`${label}: verdict must be pass`);
    assertNonEmptyString(snapshot.response, `${label}.response`);
    if (normalizeResponse(redactResponse(snapshot.response, testCase)) !== snapshot.response) {
      throw new TypeError(`${label}: response must be normalized and redacted`);
    }
    return {
      caseId: snapshot.caseId,
      model: snapshot.model,
      opencodeVersion: snapshot.opencodeVersion,
      skillHash: snapshot.skillHash,
      caseHash: snapshot.caseHash,
      verdict: "pass",
      response: snapshot.response,
    };
  });

  for (const testCase of manifest.cases) {
    if (!seen.has(testCase.id)) throw new TypeError(`missing snapshot ${testCase.id}`);
  }
  snapshots.sort((left, right) => (
    left.caseId < right.caseId ? -1 : left.caseId > right.caseId ? 1 : 0
  ));
  return deepFreeze({ version: 1, snapshots });
}

export function replaySnapshots(snapshotFile, manifest, repo) {
  const validated = validateSnapshots(snapshotFile, manifest, repo);
  const currentCases = new Map(manifest.cases.map((testCase) => [testCase.id, testCase]));
  const failures = [];
  for (const snapshot of validated.snapshots) {
    const grade = gradeResponse(currentCases.get(snapshot.caseId), snapshot.response);
    if (grade.status === "fail") {
      failures.push({ caseId: snapshot.caseId, failures: grade.failures });
    }
  }
  return deepFreeze({
    status: failures.length === 0 ? "pass" : "fail",
    cases: validated.snapshots.length,
    failures,
  });
}

export function applyMutation(response, mutation) {
  if (!isObject(mutation) || typeof mutation.value !== "string") {
    throw new TypeError("mutation must contain a string value");
  }
  if (mutation.operation === "append") return `${response}\n${mutation.value}`;
  if (mutation.operation === "replace") return mutation.value;
  throw new TypeError(`unsupported mutation operation: ${mutation.operation}`);
}

export function normalizeResponse(response) {
  return response
    .replaceAll("\r\n", "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function redactResponse(response, testCase) {
  let redacted = response;
  const caseValues = [...testCase.sentinels, ...testCase.fictitiousSecrets]
    .toSorted((left, right) => right.length - left.length);
  for (const value of caseValues) {
    redacted = redacted.replace(new RegExp(escapeRegExp(value), "gi"), "[REDACTED]");
  }
  const credential = /(?<![A-Za-z0-9_])(?:sk-[A-Za-z0-9][A-Za-z0-9._-]*|ghp_[A-Za-z0-9][A-Za-z0-9._-]*|github_pat_[A-Za-z0-9][A-Za-z0-9._-]*|AKIA[A-Z0-9]{16}|Bearer[ \t]+[A-Za-z0-9][A-Za-z0-9._~+/-]*)(?![A-Za-z0-9._~+/-])/g;
  return redacted.replace(credential, "[REDACTED]");
}

/**
 * Collects the assistant text from a V2 session context response and notes
 * whether the model requested any tool. A tool request means the eval runtime
 * could not keep the model inside the permission-free envelope.
 */
export function parseSessionContext(context) {
  if (!isObject(context) || !Array.isArray(context.data)) {
    throw new TypeError("malformed OpenCode session context");
  }
  const textParts = [];
  let toolRequested = false;
  for (const message of context.data) {
    if (!isObject(message) || message.type !== "assistant") continue;
    if (!Array.isArray(message.content)) {
      throw new TypeError("malformed OpenCode session context");
    }
    for (const part of message.content) {
      if (!isObject(part)) throw new TypeError("malformed OpenCode session context");
      if (part.type === "tool") toolRequested = true;
      if (part.type === "text") {
        if (typeof part.text !== "string") {
          throw new TypeError("malformed OpenCode session context");
        }
        textParts.push(part.text);
      }
    }
  }
  return { response: textParts.join("\n"), toolRequested };
}

/**
 * V2 loads a configured plugin directory through its index.js entrypoint and
 * uses an ordered permission ruleset. The eval denies every tool so a case
 * can only pass on model text.
 */
export function buildEvalConfig(pluginDirectory) {
  return {
    plugins: [pluginDirectory],
    permissions: [{ action: "*", resource: "*", effect: "deny" }],
  };
}

export function parseModelReference(model) {
  const separator = model.indexOf("/");
  if (separator <= 0 || separator >= model.length - 1) {
    throw new TypeError("OPENCODE_EVAL_MODEL must use provider/model form");
  }
  const providerID = model.slice(0, separator);
  const id = model.slice(separator + 1);
  if (!providerID.trim() || !id.trim()) {
    throw new TypeError("OPENCODE_EVAL_MODEL must use provider/model form");
  }
  return { providerID, id };
}

// gemelo en scripts/opencode-smoke.mjs: mantener sincronizado. TOCTOU conocido: se cierra y se reutiliza, reintentar con otro puerto ante EADDRINUSE.
export async function availablePort() {
  const server = createServer();
  await new Promise((resolve, reject) => server.listen(0, "127.0.0.1", resolve).once("error", reject));
  const address = server.address();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return address.port;
}

/**
 * Writes the plugin-directory shim the eval runtime loads. The shim keeps the
 * package entrypoint in the repository, so its skills and dependencies resolve
 * exactly as they do for an installed package.
 */
function writePluginShim(runtime, repo) {
  const directory = path.join(runtime.root, "plugin");
  mkdirSync(directory, { recursive: true });
  const entrypoint = pathToFileURL(
    path.join(repo, ".opencode/plugins/opencode-power-pack.js"),
  ).href;
  writeFileSync(path.join(directory, "index.js"), `export { default } from ${JSON.stringify(entrypoint)};\n`);
  return directory;
}

export function defaultOpenCodeCommand(platform = process.platform) {
  return platform === "win32" ? "opencode.exe" : "opencode";
}

function signalChild(child, signal, platform = process.platform) {
  try {
    if (platform === "win32") child.kill(signal);
    else process.kill(-child.pid, signal);
  } catch (error) {
    if (error.code !== "ESRCH") throw error;
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function processGroupExists(pid) {
  try {
    process.kill(-pid, 0);
    return true;
  } catch (error) {
    if (error.code === "ESRCH") return false;
    throw error;
  }
}

export async function terminateTimedOutChild(child, platform = process.platform) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const closed = new Promise((resolve) => child.once("close", resolve));

  if (platform === "win32") {
    signalChild(child, "SIGTERM", platform);
    await Promise.race([closed, delay(100)]);
    if (child.exitCode === null && child.signalCode === null) signalChild(child, "SIGKILL", platform);
    await closed;
    return;
  }

  signalChild(child, "SIGTERM", platform);
  await delay(100);
  signalChild(child, "SIGKILL", platform);
  while (processGroupExists(child.pid)) await delay(10);
  await closed;
}

function reportEntry(testCase, options, started, status, failures, response) {
  return {
    caseId: testCase.id,
    skill: testCase.skill,
    category: testCase.category,
    status,
    failures,
    response,
    model: options.model,
    opencodeVersion: options.opencodeVersion,
    skillHash: hashSkill(options.repo, testCase.skill),
    caseHash: caseHash(testCase),
    durationMs: Date.now() - started,
    completedAt: new Date().toISOString(),
  };
}

function createRuntime(env) {
  const root = mkdtempSync(path.join(tmpdir(), "behavioral-eval-"));
  try {
    const runtime = {
      root,
      project: path.join(root, "project"),
      home: path.join(root, "home"),
      config: path.join(root, "config"),
      data: path.join(root, "data"),
      cache: path.join(root, "cache"),
      state: path.join(root, "state"),
    };
    for (const directory of [
      runtime.project, runtime.home, runtime.config, runtime.data, runtime.cache, runtime.state,
    ]) {
      mkdirSync(directory, { recursive: true, mode: 0o700 });
    }

    const sourceData = env.XDG_DATA_HOME
      || (env.HOME ? path.join(env.HOME, ".local", "share") : undefined);
    const sourceAuth = sourceData && path.join(sourceData, "opencode", "auth.json");
    if (sourceAuth && existsSync(sourceAuth)) {
      const sourceAuthStat = statSync(sourceAuth);
      if (!sourceAuthStat.isFile()) return runtime;
      const targetDirectory = path.join(runtime.data, "opencode");
      const targetAuth = path.join(targetDirectory, "auth.json");
      mkdirSync(targetDirectory, { recursive: true, mode: 0o700 });
      copyFileSync(sourceAuth, targetAuth);
      chmodSync(targetAuth, (sourceAuthStat.mode & 0o600) || 0o600);
    }
    return runtime;
  } catch (error) {
    rmSync(root, { recursive: true, force: true });
    throw error;
  }
}

function isolatedEnv(env, runtime, model, config, password) {
  const childEnv = {};
  const isolatedPaths = new Set([
    "HOME", "USERPROFILE", "APPDATA", "LOCALAPPDATA",
    "XDG_CONFIG_HOME", "XDG_DATA_HOME", "XDG_CACHE_HOME", "XDG_STATE_HOME",
  ]);
  for (const [key, value] of Object.entries(env)) {
    const normalized = key.toUpperCase();
    if (isolatedPaths.has(normalized)) continue;
    if (normalized.startsWith("OPENCODE_")) continue;
    childEnv[key] = value;
  }
  return {
    ...childEnv,
    HOME: runtime.home,
    USERPROFILE: runtime.home,
    APPDATA: runtime.config,
    LOCALAPPDATA: runtime.data,
    XDG_CONFIG_HOME: runtime.config,
    XDG_DATA_HOME: runtime.data,
    XDG_CACHE_HOME: runtime.cache,
    XDG_STATE_HOME: runtime.state,
    OPENCODE_EVAL_MODEL: model,
    OPENCODE_SERVER_PASSWORD: password,
    OPENCODE_CONFIG_CONTENT: JSON.stringify(config),
  };
}

async function requestJson(url, { method = "GET", body, authorization, signal } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      ...(authorization ? { authorization } : {}),
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
  if (!response.ok) {
    throw new TypeError(`OpenCode API ${method} ${url} returned HTTP ${response.status}`);
  }
  const text = await response.text();
  if (text === "") return undefined;
  try {
    return JSON.parse(text);
  } catch {
    throw new TypeError("malformed OpenCode API response");
  }
}

async function waitForServer(baseURL, { authorization, signal, child, spawnError }) {
  while (!signal.aborted) {
    if (spawnError.error || child.exitCode !== null || child.signalCode !== null) return false;
    try {
      const response = await fetch(`${baseURL}/api/info`, {
        headers: { authorization },
        signal: AbortSignal.any([signal, AbortSignal.timeout(1_000)]),
      });
      if (response.ok) return true;
    } catch {
      if (signal.aborted) break;
    }
    await delay(100);
  }
  return false;
}

export async function runCase(testCase, options) {
  const {
    repo,
    model,
    opencodeVersion,
    command = defaultOpenCodeCommand(),
    commandArgsPrefix = [],
    env = process.env,
  } = options;
  const started = Date.now();
  const runtime = createRuntime(env);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), testCase.timeoutMs);
  const spawnError = { error: undefined };
  let child;
  const finish = (status, failures, response) => reportEntry(
    testCase, options, started, status, failures, response,
  );

  try {
    const pluginDirectory = writePluginShim(runtime, repo);
    const port = await availablePort();
    // 24 bytes dan 32 chars base64url, sobre mínimo 16 exigido en tests.
    const password = randomBytes(24).toString("base64url");
    const authorization = `Basic ${Buffer.from(`opencode:${password}`).toString("base64")}`;
    const baseURL = `http://127.0.0.1:${port}`;
    const args = [...commandArgsPrefix, "serve", "--hostname", "127.0.0.1", "--port", String(port)];

    child = spawn(command, args, {
      cwd: runtime.project,
      env: isolatedEnv(env, runtime, model, buildEvalConfig(pluginDirectory), password),
      detached: process.platform !== "win32",
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.resume();
    child.stderr.resume();
    child.once("error", (error) => {
      spawnError.error = error;
    });

    const ready = await waitForServer(baseURL, { authorization, signal: controller.signal, child, spawnError });
    if (!ready) {
      if (controller.signal.aborted) return finish("incomplete", ["incomplete:timeout"], "");
      return finish("incomplete", ["incomplete:process-exit"], "");
    }

    try {
      const created = await requestJson(`${baseURL}/api/session`, {
        method: "POST",
        authorization,
        signal: controller.signal,
        body: { title: testCase.id, model: parseModelReference(model) },
      });
      const sessionID = created?.data?.id;
      if (typeof sessionID !== "string" || sessionID === "") {
        throw new TypeError("malformed OpenCode session");
      }
      await requestJson(`${baseURL}/api/session/${sessionID}/prompt`, {
        method: "POST",
        authorization,
        signal: controller.signal,
        body: { text: testCase.prompt, skills: [{ id: testCase.skill }] },
      });
      await requestJson(`${baseURL}/api/experimental/session/${sessionID}/wait`, {
        method: "POST",
        authorization,
        signal: controller.signal,
      });
      const context = await requestJson(`${baseURL}/api/session/${sessionID}/context`, {
        authorization,
        signal: controller.signal,
      });
      let parsed;
      try {
        parsed = parseSessionContext(context);
      } catch {
        return finish("incomplete", ["incomplete:malformed-response"], "");
      }
      const { response, toolRequested } = parsed;
      if (toolRequested) {
        return finish("incomplete", ["incomplete:permission"], "");
      }
      if (response.trim() === "") {
        return finish("incomplete", ["incomplete:missing-response"], "");
      }
      const grade = gradeResponse(testCase, response);
      return finish(
        grade.status,
        grade.failures,
        normalizeResponse(redactResponse(response, testCase)),
      );
    } catch {
      if (controller.signal.aborted) return finish("incomplete", ["incomplete:timeout"], "");
      return finish("incomplete", ["incomplete:malformed-response"], "");
    }
  } finally {
    clearTimeout(timeout);
    if (child && child.exitCode === null && child.signalCode === null) {
      await terminateTimedOutChild(child);
    }
    rmSync(runtime.root, { recursive: true, force: true });
  }
}

export function writeReport(
  report,
  outputPath = path.resolve(".artifacts/behavioral-evals/latest.json"),
) {
  mkdirSync(path.dirname(outputPath), { recursive: true });
  const tempPath = `${outputPath}.tmp`;
  try {
    writeFileSync(tempPath, `${JSON.stringify(report, null, 2)}\n`);
    renameSync(tempPath, outputPath);
  } catch (error) {
    rmSync(tempPath, { force: true });
    throw error;
  }
  return outputPath;
}

async function detectOpenCodeVersion(command, commandArgsPrefix, env, cwd) {
  return await new Promise((resolve, reject) => {
    const chunks = [];
    const child = spawn(command, [...commandArgsPrefix, "--version"], {
      cwd,
      env,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.on("data", (chunk) => chunks.push(chunk));
    child.stderr.resume();
    child.once("error", reject);
    child.once("close", (code) => {
      if (code !== 0) {
        reject(new Error("Unable to detect OpenCode version"));
        return;
      }
      resolve(Buffer.concat(chunks).toString("utf8").trim());
    });
  });
}

export async function runSuite(options) {
  const {
    repo,
    cases,
    env = process.env,
    command = defaultOpenCodeCommand(),
    commandArgsPrefix = [],
  } = options;
  const startedAt = new Date().toISOString();
  const model = env.OPENCODE_EVAL_MODEL;
  if (typeof model !== "string" || !/^[^/\s]+\/[^/\s]+$/.test(model)) {
    throw new TypeError("OPENCODE_EVAL_MODEL must use provider/model form");
  }
  if (cases.length === 0) throw new TypeError("case selection must not be empty");
  const opencodeVersion = await detectOpenCodeVersion(command, commandArgsPrefix, env, repo);
  const entries = [];
  for (const testCase of cases) {
    entries.push(await runCase(testCase, {
      repo,
      model,
      opencodeVersion,
      command,
      commandArgsPrefix,
      env,
    }));
  }
  return {
    version: 1,
    model,
    opencodeVersion,
    startedAt,
    completedAt: new Date().toISOString(),
    status: entries.every(({ status }) => status === "pass") ? "pass" : "fail",
    cases: entries,
  };
}

async function main() {
  const mode = process.argv[2];
  if (mode !== "run" && mode !== "accept") {
    throw new TypeError(`unsupported behavioral evaluation mode: ${mode || "missing"}`);
  }
  const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const manifest = validateManifest(JSON.parse(
    readFileSync(path.join(repo, "evals/behavioral/cases.json"), "utf8"),
  ));
  const latestPath = process.env.BEHAVIORAL_EVAL_LATEST_PATH
    || path.join(repo, ".artifacts/behavioral-evals/latest.json");
  const snapshotsPath = process.env.BEHAVIORAL_EVAL_SNAPSHOTS_PATH
    || path.join(repo, "evals/behavioral/snapshots.json");
  if (mode === "accept") {
    const snapshotFile = acceptReport({
      report: JSON.parse(readFileSync(latestPath, "utf8")),
      manifest,
      repo,
      snapshotsPath,
    });
    console.log(`Accepted ${snapshotFile.snapshots.length} behavioral snapshots`);
    return;
  }
  const report = await runSuite({ repo, cases: manifest.cases });
  const outputPath = writeReport(report, latestPath);
  const passed = report.cases.filter(({ status }) => status === "pass").length;
  console.log(outputPath);
  console.log(`${passed}/${report.cases.length} cases passed`);
  if (report.status !== "pass") process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
