<p align="center">
  <img src="assets/logo.svg" alt="opencode-power-pack" width="100%" />
</p>

<h1 align="center">OpenCode Power Pack for Claude Code, Codex, OpenCode + Pi</h1>

<p align="center">
  <i>Fifty-four portable workflows for Claude Code, Codex, OpenCode, and Pi.<br/>
  Code review, security audit, feature development, frontend design, project memory, and authoring tools.</i>
</p>

<p align="center">
  <a href="THIRD_PARTY_NOTICES.md"><img alt="License: MIT and Apache-2.0" src="https://img.shields.io/badge/license-MIT%20%2B%20Apache--2.0-brightgreen?style=flat-square"></a>
  <a href="https://github.com/waybarrios/opencode-power-pack/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/waybarrios/opencode-power-pack?style=flat-square&color=FFD60A"></a>
  <a href="https://github.com/waybarrios/opencode-power-pack/commits/main"><img alt="Last commit" src="https://img.shields.io/github/last-commit/waybarrios/opencode-power-pack?style=flat-square"></a>
  <a href="https://github.com/waybarrios/opencode-power-pack/issues"><img alt="GitHub issues" src="https://img.shields.io/github/issues/waybarrios/opencode-power-pack?style=flat-square"></a>
  <a href="https://github.com/hashgraph-online/hol-guard"><img alt="HOL Guard scanner" src="https://img.shields.io/badge/HOL%20Guard-scanned-00a67e?style=flat-square"></a>
  <img alt="Skills: 54" src="https://img.shields.io/badge/skills-54-FFD60A?style=flat-square&labelColor=0B0F14">
  <img alt="Claude Code plugin" src="https://img.shields.io/badge/Claude_Code-plugin-0B0F14?style=flat-square&labelColor=FFD60A">
  <img alt="OpenCode 1.18.7+" src="https://img.shields.io/badge/opencode-1.18.7%2B-0B0F14?style=flat-square&labelColor=FFD60A">
  <img alt="Codex plugin" src="https://img.shields.io/badge/Codex-plugin-0B0F14?style=flat-square&labelColor=FFD60A">
  <img alt="Pi package" src="https://img.shields.io/badge/Pi-package-0B0F14?style=flat-square&labelColor=FFD60A">
</p>

<p align="center">
  <a href="#installation"><b>Install</b></a> ·
  <a href="#selective-install-with-npm"><b>Select Skills</b></a> ·
  <a href="#claude-code-quick-install"><b>Claude Code</b></a> ·
  <a href="#codex-quick-install"><b>Codex Quick Install</b></a> ·
  <a href="#pi-quick-install"><b>Pi Quick Install</b></a> ·
  <a href="#whats-inside"><b>Skills</b></a> ·
  <a href="#sandbox-capability-contract"><b>Sandbox Contract</b></a> ·
  <a href="#invocation"><b>Invocation</b></a> ·
  <a href="#how-it-works"><b>Architecture</b></a> ·
  <a href="#acknowledgments"><b>Credits</b></a>
</p>

## New in v0.5.0: Lightweight Native Sandboxes

OpenCode Power Pack now includes an opt-in, fail-closed sandbox runner for safer command execution from **Codex, OpenCode, Claude Code, and Pi**. It gives all four agents one portable capability contract with four least-privilege profiles, while using native Seatbelt isolation on macOS and Bubblewrap on Linux.

- **Lightweight:** one contained command tree, with no container image, daemon, or persistent sandbox to manage.
- **Portable:** the same CLI and skill policy work from all four supported coding agents.
- **Least privilege:** skills default to `observe`, `develop`, `network-read`, or `publish`, with explicit escalation checks.
- **Fail closed:** unavailable isolation, undeclared escalation, missing confirmation, or backend failure stops execution instead of retrying outside the sandbox.

Install the CLI, verify the boundary from the active agent session, and run a command with the skill's trusted profile:

```bash
npm install --global @waybarrios/opencode-power-pack@0.5.0
opencode-power-pack sandbox doctor --json
opencode-power-pack sandbox exec --skill code-review -- git status --short
```

