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

import path from 'path';
import { fileURLToPath } from 'url';
import { agents, legacyAgents, loadSkills, permissionEffect } from '../lib/agent-config.js';

const skillsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../skills');
const skills = loadSkills(skillsDir);

export default {
  id: 'opencode-power-pack',

  async setup(ctx) {
    const policies = agents(skills);
    await ctx.skill.transform((editor) => {
      for (const skill of skills) {
        // A throw here escapes the transform and the host disables the whole
        // plugin, so one rejected skill must not take the other ones with it.
        try {
          editor.add({ ...skill });
        } catch (error) {
          console.error(`[opencode-power-pack] skipped skill ${skill.id}:`, error);
        }
      }
    });
    await ctx.agent.transform((editor) => {
      for (const [name, { permissions, ...agent }] of Object.entries(policies)) {
        // V2 applies user agent configuration later. Keep its permission defaults
        // intact so a same-named user replacement does not inherit our denials.
        if (!editor.get(name)) editor.update(name, (draft) => Object.assign(draft, agent));
      }
    });
    await ctx.permission.hook('evaluate', async (event) => {
      const name = event.agent ?? (await ctx.session.get({ sessionID: event.sessionID })).data?.agent;
      const policy = Object.hasOwn(policies, name) ? policies[name] : undefined;
      if (!policy) return;
      const { data: agent } = await ctx.agent.get({ agentID: name });
      if (agent?.system !== policy.system || agent.mode !== 'subagent') return;
      // Global and saved allows must not weaken the bundled read-only policy.
      // This hook only denies; explicit user denies and approval prompts remain.
      if (event.resources.some((resource) => permissionEffect(policy.permissions, event.action, resource) === 'deny')) {
        event.effect = 'deny';
        event.message = `The bundled ${name} agent is read-only.`;
      }
    });
  },

  async server() {
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
