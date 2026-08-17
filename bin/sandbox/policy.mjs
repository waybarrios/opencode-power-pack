import { readFile } from "node:fs/promises";
import path from "node:path";

const TOP_LEVEL_KEYS = new Set([
  "$schema",
  "schemaVersion",
  "enforcementLevel",
  "profiles",
  "skills",
]);
const PROFILE_KEYS = new Set(["description", "riskLevel", "capabilities"]);
const CAPABILITY_KEYS = new Set([
  "workspace",
  "temporaryFiles",
  "network",
  "credentials",
  "externalSideEffects",
]);
const ASSIGNMENT_KEYS = new Set(["defaultProfile", "allowedEscalations"]);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertObject(value, label) {
  if (!isObject(value)) throw new TypeError(`${label} must be an object.`);
}

function assertExactKeys(value, expected, label) {
  for (const key of Object.keys(value)) {
    if (!expected.has(key)) throw new TypeError(`${label} has unknown field: ${key}`);
  }
  for (const key of expected) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${label} is missing field: ${key}`);
  }
}

function assertChoice(value, choices, label) {
  if (!choices.includes(value)) {
    throw new TypeError(`${label} must be one of: ${choices.join(", ")}.`);
  }
}

function ownEntry(object, key) {
  return Object.hasOwn(object, key) ? object[key] : undefined;
}

export function validateSandboxContract(contract, availableSkillNames) {
  assertObject(contract, "Sandbox contract");
  assertExactKeys(contract, TOP_LEVEL_KEYS, "Sandbox contract");
  if (contract.$schema !== "./contract.schema.json") {
    throw new TypeError("Sandbox contract must reference ./contract.schema.json.");
  }
  if (contract.schemaVersion !== 1) {
    throw new TypeError(`Unsupported sandbox contract schema version: ${contract.schemaVersion}`);
  }
  if (contract.enforcementLevel !== "advisory") {
    throw new TypeError("PR 1 sandbox contracts must report advisory enforcement.");
  }

  assertObject(contract.profiles, "Sandbox profiles");
  const profileEntries = Object.entries(contract.profiles);
  if (profileEntries.length === 0) throw new TypeError("Sandbox contract must define profiles.");
  for (const [name, profile] of profileEntries) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
      throw new TypeError(`Invalid sandbox profile name: ${name}`);
    }
    assertObject(profile, `Sandbox profile ${name}`);
    assertExactKeys(profile, PROFILE_KEYS, `Sandbox profile ${name}`);
    if (typeof profile.description !== "string" || profile.description.trim() === "") {
      throw new TypeError(`Sandbox profile ${name} requires a description.`);
    }
    if (!Number.isInteger(profile.riskLevel) || profile.riskLevel < 0) {
      throw new TypeError(`Sandbox profile ${name} requires a non-negative integer riskLevel.`);
    }
    assertObject(profile.capabilities, `Sandbox profile ${name} capabilities`);
    assertExactKeys(profile.capabilities, CAPABILITY_KEYS, `Sandbox profile ${name} capabilities`);
    assertChoice(profile.capabilities.workspace, ["read", "write"], `${name}.workspace`);
    assertChoice(profile.capabilities.temporaryFiles, ["deny", "write"], `${name}.temporaryFiles`);
    assertChoice(profile.capabilities.network, ["deny", "explicit"], `${name}.network`);
    assertChoice(profile.capabilities.credentials, ["deny", "explicit"], `${name}.credentials`);
    assertChoice(
      profile.capabilities.externalSideEffects,
      ["deny", "confirm"],
      `${name}.externalSideEffects`,
    );
  }

  assertObject(contract.skills, "Sandbox skill assignments");
  const assignmentEntries = Object.entries(contract.skills);
  if (assignmentEntries.length === 0) {
    throw new TypeError("Sandbox contract must assign skills.");
  }
  for (const [skillName, assignment] of assignmentEntries) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(skillName)) {
      throw new TypeError(`Invalid sandbox skill name: ${skillName}`);
    }
    assertObject(assignment, `Sandbox assignment ${skillName}`);
    assertExactKeys(assignment, ASSIGNMENT_KEYS, `Sandbox assignment ${skillName}`);
    const defaultProfile = ownEntry(contract.profiles, assignment.defaultProfile);
    if (!defaultProfile) {
      throw new TypeError(`${skillName} references unknown profile: ${assignment.defaultProfile}`);
    }
    if (!Array.isArray(assignment.allowedEscalations)) {
      throw new TypeError(`${skillName}.allowedEscalations must be an array.`);
    }
    const seen = new Set();
    for (const escalationName of assignment.allowedEscalations) {
      if (typeof escalationName !== "string" || escalationName.trim() === "") {
        throw new TypeError(`${skillName} has an invalid escalation profile.`);
      }
      if (seen.has(escalationName)) {
        throw new TypeError(`${skillName} repeats escalation profile: ${escalationName}`);
      }
      seen.add(escalationName);
      const escalation = ownEntry(contract.profiles, escalationName);
      if (!escalation) {
        throw new TypeError(`${skillName} references unknown escalation: ${escalationName}`);
      }
      if (escalationName === assignment.defaultProfile) {
        throw new TypeError(`${skillName} repeats its default profile as an escalation.`);
      }
      if (escalation.riskLevel <= defaultProfile.riskLevel) {
        throw new TypeError(`${skillName} escalation ${escalationName} must increase riskLevel.`);
      }
    }
  }

  if (availableSkillNames) {
    const available = new Set(availableSkillNames);
    const assigned = new Set(Object.keys(contract.skills));
    const missing = [...available].filter((name) => !assigned.has(name)).sort();
    const unknown = [...assigned].filter((name) => !available.has(name)).sort();
    if (missing.length > 0) {
      throw new TypeError(`Sandbox assignments missing packaged skills: ${missing.join(", ")}`);
    }
    if (unknown.length > 0) {
      throw new TypeError(`Sandbox assignments reference unknown skills: ${unknown.join(", ")}`);
    }
  }

  return contract;
}

export async function loadSandboxContract(packageRoot, availableSkillNames) {
  const source = await readFile(path.join(packageRoot, "sandbox", "contract.json"), "utf8");
  return validateSandboxContract(JSON.parse(source), availableSkillNames);
}

function resolvedProfile(contract, profileName) {
  const profile = ownEntry(contract.profiles, profileName);
  if (!profile) throw new Error(`Unknown sandbox profile: ${profileName}`);
  return {
    name: profileName,
    description: profile.description,
    riskLevel: profile.riskLevel,
    capabilities: { ...profile.capabilities },
    enforcementLevel: contract.enforcementLevel,
  };
}

export function resolveSandboxProfile(contract, { skillName, profileName }) {
  if ((skillName ? 1 : 0) + (profileName ? 1 : 0) !== 1) {
    throw new Error("Choose exactly one of --skill or --sandbox-profile.");
  }
  if (profileName) return { profile: resolvedProfile(contract, profileName) };

  const assignment = ownEntry(contract.skills, skillName);
  if (!assignment) throw new Error(`Unknown sandbox skill: ${skillName}`);
  return {
    skill: skillName,
    profile: resolvedProfile(contract, assignment.defaultProfile),
    allowedEscalations: assignment.allowedEscalations.map((name) => resolvedProfile(contract, name)),
  };
}

export function resolveSandboxExecutionProfile(contract, { skillName, profileName }) {
  if (!skillName) throw new Error("sandbox exec requires --skill.");
  const resolution = resolveSandboxProfile(contract, { skillName });
  if (!profileName || profileName === resolution.profile.name) return resolution.profile;
  const escalation = resolution.allowedEscalations.find((profile) => profile.name === profileName);
  if (!escalation) {
    throw new Error(`Skill ${skillName} does not permit sandbox profile: ${profileName}`);
  }
  return escalation;
}

export function portableSkillPolicy(contract, skillName) {
  const resolution = resolveSandboxProfile(contract, { skillName });
  return {
    schemaVersion: contract.schemaVersion,
    source: "@waybarrios/opencode-power-pack",
    enforcementLevel: contract.enforcementLevel,
    warning: "This capability policy is advisory until an enforcement backend and host adapter are active.",
    skill: resolution.skill,
    profile: resolution.profile,
    allowedEscalations: resolution.allowedEscalations,
  };
}

export function sandboxDoctorReport(contract, availableSkillNames, runtimeStatus) {
  validateSandboxContract(contract, availableSkillNames);
  const status = runtimeStatus || {
    backend: "not-configured",
    runnerReady: false,
    executionLevel: "advisory",
    errors: [],
    warnings: [],
  };
  return {
    ok: true,
    schemaVersion: contract.schemaVersion,
    enforcementLevel: contract.enforcementLevel,
    backend: status.backend,
    runnerReady: status.runnerReady,
    executionLevel: status.executionLevel,
    strictReady: false,
    profiles: Object.keys(contract.profiles).length,
    assignedSkills: Object.keys(contract.skills).length,
    packagedSkills: availableSkillNames.length,
    warnings: [
      ...status.errors.map((error) => `Runtime unavailable: ${error}`),
      ...status.warnings,
      "Skill metadata remains advisory until a host adapter routes commands through sandbox exec.",
    ],
  };
}
