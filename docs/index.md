# OpenCode Power Pack Installation and Operations

This guide covers selective npm installation, native host installation, and contained command execution for release v0.6.0.

## What is available now

Release v0.6.0 adds OpenCode 2.0 support on npm and Git. Tag v0.5.0 and npm 0.5.0 contain the earlier V1-only plugin.

The npm installer also copies skills for OpenCode 2. Copying skills does not register the plugin's three named specialists.

## Choose an installation path

Use the selective npm installer when Codex, OpenCode, or Pi should load only chosen skills or a curated profile. It requires Node.js 20.11.0 or newer and installs into a portable `.agents/skills` directory.

Use the host-native plugin or package installation when you want the full catalog and native activation behavior. Claude Code, Codex, OpenCode, and Pi each use their own host mechanism.

## Selective npm commands

```sh
# List skills and profiles
npx @waybarrios/opencode-power-pack list

# Install one or several skills at user scope
npx @waybarrios/opencode-power-pack install code-review
npx @waybarrios/opencode-power-pack install code-review security-review

# Install at repository scope
npx @waybarrios/opencode-power-pack install code-review --project

# Preview and install a profile
npx @waybarrios/opencode-power-pack install --profile review --dry-run
npx @waybarrios/opencode-power-pack install --profile review

# Install every skill in the published npm catalog
npx @waybarrios/opencode-power-pack install --all
```

The installer resolves required companion skills. Existing skills are not overwritten unless `--force` is supplied. Use `--dry-run` before any forced update.

## GitHub Packages mirror

npmjs is the public install source and does not require GitHub authentication. The same released package is also available through GitHub Packages.

Use a GitHub personal access token (classic) with `read:packages` for the mirror:

```sh
npm login --scope=@waybarrios --auth-type=legacy --registry=https://npm.pkg.github.com
npm install --global @waybarrios/opencode-power-pack --registry=https://npm.pkg.github.com
```

The mirror follows release tags. It does not include additions that are only on main.

## Agent-assisted installation

A terminal-capable Codex, OpenCode, or Pi agent can install the recommended profile at project scope with a dry-run-first sequence:

```sh
npx @waybarrios/opencode-power-pack install --profile recommended --project --dry-run
npx @waybarrios/opencode-power-pack install --profile recommended --project
```

The full safe prompt, host routing rules, and verification checklist are available at https://skills.waybarrios.com/agent-install.md. Claude Code should use the native plugin commands below instead of assuming support for the portable `.agents/skills` path.

## Host setup and invocation

### Claude Code

```text
/plugin marketplace add waybarrios/opencode-power-pack
/plugin install opencode-power-pack@opencode-power-pack
```

Invoke a skill with its namespace, for example `/opencode-power-pack:code-review`.

### Codex

```sh
codex plugin marketplace add waybarrios/opencode-power-pack --ref main
codex plugin add opencode-power-pack@opencode-power-pack
codex plugin list --marketplace opencode-power-pack
```

Start a new Codex session and invoke a skill such as `$code-review`.

### OpenCode 1 and 2

OpenCode 2.0 needs v0.6.0 or Git main. The v0.5.0 tag contains the earlier V1-only plugin.

```sh
# OpenCode 2
opencode plugin add "opencode-power-pack@git+https://github.com/waybarrios/opencode-power-pack.git"

# OpenCode 1
opencode plugin --global "opencode-power-pack@git+https://github.com/waybarrios/opencode-power-pack.git"
```

Restart OpenCode and invoke a skill such as `/code-review` or `/humanizer`. On V2, run `opencode debug agents` to inspect the three specialists. On V1, use `opencode debug skill` and `opencode debug agent code-explorer`.

V2 enforces the bundled specialists' read-only restrictions when it evaluates permissions, even with global allow rules. A custom system prompt or primary mode replaces the bundled role and keeps host permission defaults. The debug listing can still show the host's base permissions.

Smoke tests cover OpenCode 1.18.7, 2.0.14, and 2.0.32. They verify all 55 skills and three specialists without model calls.

### Pi

```sh
pi install git:github.com/waybarrios/opencode-power-pack
```

Restart Pi after installation so it reloads the package's declared skills directory.

## Native sandbox runner

Version 0.5.0 adds an opt-in, fail-closed runner for one command and its descendants. It uses native Seatbelt isolation on macOS and Bubblewrap on Linux. It does not start a persistent container or daemon.

Install the CLI and verify the operating-system boundary:

```sh
npm install --global @waybarrios/opencode-power-pack@0.6.0
opencode-power-pack sandbox doctor
opencode-power-pack sandbox resolve --skill code-review
```

Node.js 20.11.0 or newer is required. Linux also requires trusted system installations of `bubblewrap`, `socat`, and `rg`. Continue only when `sandbox doctor` exits successfully and reports `runnerReady: true` in JSON mode.

Run a command with the skill's default profile:

```sh
opencode-power-pack sandbox exec --skill code-review -- git status --short
opencode-power-pack sandbox exec --skill code-review -- rg TODO .
```

The literal `--` ends runner options and begins the child command. The runner preserves the child exit code and never retries without containment.

Allow one network destination for a declared escalation:

```sh
opencode-power-pack sandbox exec \
  --skill code-review \
  --sandbox-profile network-read \
  --allow-domain api.github.com \
  -- curl https://api.github.com/repos/waybarrios/opencode-power-pack
```

Confirm a publish operation with an explicitly exposed credential:

