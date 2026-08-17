# OpenCode Power Pack

OpenCode Power Pack is an open-source collection of 54 portable Agent Skills for Claude Code, Codex, OpenCode, and Pi. The current release is v0.5.0.

## Start here

- Website: https://skills.waybarrios.com/
- Installation guide: https://skills.waybarrios.com/docs/
- Complete skill browser: https://skills.waybarrios.com/docs/skills/
- GitHub: https://github.com/waybarrios/opencode-power-pack
- npm: https://www.npmjs.com/package/@waybarrios/opencode-power-pack

## Install

The selective npm installer requires Node.js 20 or newer.

```sh
# See every skill and profile
npx @waybarrios/opencode-power-pack list

# Install one skill
npx @waybarrios/opencode-power-pack install code-review

# Preview the recommended profile
npx @waybarrios/opencode-power-pack install --profile recommended --dry-run

# Install the recommended profile
npx @waybarrios/opencode-power-pack install --profile recommended
```

To delegate installation to a coding agent, use the safe dry-run-first prompt and host rules in https://skills.waybarrios.com/agent-install.md.

## Installable skill packs

| Profile | Intended audience | Coverage |
| --- | --- | --- |
| `recommended` | Developers who want a balanced everyday toolkit | Feature delivery, review, quality, frontend, MCP, and project memory |
| `review` | Maintainers and pull-request reviewers | Comprehensive, focused, quality, and differential review |
| `feature-dev` | Engineers implementing non-trivial features | Exploration, architecture, implementation, and review |
| `frontend` | Frontend developers and designers | Interface implementation and anti-generic design critique |
| `security` | AppSec engineers and security-conscious maintainers | Review, threat modeling, scanning, validation, and reporting |
| `huggingface` | ML engineers and researchers | Discovery, inference, training, evaluation, Spaces, and AWS deployment |
| `authoring` | Builders of reusable agent tools | Agent Skills, MCP servers, and paper summarization |
| `project-memory` | Teams maintaining durable agent context | AGENTS.md and CLAUDE.md improvement and revision |

Install a profile with:

```sh
npx @waybarrios/opencode-power-pack install --profile <profile-name>
```

## Supported hosts

- Claude Code uses namespaced plugin skills such as `/opencode-power-pack:code-review`.
- Codex invokes installed workflows with names such as `$code-review`.
- OpenCode invokes installed workflows with names such as `/code-review`.
- Pi exposes the package's declared skills directory.

## Review workflows

- `code-review` is comprehensive and merge-oriented.
- `code-reviewer` is focused and designed for smaller implementation reviews and feature-dev handoffs.
- `code-quality` checks maintainability, linting, formatting, complexity, and quality gates.
- `security-review` focuses only on exploitable security issues in pending changes.
- `differential-review` performs security-focused analysis across revisions.

## Native sandbox runner

Version 0.5.0 includes an opt-in native runner for one contained command tree on macOS and Linux:

```sh
npm install --global @waybarrios/opencode-power-pack@0.5.0
opencode-power-pack sandbox doctor
opencode-power-pack sandbox exec --skill code-review -- git status --short
```

The runner supports `observe`, `develop`, `network-read`, and `publish` profiles. Network destinations, credential environment variables, and external side effects require explicit command-line grants.

Codex, OpenCode, Claude Code, and Pi can all invoke the manual runner. Automatic host routing is not yet implemented, so the current guarantee covers the selected command and its descendants, not every agent tool. See the [sandbox guide](https://skills.waybarrios.com/docs/#sandbox).

## Quality signals

- 54 of 54 official Agent Skills validations pass.
- 400 automated behavioral, packaging, and sandbox tests are defined at v0.5.0.
- Claude plugin and marketplace metadata receive strict validation.
- OpenCode has minimum-version and latest-version smoke coverage.
- Third-party workflows include immutable provenance, notices, and license records.

OpenCode Power Pack is MIT AND Apache-2.0 licensed, subject to the per-skill provenance and notices in the repository.
