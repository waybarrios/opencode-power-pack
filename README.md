<p align="center">
  <img src="assets/logo.svg" alt="opencode-power-pack" width="100%" />
</p>

<p align="center">
  <i>Eleven Claude Code workflows, adapted for modern OpenCode.<br/>
  Code review, security audit, feature development, frontend design, project memory, and authoring tools.</i>
</p>

<p align="center">
  <a href="THIRD_PARTY_NOTICES.md"><img alt="License: MIT and Apache-2.0" src="https://img.shields.io/badge/license-MIT%20%2B%20Apache--2.0-brightgreen?style=flat-square"></a>
  <a href="https://github.com/waybarrios/opencode-power-pack/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/waybarrios/opencode-power-pack?style=flat-square&color=FFD60A"></a>
  <a href="https://github.com/waybarrios/opencode-power-pack/commits/main"><img alt="Last commit" src="https://img.shields.io/github/last-commit/waybarrios/opencode-power-pack?style=flat-square"></a>
  <a href="https://github.com/waybarrios/opencode-power-pack/issues"><img alt="GitHub issues" src="https://img.shields.io/github/issues/waybarrios/opencode-power-pack?style=flat-square"></a>
  <img alt="Skills: 11" src="https://img.shields.io/badge/skills-11-FFD60A?style=flat-square&labelColor=0B0F14">
  <img alt="OpenCode 1.18.7+" src="https://img.shields.io/badge/opencode-1.18.7%2B-0B0F14?style=flat-square&labelColor=FFD60A">
</p>

<p align="center">
  <a href="#installation"><b>Install</b></a> ·
  <a href="#whats-inside"><b>Skills</b></a> ·
  <a href="#slash-commands"><b>Commands</b></a> ·
  <a href="#how-it-works"><b>Architecture</b></a> ·
  <a href="#acknowledgments"><b>Credits</b></a>
</p>

## Why This Exists

OpenCode reads `SKILL.md` natively, but many valuable Claude Code workflows originated as Claude-specific commands and agents. Copying those artifacts directly does not preserve their orchestration, permissions, or subagent behavior.

This package adapts the portable methodology into OpenCode skills, registers the feature-development specialist roles as real read-only subagents, and ships immutable provenance for every upstream work.