```sh
opencode-power-pack sandbox exec \
  --skill hf-cli \
  --sandbox-profile publish \
  --allow-domain huggingface.co \
  --allow-env HF_TOKEN \
  --confirm-external-side-effects \
  -- hf upload owner/repository ./artifact.bin artifact.bin
```

| Profile | Workspace | Network and credentials | External writes |
| --- | --- | --- | --- |
| `observe` | Read only | Denied | Denied |
| `develop` | Read and write | Denied | Denied |
| `network-read` | Read and write | Explicit grants | Denied |
| `publish` | Read and write | Explicit grants | Explicit confirmation |

The manual runner works from Codex, OpenCode, Claude Code, and Pi when the agent explicitly invokes the CLI. Automatic routing is not implemented yet, so ordinary host shell, file, browser, MCP, and connector tools remain outside this process boundary. The current guarantee is `shell-contained`, not whole-agent isolation.

### Run it from Codex

Native Codex plugin installation does not install the sandbox executable. Install the npm CLI in the operating-system environment used by Codex, open the target repository, and paste this request into the Codex session:

```text
Use the shell tool to run `opencode-power-pack sandbox doctor`.
If it succeeds, run `opencode-power-pack sandbox exec --skill code-review -- git status --short`.
Do not run the child command separately and do not retry without the sandbox.
```

### Run it from OpenCode

Native OpenCode plugin installation does not install the sandbox executable. Install the npm CLI in the operating-system environment used by OpenCode, open the target repository, and paste this request into the OpenCode session:

```text
Use the shell tool to run `opencode-power-pack sandbox doctor`.
If it succeeds, run `opencode-power-pack sandbox exec --skill code-review -- git status --short`.
Do not run the child command separately and do not retry without the sandbox.
```

### Run it from Claude Code

Native Claude Code plugin installation does not install the sandbox executable. Install the npm CLI in the operating-system environment used by Claude Code, open the target repository, and paste this request into the Claude Code session:

```text
Use Bash to run `opencode-power-pack sandbox doctor`.
If it succeeds, run `opencode-power-pack sandbox exec --skill code-review -- git status --short`.
Do not run the child command separately and do not retry without the sandbox.
```

### Run it from Pi

Native Pi package installation does not install the sandbox executable. Install the npm CLI in the operating-system environment used by Pi, open the target repository, and paste this request into the Pi session:

```text
Use the shell tool to run `opencode-power-pack sandbox doctor`.
If it succeeds, run `opencode-power-pack sandbox exec --skill code-review -- git status --short`.
Do not run the child command separately and do not retry without the sandbox.
```

Run `sandbox doctor` inside the same agent session that will execute the command. A successful doctor in a separate, less restricted terminal does not prove that the active agent session can start the native backend.

macOS and Linux are supported. WSL2 is expected through the Linux backend but still lacks dedicated CI. Windows native and WSL1 intentionally fail closed. See the [complete sandbox compatibility specification](https://github.com/waybarrios/opencode-power-pack/blob/main/docs/sandbox-compatibility.md) for the threat boundary and adapter roadmap.

## Profiles

- `recommended`: balanced software development.
- `review`: comprehensive and focused review plus quality and differential review.
- `feature-dev`: exploration, architecture, implementation, and review specialists.
- `frontend`: frontend implementation plus anti-generic design critique.
- `security`: AppSec review, scanning, modeling, validation, and reporting.
- `huggingface`: model discovery, inference, training, evaluation, Spaces, and AWS deployment.
- `authoring`: humanizer, skill-creator, mcp-builder, and paper-summarizer.
- `project-memory`: durable AGENTS.md and CLAUDE.md maintenance.

## Install humanizer

Run the selective installer for a user-level copy:

```sh
npx @waybarrios/opencode-power-pack install humanizer --dry-run
npx @waybarrios/opencode-power-pack install humanizer
```

Use `install --profile authoring` instead for all four authoring skills. For project scope, run the same command from the target repository with `--project`.

## Update and remove

Preview an npm-managed skill update, then apply it only if the destination is correct:

```sh
npx @waybarrios/opencode-power-pack install code-review --dry-run
npx @waybarrios/opencode-power-pack install code-review --force
```

For host-native installations, use that host's plugin or package update and removal commands. Avoid activating the same workflow from both a native plugin and an npm copy at the same scope.

On OpenCode 2, update or remove with the exact configured package specification:

```sh
opencode plugin update "opencode-power-pack@git+https://github.com/waybarrios/opencode-power-pack.git"
opencode plugin remove "opencode-power-pack@git+https://github.com/waybarrios/opencode-power-pack.git"
```

On V1, reinstall with `plugin --global` to update, or remove its entry from the `plugin` config array. For a local `git+file://` install, pull the clone and then update or reinstall the same specification.

## Contributor checks

The behavioral runner uses the OpenCode 2 session API. It rejects partial text from failed or interrupted turns and accepts optional `provider/model#variant` references. Live runs need provider environment credentials; the isolated runtime does not copy the native V2 credential database.

## Troubleshooting

- If a new skill is missing, start a new host session and verify the expected `.agents/skills` destination.
- If Claude Code reports a name collision, use the namespaced form.
- If the installer refuses to overwrite a skill, preview with `--dry-run` and repeat with `--force` only when intended.
- If an `.opp-lock` remains, first confirm no installer process is running, then remove only the exact stale lock path reported by the installer.
- For reproducible issue reports, include the host, host version, command, destination scope, and complete error output.

Full HTML documentation: https://skills.waybarrios.com/docs/
Complete skill reference: https://skills.waybarrios.com/docs/skills/index.md
