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
Help me choose and install the right OpenCode Power Pack skills safely and project-locally in the current Git repository.

Your goal is to understand what I need, recommend the smallest useful profile or set of individual skills, obtain my explicit selection, install it for the active coding-agent host, preserve all existing project work, and leave a reproducible verification report.

Safety rules:
1. Do not modify package.json, package-lock.json, npm-shrinkwrap.json, pnpm-lock.yaml, yarn.lock, bun.lock, or application dependencies.
2. Do not use --force, --global, --all, sudo, destructive Git commands, or manual deletion/replacement of existing skill directories. Do not choose a profile or skill for me, and do not install anything before I explicitly approve the selection.
3. Do not clean, reset, stash, commit, or push the user's worktree. Existing changes belong to the user.
4. Do not create or modify repository files outside the resolved project-local .agents/skills directory. npm/npx may use its normal user cache, but must not add the package to this project's dependencies.
5. Stop and report the exact command, exit code, and error if a prerequisite, network request, permission check, or installer step fails. Do not bypass a failure with broader permissions or different flags.

Phase 1: detect the host and choose one installation path.

- If the active host is Claude Code, do not run the portable npm installer. Explain that Claude Code should use the collision-safe native plugin, then show these commands exactly:
  /plugin marketplace add waybarrios/opencode-power-pack
  /plugin install opencode-power-pack@opencode-power-pack
  After the user runs them, tell them to run /reload-plugins if prompted, verify the plugin with /plugin, and test /opencode-power-pack:code-review. Report this Claude-specific plan and stop.
- If the active host is Codex, OpenCode, or Pi, continue with the portable project-local selection procedure below.
- If the host cannot be determined confidently, stop and ask which host is active. Do not guess from repository files alone.

Phase 2: preflight without changing repository files.

1. Print the current directory with pwd.
2. Run git rev-parse --show-toplevel. Stop if this is not a Git repository. Save the absolute Git root.
3. Run node --version. Parse the major version and require Node.js 20 or newer. If it is older or unavailable, stop and explain how to satisfy the prerequisite without changing this project.
4. Run npm --version and stop if npm or npx is unavailable.
5. Capture git status --short before installation. Use it only as a baseline; do not alter any listed file.
6. State that the only permitted destination is <git-root>/.agents/skills.

Phase 3: discover my needs and obtain an explicit selection.

1. Run npx @waybarrios/opencode-power-pack list to read the current profiles and skill IDs from the published package. Treat that output as authoritative; do not invent names.
2. Ask what I want to accomplish, what kind of repository I am working in, and whether I prefer a broad workflow pack or only the minimum individual skills. Wait for my answer.
3. Map my answer to at most three clear options. Consider these curated profiles when relevant: `recommended` for a balanced starter set, `review` for PR and bug review, `feature-dev` for structured feature delivery, `frontend` for interface work, `security` for application-security workflows, `huggingface` for Hugging Face and ML work, `authoring` for creating skills and MCP servers, and `project-memory` for improving agent instruction files. Individual skill IDs may be selected instead of a profile, and profiles may be combined only when the need clearly requires both.
4. For each option, state the exact profile flags or skill IDs, what it enables, important companion skills it may resolve, and the tradeoff in installed scope. Recommend the smallest option that fully addresses my stated goal.
5. Ask me to choose or modify the proposed selection. Wait for explicit approval. Do not treat silence or a vague acknowledgement as approval.
6. Convert the approved choice into `<approved-selection>`, using one or more `--profile <name>` flags and/or exact individual skill IDs. Never substitute `--all` unless I explicitly request the complete catalog.

Phase 4: preview the exact dependency closure.

Run exactly:
npx @waybarrios/opencode-power-pack install <approved-selection> --project --dry-run

Require a successful exit code. Before writing anything, report:
- the detected host, my stated goal, the approved selection, Git root, and resolved destination;
- the number and complete list of resolved skills, including automatically included companion skills;
- every planned status printed by the installer;
- which entries are new and which already exist;
- any warning, conflict, unexpected path, or permission problem.

Interpret `would-update` as an existing destination conflict. Do not claim it will be overwritten: without --force, the real installation will skip that entry. If the resolved destination is not exactly <git-root>/.agents/skills, or the preview proposes anything outside it, stop. If existing entries are present, explain that they will be preserved and that the result may be a partial update. Never add --force on your own.

Phase 5: install only after the preview satisfies every safety rule.

Run exactly:
npx @waybarrios/opencode-power-pack install <approved-selection> --project

Use the exact same approved selection as the successful dry-run and remove only `--dry-run`. If it fails, stop and report the failure. Do not retry with sudo, --global, --force, or manual copying.

Phase 6: verify and report.

1. Compare the install output with the dry-run selection. Record every `installed`, `skipped`, and warning result.
2. Confirm that every newly installed skill directory exists under <git-root>/.agents/skills and contains a SKILL.md file.
3. Run git status --short again and compare it with the saved baseline. Confirm that installation introduced no changes outside .agents/skills and did not change dependency manifests or lockfiles. Do not revert unrelated differences.
4. Tell the user to start a new agent session if the skills do not appear automatically.
5. Give the host-specific verification command:
   - Codex: inspect /plugins, then invoke an installed skill such as $code-review.
   - OpenCode: run opencode debug skill, then invoke /code-review.
   - Pi: run pi list, then request a task that matches an installed workflow.
6. Finish with a concise structured report containing: stated need, approved selection and rationale, alternatives not chosen, host, Node/npm versions, Git root, destination, exact commands run, resolved skill count and names, installed entries, preserved/skipped entries, warnings or failures, worktree comparison, verification result, and any user action still required.
```

Canonical human guide: https://skills.waybarrios.com/docs/#agent-install
