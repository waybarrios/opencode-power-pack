# OpenCode 1 and 2 support

The `main` branch supports OpenCode 2.0 and keeps OpenCode 1.18.7 support. Both hosts load all 55 skills and three feature-development specialists.

## Choose the right source

| Source | Skills | OpenCode plugin | Humanizer |
|---|---|---|---|
| Git `main` | 55 | OpenCode 1 and 2 | Included |
| npm `0.6.0` and tag `v0.6.0` | 55 | OpenCode 1 and 2 | Included |
| npm `0.5.0` and tag `v0.5.0` | 54 | OpenCode 1 only | Not included |

The npm selective installer copies skills into `.agents/skills`, but it does not register the three named specialist agents. Install the plugin for the full V2 integration.

## Install the current plugin

OpenCode 2:

```sh
opencode plugin add "opencode-power-pack@git+https://github.com/waybarrios/opencode-power-pack.git"
```

OpenCode 1:

```sh
opencode plugin --global "opencode-power-pack@git+https://github.com/waybarrios/opencode-power-pack.git"
```

Restart OpenCode after installation. Invoke a skill by name, such as `/code-review`, `/feature-dev`, or `/humanizer`.

## Verify the installation

On OpenCode 2, run `opencode debug agents`. The output should include `code-explorer`, `code-architect`, and `code-reviewer` as subagents. Check the skill picker for the 55 workflows.

On OpenCode 1, run `opencode debug skill` and `opencode debug agent code-explorer`.

The three bundled specialists cannot edit files, access the network, or create nested subagents. The reviewer can run a limited set of Git inspection commands. OpenCode 2 enforces these restrictions when it evaluates permission requests, even with permissive global rules. The agent listing can still show the host's base permissions.

A user-defined agent with a different system prompt or primary mode replaces the bundled role and keeps the host's permission defaults. Explicit user denials and approval prompts still apply to bundled agents.

## Update or remove the plugin

Use the exact package specification stored in your configuration.

```sh
# OpenCode 2 update
opencode plugin update "opencode-power-pack@git+https://github.com/waybarrios/opencode-power-pack.git"

# OpenCode 2 removal
opencode plugin remove "opencode-power-pack@git+https://github.com/waybarrios/opencode-power-pack.git"
```

On OpenCode 1, update by reinstalling with `plugin --global`. To remove the plugin, delete its entry from the `plugin` array and restart.

If you installed from a local `git+file://` clone, pull the latest source and then update or reinstall using that same specification. Pulling the clone alone does not refresh the installed package.

## What the checks cover

Smoke tests cover OpenCode 1.18.7, 2.0.14, and 2.0.32. Each host loads 55 skills and three specialists. Both V2 checks load the package directory, read the final catalogs, and test actual permission requests under a global allow rule. They make no model calls.

The behavioral evaluation runner uses the V2 session API. It accepts text only from successful turns and preserves optional `provider/model#variant` model references. Live runs need provider environment credentials because the isolated runtime does not copy OpenCode 2's credential database. See the [evaluation guide](../evals/behavioral/README.md).

The sandbox runner remains a separate npm CLI. It contains a selected command and its descendants on supported macOS and Linux systems. It does not isolate every host tool. See the [sandbox compatibility guide](sandbox-compatibility.md).
