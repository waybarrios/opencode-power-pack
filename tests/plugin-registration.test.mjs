import { test } from "node:test";
import assert from "node:assert/strict";
import { OpencodePowerPack } from "../.opencode/plugins/opencode-power-pack.js";

test("plugin registers the feature workflow roles as read-only subagents", async () => {
  const plugin = await OpencodePowerPack();
  const config = {};

  await plugin.config(config);

  for (const name of ["code-explorer", "code-architect", "code-reviewer"]) {
    const agent = config.agent?.[name];
    assert.ok(agent, `${name} is registered`);
    assert.equal(agent.mode, "subagent");
    assert.equal(agent.permission.edit, "deny");
    assert.equal(agent.permission.task, "deny");
    assert.equal(agent.permission.webfetch, "deny");
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
    config.agent["code-reviewer"].prompt,
    /Dispatched handoff/i,
    "registered reviewer inherits the handoff contract",
  );

  assert.deepEqual(config.agent["code-reviewer"].permission.bash, {
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

test("plugin preserves user-defined agents with the same names", async () => {
  const plugin = await OpencodePowerPack();
  const customReviewer = { description: "My reviewer", mode: "subagent" };
  const config = { agent: { "code-reviewer": customReviewer } };

  await plugin.config(config);

  assert.equal(config.agent["code-reviewer"], customReviewer);
});
