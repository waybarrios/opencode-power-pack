/**
 * opencode-power-pack
 *
 * Auto-registers the bundled skills directory so OpenCode discovers all
 * skills shipped by this plugin (code-review, feature-dev, code-explorer,
 * code-architect, code-reviewer, security-review, frontend-design,
 * mcp-builder, skill-creator, agents-md-improver, agents-md-revise,
 * humanizer, and the rest) without requiring symlinks or manual config.
 *
 * OpenCode 1.18.7+ exposes discovered skills as same-named slash commands.
 * The plugin also registers the feature workflow's specialist roles as
 * read-only subagents derived from their SKILL.md bodies.
 *
 * Dual-compatible with OpenCode V1 and V2:
 *
 * - V1 (opencode 1.x): loaded via the named export `OpencodePowerPack`,
 *   which provides a `config` hook that pushes `config.skills.paths` and
 *   injects the specialist agents into `config.agent`.
 * - V2 (opencode2 2.x): loaded via the default export `{ id, server, setup }`
 *   by the PluginSupervisor. `setup()` registers skills natively through
 *   `ctx.skill.transform()` and the specialist agents through
 *   `ctx.agent.transform()`. The `server` field carries the V1 function for
 *   hosts that resolve the object-entrypoint form, and the package-root
 *   `index.js` re-exports this default for directory-form config entries.
 *
 * ──── Attribution ────────────────────────────────────────────────────────
 *
 * The dual V1/V2 plugin loader pattern (named export for V1, default
 * `{ id, setup }` for V2, `ctx.skill.transform` registration) is adapted
 * directly from Jesse Vincent's superpowers plugin:
 * https://github.com/obra/superpowers
 *
 * The skills under skills/ are modified upstream works. See UPSTREAMS.json
 * for immutable source commits and blobs, and THIRD_PARTY_NOTICES.md for
 * their licenses and attribution.
 * ─────────────────────────────────────────────────────────────────────────
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { loadAgentConfigs } from './agent-config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const skillsDir = path.resolve(__dirname, '../../skills');
const bundledAgents = loadAgentConfigs(skillsDir);

/**
 * V1 Plugin Function (named export)
 *
 * Used by V1 (OpenCode 1.x), which discovers the plugin through its named
 * export. Injects the skills directory and the specialist agents into the
 * live config before the host reads it.
 */
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

/**
 * Parse the leading YAML frontmatter of a SKILL.md file.
 *
 * Handles plain `key: value` lines, quoted values, and block scalar markers
 * (`>`/`|`) with indented continuations and CRLF endings. It is deliberately
 * not a general YAML parser: only the flat `name`/`description` fields the
 * host consumes are read.
 */
function extractFrontmatter(source) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(source);
  if (!match) return { data: {}, content: source };

  const data = {};
  let lastKey = null;
  for (const rawLine of match[1].split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    const colon = line.indexOf(':');
    if (colon > 0 && !/^\s/.test(line)) {
      const key = line.slice(0, colon).trim();
      const value = line.slice(colon + 1).trim();
      data[key] = /^(>[+-]?|\|[+-]?)$/.test(value) ? '' : value;
      lastKey = key;
    } else if (lastKey !== null && line.trim() !== '') {
      data[lastKey] = `${data[lastKey]} ${line.trim()}`.trim();
    }
  }
  for (const key of Object.keys(data)) {
    data[key] = data[key].replace(/^(["'])([\s\S]*)\1$/, '$2');
  }
  return { data, content: match[2] };
}

// V1 permission keys that were renamed in the V2 tool surface.
const ACTION_ALIASES = { bash: 'shell', task: 'subagent', apply_patch: 'patch' };

/**
 * Translate a V1 `permission` map into a V2 Permission.Ruleset.
 *
 * V1 shape: `{ "*": effect, tool: effect, tool: { pattern: effect, ... } }`.
 * V2 shape: `[{ action, resource, effect }]`, where `effect` is
 * `allow`/`deny`/`ask`. The catch-all rule leads so the specific rules that
 * follow it win.
 */
function permissionsFromV1(permission) {
  const rules = [{ action: '*', resource: '*', effect: permission?.['*'] ?? 'deny' }];
  for (const [key, value] of Object.entries(permission ?? {})) {
    if (key === '*') continue;
    const action = ACTION_ALIASES[key] ?? key;
    if (typeof value === 'string') {
      rules.push({ action, resource: '*', effect: value });
    } else if (value && typeof value === 'object') {
      for (const [resource, effect] of Object.entries(value)) {
        rules.push({ action, resource, effect });
      }
    }
  }
  return rules;
}

/**
 * V2 skill registration: read every `skills/<name>/SKILL.md` and add it to
 * the host's skill registry. Failures are contained per skill (the host
 * escalates an uncaught `draft.add` throw into a hard plugin disable).
 */
async function registerV2Skills(ctx) {
  const skills = [];
  for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    const skillPath = path.join(skillsDir, entry.name, 'SKILL.md');
    if (!existsSync(skillPath)) continue;
    const { data, content } = extractFrontmatter(readFileSync(skillPath, 'utf8'));
    skills.push({
      id: entry.name,
      name: data.name || entry.name,
      ...(data.description ? { description: data.description } : {}),
      path: skillPath,
      content,
    });
  }

  await ctx.skill.transform((draft) => {
    for (const skill of skills) {
      try {
        draft.add(skill);
      } catch (err) {
        console.error(`[opencode-power-pack] skill "${skill.id}" rejected by host, skipping:`, err);
      }
    }
  });
}

/**
 * V2 agent registration: map the V1 agent configs onto Agent.Info and add
 * them unless the user already defined an agent with the same name.
 */
async function registerV2Agents(ctx) {
  await ctx.agent.transform((draft) => {
    for (const [name, agent] of Object.entries(bundledAgents)) {
      if (draft.get(name)) continue;
      try {
        draft.update(name, (target) => {
          target.name = name;
          if (agent.description) target.description = agent.description;
          if (agent.prompt) target.system = agent.prompt;
          target.mode = 'subagent';
          target.permissions = permissionsFromV1(agent.permission);
        });
      } catch (err) {
        console.error(`[opencode-power-pack] agent "${name}" rejected by host, skipping:`, err);
      }
    }
  });
}

/**
 * V2 Setup Function (default.setup)
 *
 * Called by the V2 PluginSupervisor. V1 also invokes default.setup with a
 * context that lacks the skill/agent domains; each domain is guarded so a
 * V1 context is a no-op (V1 is served entirely by the named export).
 */
async function setup(ctx) {
  if (typeof ctx?.skill?.transform === 'function') {
    try {
      await registerV2Skills(ctx);
    } catch (err) {
      console.error('[opencode-power-pack] skill registration failed:', err);
    }
  }

  if (typeof ctx?.agent?.transform === 'function') {
    try {
      await registerV2Agents(ctx);
    } catch (err) {
      console.error('[opencode-power-pack] agent registration failed:', err);
    }
  }
}

export default {
  id: 'opencode-power-pack',
  // `server` mirrors the V1 named export so the object-entrypoint form
  // supported by OpenCode V1 1.18.29+ resolves the same implementation.
  server: OpencodePowerPack,
  setup,
};
