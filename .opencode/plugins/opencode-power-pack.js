/**
 * opencode-power-pack
 *
 * Auto-registers the bundled skills directory so OpenCode discovers all
 * skills shipped by this plugin (code-review, feature-dev, code-explorer,
 * code-architect, code-reviewer, security-review, frontend-design,
 * mcp-builder, skill-creator, agents-md-improver, agents-md-revise) without
 * requiring symlinks or manual config.
 *
 * Slash commands are NOT registered here on purpose — they are provided by
 * physical markdown files under `commands/` in this repo, intended to be
 * symlinked into `~/.config/opencode/commands/`. Each command file inlines
 * the full SKILL.md content, so the model receives the actual workflow as
 * its prompt rather than a meta-instruction telling it to load the skill.
 *
 * ──── Attribution ────────────────────────────────────────────────────────
 *
 * The plugin loader pattern (importing fs/path via fileURLToPath, exporting
 * an async ctx → hooks function, pushing into config.skills.paths via the
 * `config` hook) is adapted directly from Jesse Vincent's superpowers
 * plugin: https://github.com/obra/superpowers
 *
 * The skills under skills/ are ports/translations of artifacts originally
 * written by Anthropic for Claude Code. See README.md → Acknowledgments
 * and each SKILL.md's `license` frontmatter for the specific upstream of
 * each skill.
 * ─────────────────────────────────────────────────────────────────────────
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const skillsDir = path.resolve(__dirname, '../../skills');

export const OpencodePowerPack = async () => {
  return {
    config: async (config) => {
      config.skills = config.skills || {};
      config.skills.paths = config.skills.paths || [];
      if (!config.skills.paths.includes(skillsDir)) {
        config.skills.paths.push(skillsDir);
      }
    },
  };
};
