import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import plugin, { OpencodePowerPack } from "../.opencode/plugins/opencode-power-pack.js";
import rootPlugin from "../index.js";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillsDir = path.join(repo, "skills");
const expectedSkills = readdirSync(skillsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(path.join(skillsDir, entry.name, "SKILL.md")))
  .map((entry) => entry.name)
  .sort();

function createV2Context(initialAgents = {}) {
  const skills = [];
  const agents = new Map(Object.entries(initialAgents).map(([id, agent]) => [id, { id, ...agent }]));
  const calls = { skillTransform: 0, agentTransform: 0 };

  const ctx = {
    skill: {
      transform: async (edit) => {
        calls.skillTransform += 1;
        edit({ add: (skill) => skills.push(skill) });
      },
    },
    agent: {
      transform: async (edit) => {
        calls.agentTransform += 1;
        edit({
          get: (id) => agents.get(id),
          list: () => [...agents.values()],
          update: (id, mutate) => {
            const agent = agents.get(id) ?? { id, name: id };
            agents.set(id, agent);
            mutate(agent);
          },
        });
      },
    },
  };

  return { ctx, skills, agents, calls };
}

test("V2 plugin exports a default definition with an id and setup function", () => {
  assert.ok(plugin, "default export exists");
  assert.equal(plugin.id, "opencode-power-pack");
  assert.equal(typeof plugin.setup, "function");
  assert.equal(typeof OpencodePowerPack, "function", "V1 named export is preserved");
});

test("V2 default export exposes the V1 server function for object entrypoints", () => {
  assert.equal(plugin.server, OpencodePowerPack, "default.server mirrors the V1 named export");
});

test("root index.js re-exports the V2 default for directory-form plugin registration", () => {
  assert.equal(rootPlugin, plugin, "package-root index.js resolves to the plugin default export");
});

test("V2 setup registers every bundled skill with its frontmatter", async () => {
  const { ctx, skills } = createV2Context();

  await plugin.setup(ctx);

  assert.deepEqual(
    skills.map((skill) => skill.id).sort(),
    expectedSkills,
    "every SKILL.md is registered exactly once",
  );
  for (const skill of skills) {
    assert.equal(skill.name, skill.id, `${skill.id} keeps its frontmatter name`);
    assert.match(skill.description, /\S/, `${skill.id} has a description`);
    assert.ok(skill.path.endsWith(path.join("skills", skill.id, "SKILL.md")), `${skill.id} points at its file`);
    assert.doesNotMatch(skill.content, /^---/, `${skill.id} content is stripped of frontmatter`);
  }
});

test("V2 setup registers the feature workflow roles as read-only subagents", async () => {
  const { ctx, agents } = createV2Context();

  await plugin.setup(ctx);

  for (const name of ["code-explorer", "code-architect", "code-reviewer"]) {
    const agent = agents.get(name);
    assert.ok(agent, `${name} is registered`);
    assert.equal(agent.mode, "subagent");
    assert.match(agent.description, /\S/);
    assert.match(agent.system, /\S/);
    assert.doesNotMatch(agent.system, /^---/);
    assert.deepEqual(
      agent.permissions.findLast((rule) => rule.action === "read" && rule.resource === "*.env"),
      { action: "read", resource: "*.env", effect: "deny" },
      `${name} cannot read environment files`,
    );
    assert.deepEqual(
      agent.permissions.findLast((rule) => rule.action === "edit" && rule.resource === "*"),
      { action: "edit", resource: "*", effect: "deny" },
      `${name} cannot edit files`,
    );
    assert.deepEqual(
      agent.permissions.findLast((rule) => rule.action === "subagent" && rule.resource === "*"),
      { action: "subagent", resource: "*", effect: "deny" },
      `${name} cannot spawn subagents (V1 "task" translated)`,
    );
  }

  const reviewerRules = agents.get("code-reviewer").permissions;
  assert.deepEqual(
    reviewerRules.findLast((rule) => rule.action === "shell" && rule.resource === "git *--output*"),
    { action: "shell", resource: "git *--output*", effect: "deny" },
    "code-reviewer cannot write through Git output options (V1 \"bash\" translated)",
  );
  assert.deepEqual(reviewerRules[0], { action: "*", resource: "*", effect: "deny" });
});

test("V2 setup ignores a V1-shaped context", async () => {
  await assert.doesNotReject(() => plugin.setup({}));
  await assert.doesNotReject(() => plugin.setup(undefined));
});

test("V2 setup preserves user-defined agents with the same names", async () => {
  const customReviewer = { id: "code-reviewer", name: "code-reviewer", description: "My reviewer", mode: "primary" };
  const { ctx, agents } = createV2Context({ "code-reviewer": customReviewer });

  await plugin.setup(ctx);

  assert.deepEqual(agents.get("code-reviewer"), customReviewer, "user agent is not overwritten");
});

test("V2 setup isolates skills rejected by the host", async () => {
  const { ctx } = createV2Context();
  const registered = [];
  ctx.skill.transform = async (edit) => {
    edit({
      add: (skill) => {
        if (skill.id === "code-reviewer") throw new Error("rejected by host");
        registered.push(skill.id);
      },
    });
  };

  await assert.doesNotReject(() => plugin.setup(ctx));
  assert.equal(registered.length, expectedSkills.length - 1);
  assert.ok(!registered.includes("code-reviewer"));
});
