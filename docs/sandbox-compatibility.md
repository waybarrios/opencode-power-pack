# Sandbox Compatibility Across Coding Agents

This document defines what sandbox compatibility means for Codex, Claude Code, OpenCode, and Pi. It separates portable policy support from automatic host enforcement so installation never implies a security guarantee that is not active.

Last verified: 2026-08-16

Locally inspected host versions:

- Codex CLI 0.147.0
- Claude Code 2.1.231
- OpenCode 1.18.18
- Pi 0.83.0

The repository smoke tests retain their separately pinned minimum versions. Host APIs evolve, so adapter tests and this matrix must be updated together.

## Compatibility Levels

| Level | Meaning |
|---|---|
| Skill-compatible | The host discovers and can invoke the bundled `SKILL.md` workflows. |
| Policy-compatible | The package can resolve the skill's trusted sandbox profile and allowed escalations. |
| Runner-compatible | The host can explicitly invoke `opencode-power-pack sandbox exec` from an npm installation. |
| Enforcement-integrated | A tested host adapter routes shell execution through the runner and blocks its ordinary bypass path. |
| Whole-agent isolated | Every host tool, connector, browser action, and subprocess is contained by one boundary. This project does not currently claim this level. |

The current runner is `shell-contained`. The command and its descendants are isolated, but unrelated host-native tools are outside that process boundary.

## Current Matrix

| Host | Skills | Policy and manual runner | Automatic routing | Adapter direction | Important boundary |
|---|---|---|---|---|---|
| Codex | Supported through the Codex plugin and portable skill installation | Supported when the npm package is installed | Not yet implemented | Temporary native sandbox configuration plus the shared runner for explicit network access | Codex has native `read-only` and `workspace-write` shell sandboxes, but a skill cannot safely change the active session sandbox by prompt text alone. |
| Claude Code | Supported through the namespaced Claude plugin | Supported when the npm package is installed | Not yet implemented | Native sandbox settings plus hooks and permissions for tools outside Bash | Claude's native sandbox applies to Bash and descendants. Read, Edit, Write, WebFetch, MCP, and computer-use tools require separate permission controls. |
| OpenCode | Supported through the plugin and portable skill installation | Supported when the npm package is installed | Not yet implemented | A custom sandbox tool paired with per-agent denial of ordinary `bash` | File-edit and external-directory permissions also need profile-specific controls. |
| Pi | Supported through the Pi package declaration and portable skill installation | Supported when the npm package is installed | Not yet implemented | An extension that intercepts or replaces built-in shell and file tools | A skill file by itself is advisory. |

Official host surfaces used by the adapter design:

- [Codex configuration reference](https://developers.openai.com/codex/config-reference/) documents `sandbox_mode`, workspace-write network controls, permission profiles, and environment policy.
- [Claude Code sandboxing](https://code.claude.com/docs/en/sandboxing) documents its Bash-only OS sandbox, `/sandbox`, `failIfUnavailable`, and the unsandboxed escape hatch. [Claude Code hooks](https://code.claude.com/docs/en/hooks) documents `PreToolUse` denial and input replacement.
- [OpenCode agents](https://opencode.ai/docs/agents/) documents per-agent `allow`, `ask`, and `deny` permissions. [OpenCode custom tools](https://opencode.ai/docs/custom-tools/) provides the portable runner integration point.
- [Pi extensions](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/extensions.md) documents custom tools, built-in tool overrides, dynamic active tools, and blocking `tool_call` events.

## What Works Before Host Adapters

The explicit runner is the common denominator:

```bash
opencode-power-pack sandbox doctor

opencode-power-pack sandbox exec \
  --skill code-review \
  -- rg TODO .
```

`sandbox doctor` exits with a nonzero status when the native runner is unavailable, even when the portable contract itself is valid. Automation should require both a successful exit and `runnerReady: true` from JSON output before launching a contained command.

An allowed skill escalation remains explicit:

```bash
opencode-power-pack sandbox exec \
  --skill code-review \
  --sandbox-profile network-read \
  --allow-domain api.github.com \
  -- curl https://api.github.com/repos/owner/repository
```

The literal `--` boundary is required. Everything after it is treated as the child command and arguments. The runner preserves the child exit code and never falls back to executing the command without containment.

This manual form can be called from any of the four agents, but prompt instructions are not enforcement. Until the matching host adapter lands, the agent can still choose an ordinary shell or another host-native tool.

## Adapter Roadmap

Automatic activation needs a host-specific adapter, not another instruction inside `SKILL.md`. Each adapter must run the doctor, resolve the trusted packaged profile, activate temporary host controls, block the ordinary tool bypass, and clean up when the session ends. Codex and Claude Code can combine native sandbox settings with their permission surfaces. OpenCode needs a custom tool plus agent permissions. Pi needs an extension that intercepts or replaces built-in tools.

The exact adapter command and configuration format will be defined with conformance tests when each integration is implemented. Repository content may request a stricter policy, but it must never disable containment, select a weaker backend mode, authorize an escalation, or manufacture a publish confirmation.

## Runtime Limitations

`network-read` terminates HTTP and HTTPS connections and permits only GET, HEAD, and OPTIONS requests. This enforces conventional read semantics, not a mathematical guarantee that an endpoint has no side effects. A poorly designed GET endpoint can mutate state, an approved broad domain can receive data, and upstream documents domain-fronting limitations. Grant the narrowest destination possible and do not expose credentials unless the retrieval requires them.

Host filesystem reads are denied by default. The runner exposes the workspace, its private per-command directory, and a narrow set of operating-system runtime paths needed to start ordinary command-line programs. It keeps secret-bearing paths such as other home directories, `/run/secrets`, unrelated mounts, and sibling temporary directories outside that read boundary. Workspaces with hardlinks to external inodes are rejected before execution.

Selecting a command grants read access to that executable. If it belongs to a package or Python virtual environment identified by a nearby `package.json` or `pyvenv.cfg`, the bounded package root is also readable so resource-bearing CLIs can start. The runner also resolves bounded shebang dependencies, including `#!/usr/bin/env node` and `env -S`, without exposing a whole version-manager or system prefix. Commands selected from `~/.local/bin` can read `~/.local/lib` for user-level Python packages, but not user configuration, cache, or credential directories. Installing project-specific tools inside the workspace remains the most predictable option.

The pinned native runtime omits macOS Seatbelt's separate `process-exec-interpreter` permission even though it permits native executable files. The adapter adds exactly that narrow operation to the generated macOS profile after verifying the pinned descriptor shape. It fails closed if the upstream profile changes. Filesystem read rules still decide which scripts and interpreters are visible, and the compatibility shim should be removed when a verified upstream release includes the permission directly.

When the command starts inside a Git repository, the runner treats the containing worktree root as the workspace while preserving the original working directory. Existing credential-shaped files are denied recursively, and exact credential paths in both the repository root and original working directory stay protected even when absent at startup. The runner also exposes validated linked-worktree and submodule metadata, so ordinary inspection commands work from nested directories, linked worktrees, and standard submodules. The repository's `.git/config` remains readable while writes to it and hooks remain denied. Do not store credentials in Git remote URLs or custom repository configuration. Use an explicitly granted environment variable for network credentials instead.

The runner is intentionally lightweight and on demand. It uses native Seatbelt or Bubblewrap primitives for one command tree, creates no persistent container or daemon, and removes its private directory afterward. Because the pinned upstream manager has process-global state, a second command in the same Node.js process is rejected while one is active. Independent CLI processes have separate managers.

On Linux, `bubblewrap`, `socat`, and `rg` must resolve to root-owned executables whose parent path is not group- or world-writable. This prevents a repository or shared temporary directory from replacing the containment helpers through `PATH`.

## Runtime Platform Requirements

The native backend pins `@anthropic-ai/sandbox-runtime` and requires Node.js 20.11.0 or newer.

| Platform | Status | Requirements |
|---|---|---|
| macOS | Supported by the runner | Native Seatbelt support. The doctor performs an operational preflight. |
| Linux | Supported by the runner | Trusted system installations of `bubblewrap`, `socat`, and `rg`, plus working unprivileged user and network namespaces. |
| WSL2 | Expected through the Linux backend, pending dedicated CI | Same Linux dependencies and namespace requirements. |
| WSL1 | Unsupported | Required namespace primitives are unavailable. |
| Windows native | Intentionally fail closed | Upstream support requires elevated provisioning and platform-specific ACL and network tests that this project has not completed. |

Ubuntu 24.04 can block Bubblewrap user namespaces through AppArmor. The doctor runs a behavioral namespace preflight instead of reporting readiness from executable presence alone.

## Fail-Closed Rules

The runner refuses execution when:

- The backend package or native dependencies are missing.
- The OS cannot create the required isolation boundary.
- The platform adapter is unsupported.
- The skill or requested profile is unknown.
- The requested profile is not the skill default or a declared escalation.
- A network or credential grant is incompatible with the resolved profile.
- A `publish` profile lacks explicit external-side-effect confirmation.
- Backend initialization, wrapping, child spawning, or cleanup fails.

None of these failures authorize an unsandboxed retry.

## Verification Expectations

Every enforcement adapter must test:

- Default profile selection and declared escalation authorization.
- Denial of the host's ordinary shell bypass.
- Workspace read and write boundaries.
- Credential-environment scrubbing.
- Network denial and explicit destination grants.
- Child argument and exit-code preservation.
- Unsupported or unavailable backend failure.
- Packed installation outside the source checkout.
- The minimum pinned host version and a currently supported host version.

Compatibility is considered implemented only when the adapter and its conformance tests land together.