It complements [obra/superpowers](https://github.com/obra/superpowers), which provides process skills such as brainstorming, TDD, debugging, and plan execution.

## What's Inside

| Category | Skill | Purpose |
|---|---|---|
| Review | `code-review` | Multi-agent PR review with confidence filtering and reproduction scenarios |
| Review | `security-review` | Security-focused review with category coverage and exploit-path validation |
| Feature development | `feature-dev` | Seven-phase workflow from discovery through implementation and review |
| Feature development | `code-explorer` | Trace a feature across entry points, layers, state, and dependencies |
| Feature development | `code-architect` | Produce a file-level architecture and implementation blueprint |
| Feature development | `code-reviewer` | Adversarial review of a focused local change set |
| Design | `frontend-design` | Create distinctive interfaces with an accessibility and craft rubric |
| Authoring | `mcp-builder` | Design and build MCP servers in TypeScript or Python |
| Authoring | `skill-creator` | Create, test, and improve reusable `SKILL.md` workflows |
| Project memory | `agents-md-improver` | Audit project rules and propose targeted improvements |
| Project memory | `agents-md-revise` | Capture durable session learnings in project rules |

`code-explorer`, `code-architect`, and `code-reviewer` are available both as standalone skills and as least-privilege subagents used by `feature-dev`.

## Installation

### Prerequisites

- OpenCode 1.18.7 or newer: <https://opencode.ai>
- Git, used by OpenCode to fetch Git-based plugins

### Install From GitHub

```bash
opencode plugin --global "opencode-power-pack@git+https://github.com/waybarrios/opencode-power-pack.git"
```

Restart OpenCode after installation. OpenCode discovers each skill and creates its same-named slash command automatically.

To pin a published release, append its tag:

```bash
opencode plugin --global "opencode-power-pack@git+https://github.com/waybarrios/opencode-power-pack.git#<tag>"
```

### Install From A Local Clone

```bash
git clone https://github.com/waybarrios/opencode-power-pack.git ~/code/opencode-power-pack
opencode plugin --global "opencode-power-pack@git+file:///home/you/code/opencode-power-pack"
```

Use an absolute `file://` URL adjusted for your operating system. The target directory must be a Git repository.

### Verify

```bash
opencode debug skill
opencode debug agent code-explorer
```

The first command should include all eleven unprefixed skill names. The second should report a `subagent` with editing denied. In the TUI, `ctrl+p` should list `/code-review`, `/feature-dev`, `/frontend-design`, and the other skill-derived commands.

## Updating

For a GitHub installation:

```bash
opencode plugin --global --force "opencode-power-pack@git+https://github.com/waybarrios/opencode-power-pack.git"
```

Restart OpenCode after the command finishes. For a pinned installation, update the tag first. Local-clone users should run `git pull` in the clone and reinstall with the same `git+file://` spec.

## Uninstalling

Remove the `opencode-power-pack@...` entry from the `plugin` array in the config where it was installed, then restart OpenCode. There are no command symlinks or copied command files to remove.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Skills or commands do not appear | OpenCode is older than 1.18.7 | Upgrade OpenCode, restart, and run `opencode debug skill` |
| Skills are missing from debug output | Plugin installation failed or its config entry is absent | Re-run `opencode plugin --global --force <module-spec>` and inspect the reported error |
| Specialist agents are missing | Stale plugin checkout | Force reinstall, restart, and run `opencode debug agent code-explorer` |
| Installation reports a Git error | Invalid URL, network failure, or inaccessible repository | Validate the source with `git ls-remote <url>` |
| A workflow is rushed or incomplete | The backing model skipped multi-stage instructions | Use a stronger model and inspect whether required subagent tools are available |

## Slash Commands

OpenCode 1.18.7+ automatically exposes every discovered skill as a same-named slash command:

```text
/code-review
/security-review
/feature-dev
/code-explorer
/code-architect
/code-reviewer
/frontend-design
/mcp-builder
/skill-creator
/agents-md-improver
/agents-md-revise
```

Examples:

```text
/code-review --comment
/code-review review https://github.com/owner/repo/pull/449
/feature-dev add a logout button to the topbar
/security-review
/frontend-design pricing page, brutalist tone, single-screen
```

An explicit command with the same name takes precedence over a skill-derived command.

## How It Works

```text
opencode-power-pack
|
+-- .opencode/plugins/opencode-power-pack.js
|   +-- registers skills/ in config.skills.paths
|   +-- registers code-explorer as a read-only subagent
|   +-- registers code-architect as a read-only subagent
|   +-- registers code-reviewer with read-only Git commands
|
+-- skills/<name>/SKILL.md
|   +-- native skill-tool entry
|   +-- native same-named slash command
|   +-- immutable source and license metadata
|
+-- UPSTREAMS.json
    +-- repository, commit, path, blob, date, and adaptation type
```

Each `SKILL.md` is the single source for its workflow. The plugin derives specialist-agent prompts from those files at startup, so the agent and standalone skill cannot drift apart. Existing user-defined agents with the same names take precedence.

The packaged agents deny edits, external network access, and nested tasks. `code-reviewer` additionally allows a narrow set of read-only Git commands.

## Scope And Non-Goals

| In scope | Out of scope |
|---|---|
| Portable Claude Code workflow methodology | Claude Code hook contracts |
| OpenCode-native skills, commands, and subagents | Proprietary or non-redistributable plugins |
| Licensed adaptations with immutable provenance | Automatic trust of third-party skill catalogs |
| Explicit permission boundaries and regression tests | Supporting OpenCode versions older than 1.18.7 |

## Contributing

Contributions are welcome for:

- Improvements based on reproducible workflow failures
- Behavioral evaluations and adversarial fixtures
- Portable references and deterministic helper scripts
- New ports with a verified license and immutable upstream source

Before opening a PR:

```bash
npm test
npm run smoke:opencode
npm pack --dry-run
```

Live behavioral evaluation is opt-in, needs `OPENCODE_EVAL_MODEL`, and runs only from a source checkout:

```bash
OPENCODE_EVAL_MODEL=provider/model npm run eval:behavioral
```

See [`evals/behavioral/README.md`](evals/behavioral/README.md) for the replay, review, and acceptance workflow. Snapshots are content-addressed evidence from one reviewed model execution, not universal guarantees.

Every skill must use a lowercase hyphenated directory/name, provide a trigger-specific description, remain under 500 lines where practical, and record its exact upstream in `UPSTREAMS.json`.

## Acknowledgments

The bundled skills are modified upstream works. This repository contributes their OpenCode adaptation, packaging, additional workflow guidance, tests, and compatibility layer.

| Upstream | Pinned source | Used for |
|---|---|---|
| Anthropic | [`claude-plugins-official@bdca23e8`](https://github.com/anthropics/claude-plugins-official/tree/bdca23e8e46f8832d0030c05804ae207786ae37f) | Code review, feature development, frontend design, and project memory |
| Anthropic | [`skills@5128e186`](https://github.com/anthropics/skills/tree/5128e1865d670f5d6c9cef000e6dfc4e951fb5b9) | MCP Builder and Skill Creator |
| Anthropic | [`claude-code-security-review@0c6a49f1`](https://github.com/anthropics/claude-code-security-review/tree/0c6a49f1fa56a1d472575da86a94dbc1edb78eda) | Security Review |
| Jesse Vincent | [`superpowers@6efe32c9`](https://github.com/obra/superpowers/tree/6efe32c9e2dd002d0c394e861e0529675d1ab32e) | OpenCode plugin registration pattern |

See [`UPSTREAMS.json`](UPSTREAMS.json) for exact source paths and Git blobs. See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) for attribution and modification notices.

## License

The wrapper code and original project material are MIT-licensed under [LICENSE](LICENSE). Modified skills derived from Anthropic's official plugins and skills are Apache-2.0, except `security-review`, whose upstream is MIT. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), [UPSTREAMS.json](UPSTREAMS.json), and [LICENSES/](LICENSES/) for exact terms.
