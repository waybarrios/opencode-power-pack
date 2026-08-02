# Third-Party Notices

The repository wrapper, plugin integration, packaging, tests, and original
documentation are licensed under the root MIT `LICENSE` unless a file states
otherwise.

The skills are modified derivatives of the sources recorded in
`UPSTREAMS.json`. They are not represented as original work. Every entry
records the immutable upstream commit, source path, Git blob, license, and
adaptation type reviewed for this distribution.

## OMP Designer

The modified `ai-slop` skill derives from the MIT-licensed `LePro10/omp-designer`
repository (`skills/ai-slop.md`, condensed from ~740 to under 500 lines for the
skill-body length limit; core rubric, tests, and severity model preserved).

Copyright 2026 Leandro (LePro10). The upstream notice is available at
`LICENSES/Omp-designer-MIT.txt`.

## Anthropic Official Plugins

The following modified skills derive from Apache-2.0 material in
`anthropics/claude-plugins-official`:

- `agents-md-improver`
- `agents-md-revise`
- `code-architect`
- `code-explorer`
- `code-review`
- `code-reviewer`
- `feature-dev`
- `frontend-design`

Copyright 2026 Anthropic, PBC. Licensed under Apache-2.0. The full license is
available at `LICENSES/Apache-2.0.txt`.

## Anthropic Skills

The modified `mcp-builder` and `skill-creator` skills derive from Apache-2.0
material in `anthropics/skills`.

Copyright 2026 Anthropic, PBC. Licensed under Apache-2.0. The full license is
available at `LICENSES/Apache-2.0.txt`.

## Anthropic Security Review

The modified `security-review` skill derives from the MIT-licensed
`anthropics/claude-code-security-review` repository.

Copyright 2025 Anthropic. The upstream notice is available at
`LICENSES/Anthropic-security-review-MIT.txt`.

## Superpowers OpenCode Plugin Pattern

The skill-path registration pattern in `.opencode/plugins/opencode-power-pack.js`
is adapted from the MIT-licensed `obra/superpowers` OpenCode plugin.

Copyright 2025 Jesse Vincent. The upstream notice is available at
`LICENSES/Superpowers-MIT.txt`.

## Modification Notice

All listed skills were changed for OpenCode compatibility, consolidated into
the `SKILL.md` format, and may include additional local workflow, validation,
or safety guidance. Consult Git history for the exact local changes.
