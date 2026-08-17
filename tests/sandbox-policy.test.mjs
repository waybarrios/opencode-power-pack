import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  discoverSkills,
  main,
  parseSandboxArgs,
} from "../bin/opencode-power-pack.mjs";
import {
  loadSandboxContract,
  portableSkillPolicy,
  resolveSandboxProfile,
  sandboxDoctorReport,
  validateSandboxContract,
} from "../bin/sandbox/policy.mjs";

const REPO = process.env.REPO || process.cwd();

function clone(value) {
  return structuredClone(value);
}

test("sandbox contract covers every packaged skill with four ordered profiles", async () => {
  const skills = await discoverSkills(REPO);
  const names = skills.map((skill) => skill.name);
  const contract = await loadSandboxContract(REPO, names);

  assert.equal(contract.schemaVersion, 1);
  assert.equal(contract.enforcementLevel, "advisory");
  assert.deepEqual(Object.keys(contract.profiles), [
    "observe",
    "develop",
    "network-read",
    "publish",
  ]);
  assert.equal(Object.keys(contract.skills).length, names.length);
  assert.deepEqual(Object.keys(contract.skills).sort(), names);
  assert.deepEqual(
    Object.values(contract.profiles).map((profile) => profile.riskLevel),
    [0, 1, 2, 3],
  );
});

test("sandbox assignments preserve required writes and documented external modes", async () => {
  const contract = await loadSandboxContract(REPO);
  const expected = {
    "differential-review": ["develop", ["network-read"]],
    "security-threat-model": ["develop", []],
    "supply-chain-risk-auditor": ["develop", ["network-read"]],
    "security-review": ["observe", ["network-read", "publish"]],
    "huggingface-community-evals": ["network-read", ["publish"]],
    "huggingface-datasets": ["network-read", ["publish"]],
    "huggingface-papers": ["network-read", ["publish"]],
    "huggingface-tool-builder": ["develop", ["network-read", "publish"]],
  };

  for (const [skillName, [defaultProfile, allowedEscalations]] of Object.entries(expected)) {
    assert.deepEqual(contract.skills[skillName], { defaultProfile, allowedEscalations }, skillName);
  }
});

test("sandbox JSON schema mirrors the closed top-level contract", async () => {
  const schema = JSON.parse(
    await readFile(path.join(REPO, "sandbox", "contract.schema.json"), "utf8"),
  );

  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(schema.required, [
    "$schema",
    "schemaVersion",
    "enforcementLevel",
    "profiles",
    "skills",
  ]);
  assert.equal(schema.properties.schemaVersion.const, 1);
  assert.equal(schema.properties.enforcementLevel.const, "advisory");
  assert.equal(schema.$defs.profile.additionalProperties, false);
  assert.equal(schema.$defs.skillAssignment.additionalProperties, false);
});

test("sandbox validation rejects unknown fields, incomplete coverage, and unsafe escalations", async () => {
  const skills = await discoverSkills(REPO);
  const names = skills.map((skill) => skill.name);
  const contract = await loadSandboxContract(REPO, names);

  const unknownField = clone(contract);
  unknownField.unexpected = true;
  assert.throws(() => validateSandboxContract(unknownField, names), /unknown field: unexpected/);

  const incomplete = clone(contract);
  delete incomplete.skills[names[0]];
  assert.throws(() => validateSandboxContract(incomplete, names), /missing packaged skills/);

  const downwardEscalation = clone(contract);
  downwardEscalation.skills["frontend-design"] = {
    defaultProfile: "develop",
    allowedEscalations: ["observe"],
  };
  assert.throws(() => validateSandboxContract(downwardEscalation, names), /must increase riskLevel/);

  assert.throws(
    () => resolveSandboxProfile(contract, { skillName: "__proto__" }),
    /Unknown sandbox skill/,
  );
  assert.throws(
    () => resolveSandboxProfile(contract, { profileName: "toString" }),
    /Unknown sandbox profile/,
  );
});

test("skill and direct-profile resolution report advisory capabilities explicitly", async () => {
  const contract = await loadSandboxContract(REPO);
  const skill = resolveSandboxProfile(contract, { skillName: "code-review" });

  assert.equal(skill.skill, "code-review");
  assert.equal(skill.profile.name, "observe");
  assert.equal(skill.profile.enforcementLevel, "advisory");
  assert.deepEqual(
    skill.allowedEscalations.map((profile) => profile.name),
    ["network-read", "publish"],
  );

  const direct = resolveSandboxProfile(contract, { profileName: "publish" });
  assert.equal(direct.profile.capabilities.externalSideEffects, "confirm");
  assert.throws(
    () => resolveSandboxProfile(contract, { skillName: "code-review", profileName: "observe" }),
    /exactly one/,
  );
});

test("portable policies remain self-describing and never claim enforcement", async () => {
  const contract = await loadSandboxContract(REPO);
  const policy = portableSkillPolicy(contract, "huggingface-spaces");

  assert.equal(policy.schemaVersion, 1);
  assert.equal(policy.skill, "huggingface-spaces");
  assert.equal(policy.profile.name, "publish");
  assert.equal(policy.enforcementLevel, "advisory");
  assert.match(policy.warning, /advisory/i);
});

test("sandbox doctor reports complete coverage and no configured backend", async () => {
  const skills = await discoverSkills(REPO);
  const names = skills.map((skill) => skill.name);
  const contract = await loadSandboxContract(REPO, names);
  const report = sandboxDoctorReport(contract, names);

  assert.deepEqual(report, {
    ok: true,
    schemaVersion: 1,
    enforcementLevel: "advisory",
    backend: "not-configured",
    strictReady: false,
    profiles: 4,
    assignedSkills: 54,
    packagedSkills: 54,
    warnings: [
      "Capability profiles are advisory until an enforcement backend and host adapter are active.",
    ],
  });
});

test("sandbox CLI supports deterministic text and JSON output", async () => {
  let output = "";
  const context = {
    cwd: REPO,
    home: REPO,
    packageRoot: REPO,
    write: (text) => { output += text; },
  };

  assert.equal(await main(["sandbox", "doctor"], context), 0);
  assert.match(output, /Assigned skills: 54\/54/);
  assert.match(output, /Enforcement: advisory/);
  assert.match(output, /Strict ready: no/);

  output = "";
  assert.equal(
    await main(["sandbox", "resolve", "--skill", "code-review", "--json"], context),
    0,
  );
  const resolution = JSON.parse(output);
  assert.equal(resolution.skill, "code-review");
  assert.equal(resolution.profile.name, "observe");
  assert.equal(resolution.profile.enforcementLevel, "advisory");
});

test("sandbox CLI parser fails closed on ambiguous and malformed selectors", () => {
  assert.deepEqual(parseSandboxArgs(["doctor", "--json"]), {
    command: "doctor",
    json: true,
  });
  assert.throws(() => parseSandboxArgs([]), /doctor or resolve/);
  assert.throws(() => parseSandboxArgs(["missing"]), /Unknown sandbox command/);
  assert.throws(() => parseSandboxArgs(["resolve"]), /requires --skill or --sandbox-profile/);
  assert.throws(
    () => parseSandboxArgs(["resolve", "--skill", "code-review", "--sandbox-profile", "observe"]),
    /exactly one/,
  );
  assert.throws(() => parseSandboxArgs(["doctor", "--skill", "code-review"]), /only valid/);
});
