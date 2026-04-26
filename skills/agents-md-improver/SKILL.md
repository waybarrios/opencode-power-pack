---
name: agents-md-improver
description: Audit and improve project-rules files (AGENTS.md, CLAUDE.md, .agents/instructions, etc.) in repositories. Use when the user asks to check, audit, update, improve, or fix their AGENTS.md or CLAUDE.md, when they mention "project rules maintenance" or "agent context optimization", or after the codebase has changed significantly and the rules file may be stale. Scans for all relevant files, evaluates quality against templates, outputs a quality report, and then makes targeted updates with user approval.
license: MIT (adapted from anthropics/claude-plugins-official/plugins/claude-md-management/skills/claude-md-improver)
---

# AGENTS.md / CLAUDE.md Improver

Audit, evaluate, and improve project-rules files across a codebase to ensure the agent has optimal project context.

OpenCode reads project rules from several files in a priority order: **`AGENTS.md`** (native), then **`CLAUDE.md`** (Claude Code compatibility), then `.agents/instructions.md`. This skill works on whichever your project uses, but treats `AGENTS.md` as the canonical name when creating new files.

**This skill can write to project-rules files.** After presenting a quality report and getting user approval, it updates the files with targeted improvements.

## Workflow

### Phase 1: Discovery

Find all relevant files in the repository:

```bash
find . \( -name "AGENTS.md" -o -name "CLAUDE.md" -o -name ".claude.local.md" -o -name ".agents.local.md" \) 2>/dev/null | head -50
```

**File types and locations:**

| Type | Location | Purpose |
|------|----------|---------|
| Project root (OpenCode native) | `./AGENTS.md` | Primary project context (committed, shared) |
| Project root (Claude compat) | `./CLAUDE.md` | Same purpose; OpenCode reads it as fallback |
| Local overrides | `./.agents.local.md` or `./.claude.local.md` | Personal/local settings (gitignored) |
| Global defaults | `~/.config/opencode/AGENTS.md` or `~/.claude/CLAUDE.md` | User-wide defaults |
| Package-specific | `./packages/*/AGENTS.md` | Module-level context in monorepos |
| Subdirectory | Any nested location | Feature/domain-specific context |

OpenCode walks up from the working directory toward the git root, loading any matching rules files along the way, so monorepos and nested projects work automatically.

### Phase 2: Quality assessment

For each rules file, evaluate against the criteria below.

**Quick assessment checklist:**

| Criterion | Weight | Check |
|-----------|--------|-------|
| Commands / workflows documented | High | Are build / test / deploy commands present? |
| Architecture clarity | High | Can the agent understand the codebase structure? |
| Non-obvious patterns | Medium | Are gotchas and quirks documented? |
| Conciseness | Medium | No verbose explanations or obvious info? |
| Currency | High | Does it reflect the current codebase state? |
| Actionability | High | Are instructions executable, not vague? |

**Quality scores:**

- **A (90–100)** — Comprehensive, current, actionable.
- **B (70–89)** — Good coverage, minor gaps.
- **C (50–69)** — Basic info, missing key sections.
- **D (30–49)** — Sparse or outdated.
- **F (0–29)** — Missing or severely outdated.

### Phase 3: Quality-report output

**Always output the quality report BEFORE making any updates.**

Format:

```
## Project-Rules Quality Report

### Summary
- Files found: X
- Average score: X/100
- Files needing update: X

### File-by-File Assessment

#### 1. ./AGENTS.md (Project Root)
**Score: XX/100 (Grade: X)**

| Criterion | Score | Notes |
|-----------|-------|-------|
| Commands / workflows | X/20 | ... |
| Architecture clarity | X/20 | ... |
| Non-obvious patterns | X/15 | ... |
| Conciseness | X/15 | ... |
| Currency | X/15 | ... |
| Actionability | X/15 | ... |

**Issues:**
- [List specific problems]

**Recommended additions:**
- [List what should be added]

#### 2. ./packages/api/AGENTS.md (Package-specific)
...
```

### Phase 4: Targeted updates

After the quality report, ask the user for confirmation before updating.

**Update guidelines (critical):**

1. **Propose targeted additions only.** Focus on genuinely useful info:
   - Commands or workflows discovered during analysis
   - Gotchas or non-obvious patterns found in code
   - Package relationships that were unclear
   - Testing approaches that work
   - Configuration quirks

2. **Keep it minimal.** Avoid:
   - Restating what is obvious from the code
   - Generic best practices already covered
   - One-off fixes unlikely to recur
   - Verbose explanations when a one-liner suffices

3. **Show diffs.** For each change, show:
   - Which file to update
   - The specific addition (diff or quoted block)
   - A brief explanation of why this helps future sessions

**Diff format:**

````markdown
### Update: ./AGENTS.md

**Why:** Build command was missing, causing confusion about how to run the project.

```diff
+ ## Quick Start
+
+ ```bash
+ npm install
+ npm run dev  # Start development server on port 3000
+ ```
```
````

### Phase 5: Apply updates

After user approval, apply changes using the editor tool. Preserve the existing content structure; only add what was approved.

## Common issues to flag

1. **Stale commands** — build commands that no longer work.
2. **Missing dependencies** — required tools not mentioned.
3. **Outdated architecture** — file structure that has changed.
4. **Missing environment setup** — required env vars or config.
5. **Broken test commands** — test scripts that have changed.
6. **Undocumented gotchas** — non-obvious patterns not captured.

## What makes a great rules file

**Key principles:**

- Concise and human-readable.
- Actionable commands that can be copy-pasted.
- Project-specific patterns, not generic advice.
- Non-obvious gotchas and warnings.

**Recommended sections** (use only what is relevant):

- Commands (build, test, dev, lint)
- Architecture (directory structure)
- Key files (entry points, config)
- Code style (project conventions)
- Environment (required vars, setup)
- Testing (commands, patterns)
- Gotchas (quirks, common mistakes)
- Workflow (when to do what)

## Tips to share with the user

- **Keep it concise** — the rules file is part of the prompt, so brevity matters. Dense is better than verbose.
- **Actionable commands** — all documented commands should be copy-paste ready.
- **Use a `.local` override** — for personal preferences not shared with the team (add to `.gitignore`).
- **Global defaults** — put user-wide preferences in `~/.config/opencode/AGENTS.md` (or `~/.claude/CLAUDE.md`).
- **Prefer `AGENTS.md`** — when creating a new rules file, use `AGENTS.md`. OpenCode reads it natively and Claude Code reads it via fallback. If a `CLAUDE.md` already exists, leave it; OpenCode reads it via the compatibility layer.