The current guarantee is intentionally precise: the command and its descendants are `shell-contained`. Automatic host routing and whole-agent isolation are not claimed yet. See [run the sandbox from each agent](#run-the-sandbox-from-each-agent) and the [complete compatibility specification](docs/sandbox-compatibility.md).

## Claude Code Quick Install

Run these commands inside Claude Code:

```text
/plugin marketplace add waybarrios/opencode-power-pack
/plugin install opencode-power-pack@opencode-power-pack
```

Run `/reload-plugins` if the installation summary requests it. Skills are namespaced to avoid collisions, so explicit invocations use names such as `/opencode-power-pack:code-review` and `/opencode-power-pack:feature-dev`.

## Codex Quick Install

```bash
codex plugin marketplace add waybarrios/opencode-power-pack --ref main
codex plugin add opencode-power-pack@opencode-power-pack
```

Start a new Codex session, open `/plugins` to confirm the installation, or invoke a workflow explicitly with `$code-review`, `$feature-dev`, `$security-review`, and the other bundled skills.

## Pi Quick Install

```bash
pi install git:github.com/waybarrios/opencode-power-pack
```

Pi discovers the fifty-four skills declared by the package. Use `pi list` to verify the installation. For a project-local installation recorded in `.pi/settings.json`, add `-l`:

```bash
pi install git:github.com/waybarrios/opencode-power-pack -l
```

## Selective Install With npm

Install only the workflows you want into the shared `.agents/skills` location recognized by Codex, OpenCode, and Pi:

Use `npx` when you want to run the latest installer without keeping a global copy:

```bash
# Inspect every profile and skill
npx @waybarrios/opencode-power-pack list

# Install the balanced recommended profile for your user
npx @waybarrios/opencode-power-pack install --profile recommended

# Install individual skills
npx @waybarrios/opencode-power-pack install code-review security-review

# Install a profile only for the current repository
npx @waybarrios/opencode-power-pack install --profile review --project

# Preview a selection without writing anything
npx @waybarrios/opencode-power-pack install --profile security --dry-run

# Update previously copied skills from the latest package
npx @waybarrios/opencode-power-pack@latest install --profile review --force
```

Or install the package globally and use its shorter executable:

```bash
npm install --global @waybarrios/opencode-power-pack

opencode-power-pack list
opencode-power-pack install --profile recommended
opencode-power-pack install code-review security-review
```

To update or remove the global installation:

```bash
npm update --global @waybarrios/opencode-power-pack
npm uninstall --global @waybarrios/opencode-power-pack
```

The npm package is scoped as `@waybarrios/opencode-power-pack` to give it an unambiguous registry identity. The package still installs the shorter `opencode-power-pack` executable for direct CLI use. No global installation is required when using `npx`.

### GitHub Packages mirror

Every GitHub release can also be published from its immutable tag to the repository's GitHub Packages page. npmjs remains the recommended public installation source because it works without GitHub authentication.

To install the GitHub Packages mirror, first authenticate with a GitHub personal access token (classic) that has `read:packages`, then select the GitHub registry explicitly:

```bash
npm login --scope=@waybarrios --auth-type=legacy --registry=https://npm.pkg.github.com
npm install --global @waybarrios/opencode-power-pack --registry=https://npm.pkg.github.com

opencode-power-pack list
```

Run the installer directly from the mirror after authentication:

```bash
npx --registry=https://npm.pkg.github.com @waybarrios/opencode-power-pack list
```

Maintainers publish the mirror with the `Publish GitHub Package` workflow. Release events publish automatically, while a manual run requires an existing release tag such as `v0.5.0`. The workflow verifies that the tag matches `package.json`, uploads the artifact already verified by required release CI without rerunning lifecycle scripts, and authenticates with the repository-scoped `GITHUB_TOKEN`; no package token is stored in the repository.

| Profile | Intended use |
|---|---|
| `recommended` | Balanced software development without the specialized security and ML catalogs |
| `review` | Comprehensive and focused code review plus quality and differential review |
| `feature-dev` | End-to-end feature workflow with its explorer, architect, and reviewer dependencies |
| `frontend` | Frontend implementation and anti-generic design critique |
| `security` | Security review, threat modeling, static analysis, validation, and reporting |
| `huggingface` | Model discovery, local inference, training, evaluation, Spaces, and AWS deployment |
| `authoring` | Skill and MCP authoring plus technical-paper summarization |
| `project-memory` | Audit and maintain durable project guidance |

Profiles automatically include required companion skills and can be combined with individual skill names. The default destination is `~/.agents/skills`; `--project` finds the current Git root and installs into its `.agents/skills` directory. Existing directories are skipped unless `--force` is provided, and replacements are staged with rollback plus per-skill locking. Every copied skill retains its provenance, third-party notices, and license texts. Use `--dry-run` to preview or `--all` to install the complete catalog.

The npm installer and the full Claude Code/Codex/OpenCode plugins are alternative activation paths. Claude Code users should prefer the namespaced plugin because the selective installer currently targets the portable `.agents/skills` location used by Codex, OpenCode, and Pi. If a full plugin is already active, selectively copying the same skills does not reduce that plugin's loaded catalog.

## Sandbox Capability Contract

The package assigns every bundled skill a default least-capability profile and an explicit set of allowed escalations. Native plugin and package installations expose the skills but do not install the sandbox executable, so install the npm CLI in the same operating-system environment as the agent:

```bash
npm install --global @waybarrios/opencode-power-pack@0.5.0
opencode-power-pack sandbox doctor
opencode-power-pack sandbox resolve --skill code-review
opencode-power-pack sandbox resolve --sandbox-profile publish --json
opencode-power-pack sandbox exec --skill code-review -- rg TODO .
```

| Sandbox profile | Workspace | Network and credentials | External side effects |
|---|---|---|---|
| `observe` | Read | Denied | Denied |
| `develop` | Write | Denied | Denied |
| `network-read` | Write | Explicitly approved | Denied |
| `publish` | Write | Explicitly approved | Explicit confirmation required |

Run an allowed network escalation by naming the destination explicitly:

```bash
opencode-power-pack sandbox exec \
  --skill code-review \
  --sandbox-profile network-read \
  --allow-domain api.github.com \
  -- curl https://api.github.com/repos/owner/repository
```

The literal `--` is required. Everything after it is the contained child command and its arguments. The runner preserves the child exit code and never falls back to an unsandboxed execution.

### Run the sandbox from each agent

Run `sandbox doctor` inside the same agent session that will execute the command. Success in a separate terminal does not prove the active agent can start the native backend.

| Host | How to invoke the runner |
|---|---|
| Codex | Ask Codex to use its shell tool for `opencode-power-pack sandbox doctor`, then for the complete `sandbox exec` command. |
| OpenCode | Ask OpenCode to use its shell tool for `opencode-power-pack sandbox doctor`, then for the complete `sandbox exec` command. |
| Claude Code | Ask Claude Code to use Bash for `opencode-power-pack sandbox doctor`, then for the complete `sandbox exec` command. |
| Pi | Ask Pi to use its shell tool for `opencode-power-pack sandbox doctor`, then for the complete `sandbox exec` command. |

Use this prompt in Codex, OpenCode, or Pi:

```text
Use the shell tool to run `opencode-power-pack sandbox doctor`.
If it succeeds, run `opencode-power-pack sandbox exec --skill code-review -- git status --short`.
Do not run the child command separately and do not retry without the sandbox.
```

For Claude Code, use the same prompt with `Use Bash` in the first sentence. Keep the entire `sandbox exec` invocation in one host shell call.

### Platform requirements

The runner requires Node.js 20.11.0 or newer.

| Platform | Status | Additional requirements |
|---|---|---|
| macOS | Supported | Native Seatbelt; `sandbox doctor` performs an operational preflight. |
| Linux | Supported | Trusted system installations of `bubblewrap`, `socat`, and `rg`, plus working unprivileged user and network namespaces. |
| WSL2 | Expected, dedicated CI pending | The same Linux dependencies and namespace support. |
| WSL1 | Unsupported | Required namespace primitives are unavailable. |
| Windows native | Fails closed | Platform-specific provisioning and boundary tests are not complete. |

The contract continues to report `advisory` because skill metadata does not enforce itself. The npm package also provides an opt-in `sandbox exec` runner backed by a pinned native runtime. When its operational preflight succeeds, `sandbox doctor` reports `shell-contained`; `Strict ready` remains `no` until a host adapter blocks ordinary tool bypasses.

For `network-read`, the runner enforces conventional HTTP read methods (GET, HEAD, and OPTIONS). This is a best-effort side-effect boundary because an approved endpoint can still implement unsafe GET behavior. Use narrow destination grants and expose only credentials required for the retrieval.

The runner is lightweight and on demand: it contains one command tree with native OS primitives, starts no persistent container or daemon, denies unrelated host reads, and deletes its private temporary directory after execution. `sandbox doctor` exits nonzero when the native boundary is unavailable.

See [Sandbox Compatibility Across Coding Agents](docs/sandbox-compatibility.md) for the current Codex, Claude Code, OpenCode, and Pi matrix, platform requirements, activation design, fail-closed behavior, and adapter roadmap.

Selective installations include a generated `SANDBOX_POLICY.json` beside each copied `SKILL.md`. The file is self-describing and preserves the skill's default profile even when the central package is not present. It remains advisory until an enforcement backend and host adapter are active.

## Why This Exists

Claude Code, Codex, OpenCode, and Pi read `SKILL.md` workflows, but many valuable workflows originated as Claude-specific commands and agents. Copying those artifacts directly does not preserve their orchestration, permissions, or subagent behavior.

This package exposes the shared skills as a namespaced Claude Code plugin, registers feature-development specialist roles as read-only OpenCode subagents, lets Codex execute the same phase assignments with its native subagent workflow, and exposes all fifty-four skills as a Pi package. It ships immutable provenance for every upstream work.

It complements [obra/superpowers](https://github.com/obra/superpowers), which provides process skills such as brainstorming, TDD, debugging, and plan execution.

## What's Inside

| Category | Skill | Purpose |
|---|---|---|
| Review | `code-review` | Multi-agent PR review with confidence filtering and reproduction scenarios |
| Review | `security-review` | Security-focused review with category coverage and exploit-path validation |
| Review | `supply-chain-risk-auditor` | Flag dependencies at heightened risk of exploitation or takeover |
| Review | `sharp-edges` | Identify error-prone APIs and footgun configurations before they cause security mistakes |
| Review | `insecure-defaults` | Detect fail-open insecure defaults (hardcoded secrets, weak auth, permissive config) |
| Review | `fp-check` | Systematically verify a suspected security bug to a TRUE/FALSE POSITIVE verdict |
| Review | `vuln-report` | Draft a single-vulnerability disclosure report in GitHub advisory style |
| Review | `agentic-actions-auditor` | Audit GitHub Actions workflows for prompt-injection risk in AI agent integrations |
| Review | `security-threat-model` | Repository-grounded threat modeling — trust boundaries, assets, abuse paths |
| Review | `differential-review` | Security-focused differential review of a diff/PR with blast-radius analysis |
| Review | `variant-analysis` | Find similar vulnerabilities/bugs across a codebase from one initial pattern |
| Review | `sarif-parsing` | Parse, filter, dedupe, and convert SARIF output from CodeQL/Semgrep/other scanners |
| Review | `semgrep` | Run a Semgrep static analysis scan with approval-gated ruleset selection |
| Review | `semgrep-rule-creator` | Write custom Semgrep rules for a specific vulnerability/bug pattern |
| Review | `semgrep-rule-variant-creator` | Port an existing Semgrep rule to additional target languages |
| Review | `codeql` | Run a CodeQL scan using interprocedural data flow and taint tracking |
| Feature development | `feature-dev` | Seven-phase workflow from discovery through implementation and review |
| Feature development | `code-explorer` | Trace a feature across entry points, layers, state, and dependencies |
| Feature development | `code-architect` | Produce a file-level architecture and implementation blueprint |
| Feature development | `code-reviewer` | Adversarial review of a focused local change set |
| Design | `frontend-design` | Create distinctive interfaces with an accessibility and craft rubric |
| Design | `ai-slop` | Rubric to judge whether a design is generic "AI slop" or genuinely product-fit |
| Code quality | `code-quality` | Linting, complexity, and review checklists across Rust, TypeScript, Python, and shell |
| Code quality | `design-patterns` | Pattern trade-offs (when to use, when to skip) for Rust, TS/React, and Django/Python |
| Research | `paper-summarizer` | Extract actionable findings and a claim-evidence map from academic/technical papers |
| Authoring | `mcp-builder` | Design and build MCP servers in TypeScript or Python |
| Authoring | `skill-creator` | Create, test, and improve reusable `SKILL.md` workflows |
| Hugging Face | `hf-cli` | Core `hf` CLI usage — auth, cache, repos, jobs, papers, Spaces, and more |
| Hugging Face | `hf-mem` | Estimate memory needed to load Safetensors/GGUF weights for inference |
| Hugging Face | `huggingface-best` | Find and compare the best model for a task via official benchmark leaderboards |
| Hugging Face | `huggingface-datasets` | Dataset Viewer API workflows — metadata, pagination, search, filters |
| Hugging Face | `huggingface-papers` | Look up and analyze Hugging Face / arXiv paper pages via the papers API |
| Hugging Face | `huggingface-paper-publisher` | Publish and manage research papers on the Hub, including research-article templates |
| Hugging Face | `huggingface-tool-builder` | Build reusable scripts/tools around the Hugging Face API |
| Hugging Face | `huggingface-local-models` | Select and run GGUF models locally with llama.cpp (CPU/Metal/CUDA/ROCm) |
| Hugging Face — Training | `huggingface-llm-trainer` | Fine-tune LLMs (TRL: SFT/DPO/GRPO, or Unsloth) on Hugging Face Jobs |
| Hugging Face — Training | `huggingface-vision-trainer` | Fine-tune object detection, image classification, and SAM/SAM2 segmentation models |
| Hugging Face — Training | `train-sentence-transformers` | Train bi-encoder/cross-encoder/sparse embedding models |
| Hugging Face — Training | `trl-training` | TRL CLI training — SFT, DPO, GRPO, KTO, RLOO, reward modeling |
| Hugging Face — Training | `huggingface-community-evals` | Run local evaluations with inspect-ai / lighteval |
| Hugging Face — Training | `huggingface-trackio` | Track and visualize ML training experiments with Trackio |
| Hugging Face — Spaces | `huggingface-spaces` | Build, deploy, and debug Gradio/Docker/static Spaces |
| Hugging Face — Spaces | `huggingface-gradio` | Build Gradio web UIs and demos in Python |
| Hugging Face — Spaces | `huggingface-lora-space-builder` | Build and publish a Gradio Space demo for a user-provided LoRA |
| Hugging Face — Spaces | `huggingface-zerogpu` | Write/debug ZeroGPU-constrained Gradio Space code |
| Hugging Face — Cloud | `hf-cloud-aws-context-discovery` | Discover the user's local AWS context before any AWS work |
| Hugging Face — Cloud | `hf-cloud-python-env-setup` | Set up an isolated Python env for SageMaker/AWS work |
| Hugging Face — Cloud | `hf-cloud-sagemaker-deployment-planner` | Entry point for planning a SageMaker model deployment |
| Hugging Face — Cloud | `hf-cloud-sagemaker-iam-preflight` | Ensure a usable SageMaker execution role exists before deploying |
| Hugging Face — Cloud | `hf-cloud-serving-image-selection` | Pick the right SageMaker serving container image |
| Hugging Face — Cloud | `hf-cloud-sagemaker-production-defaults` | Create a SageMaker endpoint with autoscaling, alarms, and tagging by default |
| JavaScript | `transformers-js` | Run Hugging Face models directly in JS/TS (browser or Node/Bun/Deno) |
| Project memory | `agents-md-improver` | Audit project rules and propose targeted improvements |
| Project memory | `agents-md-revise` | Capture durable session learnings in project rules |

`code-explorer`, `code-architect`, and `code-reviewer` are standalone skills and specialist roles used by `feature-dev`. OpenCode registers named least-privilege agents; Codex can carry out the same assignments with native subagents and can use matching custom agents when the user configures them.

### Which Code Review Skill?

| Situation | Use | Why |
|---|---|---|
| PR, branch, commit range, or complete pending diff | `code-review` (Comprehensive Code Review) | Freezes the scope, runs multiple review lenses, cross-checks candidates, and can post validated findings to GitHub when requested |
| One file, function, or small local change | `code-reviewer` (Focused Code Review) | Uses a lighter two-pass review with full-file and caller context |
| `feature-dev` quality phase | `code-reviewer` (Focused Code Review) | Acts as the focused specialist role dispatched by the feature workflow |

They are complementary rather than duplicate workflows. Codex shows distinct user-facing titles, Claude Code namespaces both under `opencode-power-pack`, and the stable skill IDs continue to work across every host. Start with `code-review` for merge decisions and `code-reviewer` for focused iteration.

## Installation

### Prerequisites

- Git
- Node.js 20.11.0 or newer, including npm/npx, for [selective installation](#selective-install-with-npm) and the sandbox runner
- One supported host:
  - A current Claude Code installation with plugin support: <https://code.claude.com/docs/en/plugins>
  - OpenCode 1.18.7 or newer: <https://opencode.ai>
  - A current Codex CLI or Codex desktop environment with plugin support: <https://developers.openai.com/codex/>
  - A current Pi coding agent installation: <https://pi.dev/>

### Claude Code

Add the repository marketplace and install its plugin from inside Claude Code:

```text
/plugin marketplace add waybarrios/opencode-power-pack
/plugin install opencode-power-pack@opencode-power-pack
```

Run `/reload-plugins` if prompted. Claude Code loads plugin skills from the repository-level `skills/` directory and prefixes them with the plugin namespace, preventing collisions with built-in or separately installed skills. For local development, run `claude --plugin-dir .` from a clone of this repository.

### Codex CLI And Desktop

Add this repository as a marketplace, then install the plugin:

```bash
codex plugin marketplace add waybarrios/opencode-power-pack --ref main
codex plugin add opencode-power-pack@opencode-power-pack
codex plugin list --marketplace opencode-power-pack
```

Start a new Codex session after installation so the fifty-four bundled skills are loaded. Use `/plugins` to inspect the installed plugin or `$` to select one of its skills explicitly. Codex plugin packaging follows the [official plugin structure](https://developers.openai.com/plugins/build/plugins).

For a smaller personal or repository-specific set, use the [selective npm installer](#selective-install-with-npm) instead of the full plugin.

### OpenCode From GitHub

```bash
opencode plugin --global "opencode-power-pack@git+https://github.com/waybarrios/opencode-power-pack.git"
```

Restart OpenCode after installation. OpenCode discovers each skill and creates its same-named slash command automatically.

To pin a published release, append its tag:

```bash
opencode plugin --global "opencode-power-pack@git+https://github.com/waybarrios/opencode-power-pack.git#<tag>"
```

### OpenCode From A Local Clone

```bash
git clone https://github.com/waybarrios/opencode-power-pack.git ~/code/opencode-power-pack
opencode plugin --global "opencode-power-pack@git+file:///home/you/code/opencode-power-pack"
```

Use an absolute `file://` URL adjusted for your operating system. The target directory must be a Git repository.

### Pi From GitHub

```bash
pi install git:github.com/waybarrios/opencode-power-pack
```

Pi installs the Git package and loads the `skills/` directory declared in `package.json`. Use `-l` to save it to project settings instead of user settings. See the [Pi package documentation](https://pi.dev/docs/latest/packages) for source, update, filtering, and trust behavior.

Pi can also narrow an installed package through `pi config`. The npm installer is useful when you want the same selected set to be discovered by Pi, Codex, and OpenCode from `.agents/skills`.

### Verify Claude Code

From a local clone, validate both the plugin and marketplace manifests:

```bash
claude plugin validate . --strict
```

After marketplace installation, run `/plugin` and confirm that `opencode-power-pack` is enabled. Invoke `/opencode-power-pack:code-review` for a first test.

### Verify OpenCode

```bash
opencode debug skill
opencode debug agent code-explorer
```

The first command should include all fifty-four unprefixed skill names. The second should report a `subagent` with editing denied. In the TUI, `ctrl+p` should list `/code-review`, `/feature-dev`, `/frontend-design`, and the other skill-derived commands.

### Verify Codex

```bash
codex plugin list --marketplace opencode-power-pack
```

The list should show `opencode-power-pack` as installed. Start a new session and explicitly select `$code-review`, `$feature-dev`, or another bundled skill for a first test.

### Verify Pi

```bash
pi list
```

The package list should include the Git source for `waybarrios/opencode-power-pack`. Start a new Pi session after installation so its bundled skills are available.

## Updating

For Claude Code:

```text
/plugin marketplace update opencode-power-pack
/plugin update opencode-power-pack@opencode-power-pack
```

Run `/reload-plugins` if prompted.

For Codex:

```bash
codex plugin marketplace upgrade opencode-power-pack
codex plugin add opencode-power-pack@opencode-power-pack
```

Start a new session after the upgrade.

For Pi:

```bash
pi update git:github.com/waybarrios/opencode-power-pack
```

For an OpenCode GitHub installation:

```bash
opencode plugin --global --force "opencode-power-pack@git+https://github.com/waybarrios/opencode-power-pack.git"
```

Restart OpenCode after the command finishes. For a pinned installation, update the tag first. Local-clone users should run `git pull` in the clone and reinstall with the same `git+file://` spec.

## Uninstalling

For Claude Code:

```text
/plugin uninstall opencode-power-pack@opencode-power-pack
```

For Codex:

```bash
codex plugin remove opencode-power-pack@opencode-power-pack
```

For Pi:

```bash
pi remove git:github.com/waybarrios/opencode-power-pack
```

For OpenCode, remove the `opencode-power-pack@...` entry from the `plugin` array in the config where it was installed, then restart OpenCode. There are no command symlinks or copied command files to remove.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Claude Code cannot add the marketplace | The checkout predates `.claude-plugin/marketplace.json` or the repository is inaccessible | Update the checkout, verify repository access, and run `claude plugin validate . --strict` locally |
| Claude Code installed the plugin but a skill name conflicts | The unprefixed skill came from another source | Invoke the namespaced form, such as `/opencode-power-pack:code-review` |
| Codex cannot find the marketplace | Marketplace snapshot is missing or stale | Run `codex plugin marketplace add waybarrios/opencode-power-pack --ref main`, or upgrade the existing marketplace |
| Codex installed the plugin but skills do not appear | The current session predates installation | Start a new Codex session and inspect `/plugins` |
| Pi does not show the skills | Package is absent, disabled, or the session predates installation | Run `pi list`, inspect `pi config`, and start a new Pi session |
| Skills or commands do not appear | OpenCode is older than 1.18.7 | Upgrade OpenCode, restart, and run `opencode debug skill` |
| Skills are missing from debug output | Plugin installation failed or its config entry is absent | Re-run `opencode plugin --global --force <module-spec>` and inspect the reported error |
| Specialist agents are missing | Stale plugin checkout | Force reinstall, restart, and run `opencode debug agent code-explorer` |
| Installation reports a Git error | Invalid URL, network failure, or inaccessible repository | Validate the source with `git ls-remote <url>` |
| A workflow is rushed or incomplete | The backing model skipped multi-stage instructions | Use a stronger model and inspect whether required subagent tools are available |

## Invocation

Claude Code exposes plugin skills as `/opencode-power-pack:<skill>`, Codex uses `$` mentions, OpenCode 1.18.7+ exposes same-named slash commands, and Pi loads workflows from the installed skills package:

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
$code-review review the current branch against main
$feature-dev add a logout button to the topbar
/code-review --comment
/code-review review https://github.com/owner/repo/pull/449
/feature-dev add a logout button to the topbar
/security-review
/frontend-design pricing page, brutalist tone, single-screen
/opencode-power-pack:code-review
/opencode-power-pack:feature-dev add a logout button to the topbar
```

In OpenCode, an explicit command with the same name takes precedence over a skill-derived command.

## How It Works

```text
opencode-power-pack
|
+-- .claude-plugin/
|   +-- plugin.json declares the namespaced Claude Code plugin
|   +-- marketplace.json makes the repository installable in Claude Code
|
+-- .codex-plugin/plugin.json
|   +-- packages all skills/ for Codex and compatible plugin surfaces
|
+-- .agents/plugins/marketplace.json
|   +-- exposes the repository as an installable Codex marketplace
|
+-- package.json
|   +-- declares skills/ as a Pi package for pi install
|
+-- sandbox/contract.json
|   +-- maps all fifty-four skills to versioned capability profiles
|   +-- records allowed escalation paths without claiming enforcement
|
+-- bin/sandbox/policy.mjs
|   +-- validates, resolves, and reports the shared capability contract
|
+-- bin/sandbox/runtime.mjs
|   +-- runs opt-in commands in the pinned native sandbox backend
|
+-- .opencode/plugins/opencode-power-pack.js
|   +-- registers skills/ in config.skills.paths
|   +-- registers code-explorer as a read-only subagent
|   +-- registers code-architect as a read-only subagent
|   +-- registers code-reviewer with read-only Git commands
|
+-- skills/<name>/SKILL.md
|   +-- shared Codex/OpenCode workflow
|   +-- host-native invocation metadata
|   +-- immutable source and license metadata
|
+-- UPSTREAMS.json
    +-- repository, commit, path, blob, date, and adaptation type
```

Each `SKILL.md` is the single source for its workflow. Claude Code loads the directory through its plugin namespace. The OpenCode plugin derives specialist-agent prompts from those files at startup. Codex loads the same skills from its plugin and follows `feature-dev`'s specialist assignments with its native subagent workflow; installing a skill does not itself create a named custom agent.

The packaged agents deny edits, external network access, and nested tasks. `code-reviewer` additionally allows a narrow set of read-only Git commands.

## Scope And Non-Goals

| In scope | Out of scope |
|---|---|
| Claude Code, Codex, OpenCode, and Pi skills and invocation | Whole-agent, browser, connector, or desktop isolation |
| Portable and host-native subagent orchestration | Proprietary or non-redistributable plugins |
| Licensed adaptations with immutable provenance | Automatic trust of third-party skill catalogs |
| Explicit permission boundaries and regression tests | Supporting OpenCode versions older than 1.18.7 or obsolete Codex plugin formats |
| Versioned sandbox contracts and an opt-in shell-contained runner | Claiming whole-agent containment before host adapters block bypass tools |

## Contributing

Contributions are welcome for:

- Improvements based on reproducible workflow failures
- Behavioral evaluations and adversarial fixtures
- Portable references and deterministic helper scripts
- New ports with a verified license and immutable upstream source

Before opening a PR:

```bash
npm test
npm run test:sandbox
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

The bundled skills are modified upstream works. This repository contributes their Claude Code, Codex, OpenCode, and Pi packaging, additional workflow guidance, tests, and compatibility layer.

| Upstream | Pinned source | Used for |
|---|---|---|
| Anthropic | [`claude-plugins-official@bdca23e8`](https://github.com/anthropics/claude-plugins-official/tree/bdca23e8e46f8832d0030c05804ae207786ae37f) | Code review, feature development, frontend design, and project memory |
| Anthropic | [`skills@5128e186`](https://github.com/anthropics/skills/tree/5128e1865d670f5d6c9cef000e6dfc4e951fb5b9) | MCP Builder and Skill Creator |
| Anthropic | [`claude-code-security-review@0c6a49f1`](https://github.com/anthropics/claude-code-security-review/tree/0c6a49f1fa56a1d472575da86a94dbc1edb78eda) | Security Review |
| Jesse Vincent | [`superpowers@6efe32c9`](https://github.com/obra/superpowers/tree/6efe32c9e2dd002d0c394e861e0529675d1ab32e) | OpenCode plugin registration pattern |

See [`UPSTREAMS.json`](UPSTREAMS.json) for exact source paths and Git blobs. See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) for attribution and modification notices.

## License

The wrapper code and original project material are MIT-licensed under [LICENSE](LICENSE). Modified skills derived from Anthropic's official plugins and skills are Apache-2.0, except `security-review`, whose upstream is MIT. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), [UPSTREAMS.json](UPSTREAMS.json), and [LICENSES/](LICENSES/) for exact terms.
