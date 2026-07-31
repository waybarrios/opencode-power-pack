/**
 * opencode-power-pack
 *
 * Auto-registers the bundled skills directory so OpenCode discovers all
 * skills shipped by this plugin (code-review, feature-dev, code-explorer,
 * code-architect, code-reviewer, security-review, frontend-design,
 * mcp-builder, skill-creator, agents-md-improver, agents-md-revise) without
 * requiring symlinks or manual config.
 *
 * OpenCode 1.18.7+ exposes discovered skills as same-named slash commands.
 * The plugin also registers the feature workflow's specialist roles as
 * read-only subagents derived from their SKILL.md bodies.
 *
 * ──── Attribution ────────────────────────────────────────────────────────
 *
 * The plugin loader pattern (importing fs/path via fileURLToPath, exporting
 * an async ctx → hooks function, pushing into config.skills.paths via the
 * `config` hook) is adapted directly from Jesse Vincent's superpowers
 * plugin: https://github.com/obra/superpowers
 *
 * The skills under skills/ are modified upstream works. See UPSTREAMS.json
 * for immutable source commits and blobs, and THIRD_PARTY_NOTICES.md for
 * their licenses and attribution.
 * ─────────────────────────────────────────────────────────────────────────
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { loadAgentConfigs } from './agent-config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const skillsDir = path.resolve(__dirname, '../../skills');
const bundledAgents = loadAgentConfigs(skillsDir);

export const OpencodePowerPack = async () => {
  return {
    config: async (config) => {
      config.skills = config.skills || {};
      config.skills.paths = config.skills.paths || [];
      if (!config.skills.paths.includes(skillsDir)) {
        config.skills.paths.push(skillsDir);
      }
      config.agent = config.agent || {};
      for (const [name, agent] of Object.entries(bundledAgents)) {
        if (!config.agent[name]) config.agent[name] = agent;
      }
    },
  };
};
