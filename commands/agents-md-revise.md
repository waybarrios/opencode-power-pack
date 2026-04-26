---
description: Capture learnings from the current session into the project-rules file (AGENTS.md, CLAUDE.md, or local override) so future sessions benefit. Use when the user says "revise the rules", "update AGENTS.m
---

# AGENTS.md / CLAUDE.md Revise

Review the current session for learnings about working in this codebase, then update the project-rules file with context that would help future sessions be more effective.

OpenCode reads project rules from `AGENTS.md` (native) or `CLAUDE.md` (Claude Code compatibility). When this skill creates a new file, prefer `AGENTS.md`. When updating an existing file, edit whichever the project already uses.

## Step 1 — Reflect

Look back over the session and identify what context was missing that would have helped the agent work more effectively. Examples:

- Bash commands that were used or discovered
- Code-style patterns followed
- Testing approaches that worked
- Environment / configuration quirks
- Warnings or gotchas encountered
- Build steps that surprised you
- Tool versions that mattered
- Project-specific conventions that took time to figure out

Be selective. Only capture things that:

1. Will recur in future sessions (not one-off fixes).
2. Would have saved time if known up front.
3. Cannot be derived by reading the code.

## Step 2 — Find rules files

```bash
find . \( -name "AGENTS.md" -o -name "CLAUDE.md" -o -name ".agents.local.md" -o -name ".claude.local.md" \) 2>/dev/null | head -20
```

Decide where each addition belongs:

- **`AGENTS.md` / `CLAUDE.md`** — team-shared, committed to git. Use for project-wide conventions, build commands, architectural notes.
- **`.agents.local.md` / `.claude.local.md`** — personal / local only, gitignored. Use for personal preferences that should not affect teammates.

If no rules file exists yet, propose creating `AGENTS.md` at the project root.

## Step 3 — Draft additions

**Keep it concise.** The rules file is part of every prompt, so brevity matters. One line per concept when possible.

Format: `<command or pattern> — <brief description>`

**Avoid:**

- Verbose explanations
- Obvious information that any reader of the code would already know
- One-off fixes unlikely to recur
- Restating what is already documented elsewhere in the rules file

**Prefer:**

- Imperative commands ("Run `pnpm i --frozen-lockfile` after pulling")
- Concrete gotchas ("The `dev` script binds to port 3000 — kill any other process on that port first")
- Project-specific patterns ("All dates are stored in UTC; convert at the boundary")

## Step 4 — Show proposed changes

For each addition, show the user the diff before applying. Format:

````markdown
### Update: ./AGENTS.md

**Why:** [one-line reason this matters for future sessions]

```diff
+ [the addition — keep it brief]
```
````

If multiple additions go to the same file, group them under one header so the user can review the whole change in one view.

## Step 5 — Apply with approval

Ask the user explicitly: *"Apply these changes?"* Edit only files they approve.

Preserve the existing structure. Place additions in the most relevant section (e.g., a new build command goes under "Commands" if that section exists). If no obvious section fits, create one with a clear header.

If the user rejects an addition, do not retry it in the same session — they may have a reason. Move on.

## Notes

- This skill **writes** to project files. Always show the diff first and wait for approval.
- Pair this skill with `agents-md-improver` for the full maintenance loop: improver audits and identifies gaps; this one captures fresh session-specific learnings.
- Do not include sensitive information (API keys, tokens, internal URLs) in committed rules files. Put those in `.agents.local.md` / `.claude.local.md` or in environment variables.

---

**User arguments:** $ARGUMENTS
