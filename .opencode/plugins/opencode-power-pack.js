/**
 * opencode-power-pack
 *
 * Registers every bundled skill and the feature workflow's specialist roles
 * as read-only subagents derived from their SKILL.md bodies, on both hosts:
 *
 * - OpenCode 2 calls `setup` and receives the skill and agent transforms.
 * - OpenCode 1 (1.18.7+) calls `server` on the default export and receives
 *   the config hook, which registers skills/ in `config.skills.paths` and
 *   merges the agents into `config.agent`.
 *
 * User-defined agents with the same names are preserved.
 *
 * ──── Attribution ────────────────────────────────────────────────────────
 *
 * The OpenCode 1 loader pattern (importing fs/path via fileURLToPath and
 * pushing into config.skills.paths via the `config` hook) is adapted directly
 * from Jesse Vincent's superpowers plugin: https://github.com/obra/superpowers
 *
 * The skills under skills/ are modified upstream works. See UPSTREAMS.json
 * for immutable source commits and blobs, and THIRD_PARTY_NOTICES.md for
 * their licenses and attribution.
 * ─────────────────────────────────────────────────────────────────────────
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { agents, deniesSpecialistPermission, legacyAgents, loadSkills } from "../lib/agent-config.js";

const skillsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../skills");

export default {
  id: "opencode-power-pack",

  async setup(ctx) {
    const skills = loadSkills(skillsDir);
    const protectedAgents = new Set();
    await ctx.skill.transform((editor) => {
      for (const skill of skills) editor.add({ ...skill });
    });
    await ctx.agent.transform((editor) => {
      protectedAgents.clear();
      for (const [name, agent] of Object.entries(agents(skills))) {
        if (!editor.get(name)) {
          editor.update(name, (draft) => Object.assign(draft, structuredClone(agent)));
          protectedAgents.add(name);
        }
      }
    });
    await ctx.permission.hook("evaluate", (event) => {
      if (
        protectedAgents.has(event.agent)
        && deniesSpecialistPermission(event.agent, event.action, event.resources)
      ) {
        event.effect = "deny";
      }
    });
  },

  async server() {
    const skills = loadSkills(skillsDir);
    return {
      config: async (config) => {
        config.skills = config.skills || {};
        config.skills.paths = config.skills.paths || [];
        if (!config.skills.paths.includes(skillsDir)) config.skills.paths.push(skillsDir);

        config.agent = config.agent || {};
        for (const [name, agent] of Object.entries(legacyAgents(skills))) {
          if (!config.agent[name]) config.agent[name] = agent;
        }
      },
    };
  },
};
