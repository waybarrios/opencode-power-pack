import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import plugin from "../.opencode/plugins/opencode-power-pack.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS_DIR = path.join(REPO, "skills");
const SKILL_NAMES = readdirSync(SKILLS_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

function fakeEditor(entries = new Map()) {
  return {
    entries,
    list: () => [...entries.values()],
    get: (id) => entries.get(id),
    add: (entry) => entries.set(entry.id, entry),
    update: (id, update) => {
      const draft = entries.get(id) ?? { id };
      update(draft);
      entries.set(id, draft);
    },
    remove: (id) => entries.delete(id),
  };
}

async function register() {
  const skills = fakeEditor();
  const agents = fakeEditor();
  const context = {
    skill: { transform: async (callback) => callback(skills) },
    agent: { transform: async (callback) => callback(agents) },
  };
  await plugin.setup(context);
  return { skills, agents };
}

test("plugin registers every bundled skill with the V2 Skill.Info shape", async () => {
  const { skills } = await register();

  assert.equal(plugin.id, "opencode-power-pack");
  assert.equal(skills.list().length, SKILL_NAMES.length);

  for (const name of SKILL_NAMES) {
    const skill = skills.get(name);
    assert.ok(skill, `${name} is registered`);
    assert.equal(skill.id, name);
    assert.match(skill.name, /\S/);
    assert.match(skill.description, /\S/);
    assert.equal(skill.path, path.join(SKILLS_DIR, name, "SKILL.md"));
    assert.match(skill.content, /\S/);
    assert.doesNotMatch(skill.content, /^---/, `${name} registers its body without frontmatter`);
  }

  assert.match(
    skills.get("feature-dev").content,
    /# Feature Development/,
    "skill content keeps the workflow body",
  );
});

test("plugin registers the feature workflow roles as read-only subagents", async () => {
  const { agents } = await register();

  for (const name of ["code-explorer", "code-architect", "code-reviewer"]) {
    const agent = agents.get(name);
    assert.ok(agent, `${name} is registered`);
    assert.equal(agent.mode, "subagent");
    assert.equal(agent.hidden, false);
    assert.match(agent.description, /\S/);
    assert.match(agent.system, /\S/);
    assert.doesNotMatch(agent.system, /^---/);

    const rule = (action, resource) => agent.permissions
      .filter((entry) => entry.action === action && entry.resource === resource)
      .at(-1)?.effect;
    assert.equal(rule("*", "*"), "deny", `${name} denies unlisted actions`);
    assert.equal(rule("read", "*"), "allow");
    assert.equal(rule("read", "*.env"), "deny");
    assert.equal(rule("read", "*.env.*"), "deny");
    assert.equal(rule("read", "*.env.example"), "allow");
    assert.equal(rule("glob", "*"), "allow");
    assert.equal(rule("grep", "*"), "allow");
    assert.equal(rule("edit", "*"), "deny");
    assert.equal(rule("subagent", "*"), "deny");
    assert.equal(rule("webfetch", "*"), "deny");
    assert.equal(rule("websearch", "*"), "deny");
    assert.equal(rule("external_directory", "*"), "deny");
    assert.equal(rule("shell", "*"), "deny");
  }

  assert.match(
    agents.get("code-reviewer").system,
    /Dispatched handoff/i,
    "registered reviewer inherits the handoff contract",
  );

  const reviewer = agents.get("code-reviewer").permissions;
  assert.deepEqual(
    reviewer.filter(({ action }) => action === "shell"),
    [
      { action: "shell", resource: "*", effect: "deny" },
      { action: "shell", resource: "git status*", effect: "allow" },
      { action: "shell", resource: "git diff*", effect: "allow" },
      { action: "shell", resource: "git show*", effect: "allow" },
      { action: "shell", resource: "git log*", effect: "allow" },
      { action: "shell", resource: "git blame*", effect: "allow" },
      { action: "shell", resource: "git rev-parse*", effect: "allow" },
      { action: "shell", resource: "git merge-base*", effect: "allow" },
      { action: "shell", resource: "git ls-files*", effect: "allow" },
      { action: "shell", resource: "git *--output*", effect: "deny" },
      { action: "shell", resource: "git *--ext-diff*", effect: "deny" },
      { action: "shell", resource: "git *>*", effect: "deny" },
    ],
    "code-reviewer keeps the read-only Git allowlist and write-through denials",
  );
});

test("plugin preserves agents registered before it", async () => {
  const customReviewer = { id: "code-reviewer", name: "Custom", mode: "subagent" };
  const skills = fakeEditor();
  const agents = fakeEditor(new Map([["code-reviewer", customReviewer]]));

  await plugin.setup({
    skill: { transform: async (callback) => callback(skills) },
    agent: { transform: async (callback) => callback(agents) },
  });

  assert.equal(agents.get("code-reviewer"), customReviewer);
  assert.ok(agents.get("code-explorer"), "other roles are still registered");
  assert.ok(agents.get("code-architect"), "other roles are still registered");
});

test("plugin exposes the OpenCode 1 config hook for skills and agents", async () => {
  const { config } = await plugin.server();
  const target = {};
  await config(target);

  assert.deepEqual(target.skills.paths, [SKILLS_DIR]);
  await config(target);
  assert.deepEqual(target.skills.paths, [SKILLS_DIR], "skill path is registered once");

  for (const name of ["code-explorer", "code-architect", "code-reviewer"]) {
    const agent = target.agent[name];
    assert.ok(agent, `${name} is registered`);
    assert.equal(agent.mode, "subagent");
    assert.equal(agent.permission.edit, "deny");
    assert.equal(agent.permission.task, "deny");
    assert.equal(agent.permission.webfetch, "deny");
    if (name !== "code-reviewer") assert.equal(agent.permission.bash, "deny");
    assert.deepEqual(agent.permission.read, {
      "*": "allow",
      "*.env": "deny",
      "*.env.*": "deny",
      "*.env.example": "allow",
    });
    assert.match(agent.description, /\S/);
    assert.match(agent.prompt, /\S/);
    assert.doesNotMatch(agent.prompt, /^---/);
  }

  assert.match(
    target.agent["code-reviewer"].prompt,
    /Dispatched handoff/i,
    "registered reviewer inherits the handoff contract",
  );

  assert.deepEqual(target.agent["code-reviewer"].permission.bash, {
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
  });
});

test("OpenCode 1 config hook preserves user-defined agents", async () => {
  const customReviewer = { description: "My reviewer", mode: "subagent" };
  const target = { agent: { "code-reviewer": customReviewer } };
  const { config } = await plugin.server();

  await config(target);

  assert.equal(target.agent["code-reviewer"], customReviewer);
  assert.ok(target.agent["code-explorer"], "other roles are still registered");
  assert.ok(target.agent["code-architect"], "other roles are still registered");
});

test("both hosts derive the same read-only rules from one permission source", async () => {
  const { agents } = await register();
  const target = {};
  await (await plugin.server()).config(target);

  assert.deepEqual(agents.get("code-explorer").permissions, [
    { action: "*", resource: "*", effect: "deny" },
    { action: "read", resource: "*", effect: "allow" },
    { action: "read", resource: "*.env", effect: "deny" },
    { action: "read", resource: "*.env.*", effect: "deny" },
    { action: "read", resource: "*.env.example", effect: "allow" },
    { action: "glob", resource: "*", effect: "allow" },
    { action: "grep", resource: "*", effect: "allow" },
    { action: "edit", resource: "*", effect: "deny" },
    { action: "subagent", resource: "*", effect: "deny" },
    { action: "webfetch", resource: "*", effect: "deny" },
    { action: "websearch", resource: "*", effect: "deny" },
    { action: "external_directory", resource: "*", effect: "deny" },
    { action: "shell", resource: "*", effect: "deny" },
  ]);
  assert.equal(target.agent["code-explorer"].permission.list, "allow", "OpenCode 1 keeps its list tool");
});

test("host edits to one registered agent do not leak into others or later registrations", async () => {
  // OpenCode 2 appends global rules to each agent's permissions in place.
  const first = await register();
  first.agents.get("code-explorer").permissions.push({ action: "edit", resource: "*", effect: "allow" });
  assert.equal(first.agents.get("code-architect").permissions.at(-1).action, "shell");
  const second = await register();
  assert.equal(second.agents.get("code-explorer").permissions.at(-1).action, "shell");

  const { config } = await plugin.server();
  const legacy = {};
  await config(legacy);
  legacy.agent["code-explorer"].permission.read["*.env"] = "allow";
  assert.equal(legacy.agent["code-architect"].permission.read["*.env"], "deny");
  const fresh = {};
  await config(fresh);
  assert.equal(fresh.agent["code-explorer"].permission.read["*.env"], "deny");
});
