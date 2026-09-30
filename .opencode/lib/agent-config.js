import { readdirSync, readFileSync, statSync } from "fs";
import path from "path";

const AGENT_NAMES = ["code-explorer", "code-architect", "code-reviewer"];
const READ_ONLY_PERMISSION = {
  "*": "deny",
  read: {
    "*": "allow",
    "*.env": "deny",
    "*.env.*": "deny",
    "*.env.example": "allow",
  },
  glob: "allow",
  grep: "allow",
  list: "allow",
  edit: "deny",
  task: "deny",
  webfetch: "deny",
  websearch: "deny",
  external_directory: "deny",
};
const REVIEW_BASH_PERMISSION = {
  "*": "deny",
  "git status*": "allow",
  "git diff*": "allow",
  "git show*": "allow",
  "git log*": "allow",
  "git blame*": "allow",
  "git rev-parse*": "allow",
  "git merge-base*": "allow",
  "git ls-files*": "allow",
  "git *--output*": "deny",
  "git *--ext-diff*": "deny",
  "git *>*": "deny",
};
// OpenCode 2 renamed these V1 permission keys and folded `list` into `read`.
const V2_ACTIONS = { bash: "shell", task: "subagent", list: null };

function readSkill(skillsDir, id) {
  const file = path.join(skillsDir, id, "SKILL.md");
  const match = readFileSync(file, "utf8").match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error(`Invalid frontmatter in ${id}/SKILL.md`);

  const field = (key) => match[1]
    .split(/\r?\n/)
    .find((line) => line.startsWith(`${key}:`))
    ?.slice(key.length + 1)
    .trim();
  const description = field("description");
  if (!description) throw new Error(`Missing description in ${id}/SKILL.md`);

  // Native OpenCode 2 discovery strips frontmatter, so the body is the content.
  return { id, name: field("name") || id, description, path: file, content: match[2] };
}

/** Parses every bundled SKILL.md into the OpenCode 2 Skill.Info shape. */
export function loadSkills(skillsDir) {
  return readdirSync(skillsDir)
    .filter((entry) => statSync(path.join(skillsDir, entry, "SKILL.md"), { throwIfNoEntry: false })?.isFile())
    .sort()
    .map((id) => readSkill(skillsDir, id));
}

function specialists(skills) {
  return AGENT_NAMES.map((name) => {
    const skill = skills.find(({ id }) => id === name);
    if (!skill) throw new Error(`Missing specialist skill ${name}`);
    return skill;
  });
}

// Returns a fresh copy on every call: OpenCode edits agent permissions in place.
function permissionFor(name) {
  return structuredClone({
    ...READ_ONLY_PERMISSION,
    bash: name === "code-reviewer" ? REVIEW_BASH_PERMISSION : "deny",
  });
}

/** Converts a V1 permission map into the ordered V2 ruleset, preserving key order. */
function toRuleset(permission) {
  return Object.entries(permission).flatMap(([key, value]) => {
    const action = key in V2_ACTIONS ? V2_ACTIONS[key] : key;
    if (!action) return [];
    const patterns = typeof value === "string" ? { "*": value } : value;
    return Object.entries(patterns).map(([resource, effect]) => ({ action, resource, effect }));
  });
}

/** OpenCode 1 agent definitions, merged through the plugin config hook. */
export function legacyAgents(skills) {
  return Object.fromEntries(specialists(skills).map((skill) => [skill.id, {
    description: skill.description,
    prompt: skill.content.trim(),
    mode: "subagent",
    permission: permissionFor(skill.id),
  }]));
}

/** OpenCode 2 Agent.Info patches, applied through an agent transform. */
export function agents(skills) {
  return Object.fromEntries(specialists(skills).map((skill) => [skill.id, {
    name: skill.name,
    description: skill.description,
    system: skill.content.trim(),
    mode: "subagent",
    hidden: false,
    permissions: toRuleset(permissionFor(skill.id)),
  }]));
}
