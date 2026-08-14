# Agent Installation Guide for OpenCode Power Pack

> Instructions for a coding agent to install OpenCode Power Pack safely and verify the result without modifying application dependencies.

## Scope

Use the selective npm installer for Codex, OpenCode, or Pi when the user wants one skill, several skills, or a curated profile. The installer copies Agent Skill directories. It must not modify `package.json` and adds no runtime dependency to the user's application.

Use Claude Code's native plugin commands for the complete namespaced catalog. Do not assume that Claude Code loads the portable `.agents/skills` path.

## Safe project-local procedure

1. Confirm the current directory belongs to the intended Git repository.
2. Run `node --version`. Stop if Node.js is older than 20.
3. Preview the resolved selection and destination.
4. Report the destination, selected skills, automatic companions, existing conflicts, and planned writes.
5. If the preview matches the user's requested scope, repeat the command without `--dry-run`.
6. Do not use `--force` unless the user separately requests replacement after reviewing the conflicts.
7. Start a new host session and verify the installed skill IDs.

```sh
npx @waybarrios/opencode-power-pack install --profile recommended --project --dry-run
npx @waybarrios/opencode-power-pack install --profile recommended --project
```

Remove `--project` for a user-level installation into `~/.agents/skills`.

## Selection examples

```sh
# One workflow
npx @waybarrios/opencode-power-pack install code-review --project --dry-run
npx @waybarrios/opencode-power-pack install code-review --project

# Several workflows
npx @waybarrios/opencode-power-pack install code-review security-review --project --dry-run
npx @waybarrios/opencode-power-pack install code-review security-review --project

# A job-based profile
npx @waybarrios/opencode-power-pack install --profile review --project --dry-run
npx @waybarrios/opencode-power-pack install --profile review --project
```

Available profiles: `recommended`, `review`, `feature-dev`, `frontend`, `security`, `huggingface`, `authoring`, and `project-memory`.

## Claude Code native installation

Ask the user to run these commands inside Claude Code:

```text
/plugin marketplace add waybarrios/opencode-power-pack
/plugin install opencode-power-pack@opencode-power-pack
```

Verify through `/plugin`, then invoke a workflow with its collision-safe namespace, such as `/opencode-power-pack:code-review`.

## Host verification

- Codex: start a new session, inspect `/plugins`, and invoke `$code-review` or another installed ID.
- OpenCode: start a new session, run `opencode debug skill`, and invoke `/code-review` or another installed ID.
- Pi: start a new session, run `pi list`, and ask for a task matching the installed workflow.
- Claude Code: inspect `/plugin` and use `/opencode-power-pack:<skill-id>`.

## Copyable agent prompt

```text
Install OpenCode Power Pack's recommended profile in this Git repository. First require Node.js 20 or newer. Run npx @waybarrios/opencode-power-pack install --profile recommended --project --dry-run and report the resolved destination, selected skills, automatic companions, and conflicts. If the preview is safe, run the same command without --dry-run. Do not use --force and do not modify package.json. Explain how to start a new session and verify the installed skills for the current host. If this is Claude Code, do not use the portable npm path; show me the two native plugin commands instead.
```

Canonical human guide: https://skills.waybarrios.com/docs/#agent-install
