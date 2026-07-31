import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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

export function parseJsonEvents(stdout) {
  const textParts = [];
  let toolRequested = false;
  for (const line of stdout.split(/\r?\n/)) {
    if (line.trim() === "") continue;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      throw new TypeError("malformed OpenCode JSON event");
    }
    if (!isObject(event) || !isObject(event.part)) {
      throw new TypeError("malformed OpenCode JSON event");
    }
    if (event.part.type === "tool") toolRequested = true;
    if (event.type === "text" && event.part.type === "text") {
      if (typeof event.part.text !== "string") {
        throw new TypeError("malformed OpenCode JSON event");
      }
      textParts.push(event.part.text);
    }
  }
  return { response: textParts.join("\n"), toolRequested };
}

export function buildEvalConfig(pluginUrl) {
  return { plugin: [pluginUrl], permission: { "*": "deny" } };
}

function signalChild(child, signal) {
  try {
    if (process.platform === "win32") child.kill(signal);
    else process.kill(-child.pid, signal);
  } catch (error) {
    if (error.code !== "ESRCH") throw error;
  }
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
    skillHash: sha256(readFileSync(path.join(options.repo, "skills", testCase.skill, "SKILL.md"))),
    caseHash: caseHash(testCase),
    durationMs: Date.now() - started,
    completedAt: new Date().toISOString(),
  };
}

export async function runCase(testCase, options) {
  const {
    repo,
    model,
    opencodeVersion,
    command = process.platform === "win32" ? "opencode.cmd" : "opencode",
    commandArgsPrefix = [],
    env = process.env,
  } = options;
  const started = Date.now();
  const project = mkdtempSync(path.join(tmpdir(), "behavioral-eval-"));
  const pluginUrl = pathToFileURL(path.join(repo, ".opencode/plugins/opencode-power-pack.js")).href;
  const args = [
    ...commandArgsPrefix,
    "run",
    "--model", model,
    "--command", testCase.skill,
    "--format", "json",
    testCase.prompt,
  ];

  try {
    let outcome;
    try {
      outcome = await new Promise((resolve, reject) => {
        const chunks = [];
        let timedOut = false;
        let killTimer;
        const child = spawn(command, args, {
          cwd: project,
          env: {
            ...env,
            OPENCODE_CONFIG_CONTENT: JSON.stringify(buildEvalConfig(pluginUrl)),
          },
          detached: process.platform !== "win32",
          shell: false,
          stdio: ["ignore", "pipe", "pipe"],
        });
        child.stdout.on("data", (chunk) => chunks.push(chunk));
        child.stderr.resume();
        const timeout = setTimeout(() => {
          timedOut = true;
          signalChild(child, "SIGTERM");
          killTimer = setTimeout(() => signalChild(child, "SIGKILL"), 100);
          killTimer.unref();
        }, testCase.timeoutMs);
        child.once("error", (error) => {
          clearTimeout(timeout);
          clearTimeout(killTimer);
          reject(error);
        });
        child.once("close", (code) => {
          clearTimeout(timeout);
          clearTimeout(killTimer);
          resolve({ stdout: Buffer.concat(chunks).toString("utf8"), code, timedOut });
        });
      });
    } catch {
      return reportEntry(
        testCase,
        options,
        started,
        "incomplete",
        ["incomplete:process-exit"],
        "",
      );
    }
    if (outcome.timedOut) {
      return reportEntry(testCase, options, started, "incomplete", ["incomplete:timeout"], "");
    }
    if (outcome.code !== 0) {
      return reportEntry(
        testCase,
        options,
        started,
        "incomplete",
        ["incomplete:process-exit"],
        "",
      );
    }
    let parsed;
    try {
      parsed = parseJsonEvents(outcome.stdout);
    } catch {
      return reportEntry(
        testCase,
        options,
        started,
        "incomplete",
        ["incomplete:malformed-events"],
        "",
      );
    }
    const { response, toolRequested } = parsed;
    if (toolRequested) {
      return reportEntry(
        testCase,
        options,
        started,
        "incomplete",
        ["incomplete:permission"],
        "",
      );
    }
    if (response.trim() === "") {
      return reportEntry(
        testCase,
        options,
        started,
        "incomplete",
        ["incomplete:missing-response"],
        "",
      );
    }
    const grade = gradeResponse(testCase, response);
    return reportEntry(
      testCase,
      options,
      started,
      grade.status,
      grade.failures,
      normalizeResponse(redactResponse(response, testCase)),
    );
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
}

export function writeReport(
  report,
  outputPath = path.resolve(".artifacts/behavioral-evals/latest.json"),
) {
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
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
    command = process.platform === "win32" ? "opencode.cmd" : "opencode",
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
  if (mode !== "run") throw new TypeError(`unsupported behavioral evaluation mode: ${mode || "missing"}`);
  const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const manifest = validateManifest(JSON.parse(
    readFileSync(path.join(repo, "evals/behavioral/cases.json"), "utf8"),
  ));
  const report = await runSuite({ repo, cases: manifest.cases });
  const outputPath = writeReport(
    report,
    path.join(repo, ".artifacts/behavioral-evals/latest.json"),
  );
  const passed = report.cases.filter(({ status }) => status === "pass").length;
  console.log(outputPath);
  console.log(`${passed}/${report.cases.length} cases passed`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
