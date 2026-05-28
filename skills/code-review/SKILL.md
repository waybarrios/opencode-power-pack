---
name: code-review
description: Review a pull request or a set of code changes for bugs, logic errors, and project-convention violations using a confidence-filtered, multi-agent process. Use this skill when the user asks to review a PR, audit pending changes, or inspect a diff for problems before merging.
license: MIT (ported from anthropics/claude-code/plugins/code-review)
---

# Code Review

Provide a high-signal code review for a pull request or set of pending changes. The goal is to surface only issues that are clearly real and actionable, while filtering out noise, nitpicks, and false positives.

## When to use this skill

Trigger on phrases like "review this PR", "code review", "check my diff", "audit the pending changes on this branch", or when the user asks for a security/quality pass before merging.

## High-level process

Follow these steps in order. Use OpenCode's parallel sub-task dispatch where the original Claude Code workflow used parallel agents.

### 1. Pre-flight check

Before doing any review work, verify the PR (or change set) is worth reviewing. Skip the review and stop early if any of the following hold:

- The PR is closed
- The PR is a draft
- The change is trivial (single-line typo, formatting, automated dependency bump) and obviously correct
- A previous review by the agent already exists on this PR

Use `gh pr view <PR>` (or the local `git diff` for non-PR review) to gather state.

### 2. Identify project conventions

Build a list of all project-convention files relevant to the change:

- The repository root `CLAUDE.md` / `AGENTS.md` (whichever exists)
- Any nested `CLAUDE.md` / `AGENTS.md` in directories containing modified files

You only need the file paths at this stage, not the contents.

### 3. Summarize the change

Read `gh pr view --json title,body` and `gh pr diff` (or `git diff`) and produce a one-paragraph summary of what the PR is doing and why. This grounds the rest of the review.

### 4. Parallel issue detection (deep mode)

Dispatch **seven independent reviewers** in parallel. Each returns a list of candidate issues, where each issue includes a description, a reason category, an initial confidence (0–100), and a one-sentence failure scenario explaining how this would manifest in practice.

- **Reviewer 1 + Reviewer 2 — Convention compliance.** Audit the diff against the relevant `CLAUDE.md` / `AGENTS.md` rules. Only consider rule files that apply to the file being reviewed (same path or ancestor directory). Quote the exact rule being violated.
- **Reviewer 3 — Diff-only bug scan.** Scan the diff for obvious bugs without reading surrounding files. Flag only clear issues that do not need unseen context.
- **Reviewer 4 — Deep-context bug scan.** Read the **full file(s)** for each changed function, not just the diff hunks. Trace data flow into and out of the changed code. Flag bugs that depend on context the diff alone does not show (e.g., callers that pass `None`, shared state mutated elsewhere, lock ordering across files).
- **Reviewer 5 — Concurrency, ordering & state.** Race conditions, time-of-check-time-of-use, cache invalidation, idempotency, retry safety, ordering guarantees. Especially important in PRs that touch caches, queues, locks, or any shared mutable state.
- **Reviewer 6 — Error handling & edge cases.** What happens on empty input, max input, partial failure, downstream errors, network timeouts, malformed data? Is failure logged, swallowed, or propagated? Are exceptions caught at the right layer?
- **Reviewer 7 — Test coverage gap.** What scenarios in the changed code are *not* covered by existing tests? List them concretely (no generic "needs more tests"). Especially flag changed branches with no test exercising them.

Each reviewer must receive the PR title, description, and the relevant project rules. Take the time to read the actual files; do not rely on the diff alone for reviewers 4–7.

**Critical: only HIGH-SIGNAL issues should be flagged.** Do flag:
- Code that will fail to compile or parse (syntax, type errors, missing imports)
- Code that will definitely produce wrong results regardless of inputs
- Clear, unambiguous convention violations (must quote the exact rule)
- Concrete edge cases that are reachable in production with a specific trigger
- Scope creep — code that adds abstractions, configurability, or features that do not trace to the change's stated goal

Do NOT flag:
- Style or quality concerns that aren't in the project rules
- Potential issues that depend on specific runtime state or inputs
- Subjective suggestions
- Anything a linter would catch — you are not the linter
- Pre-existing issues
- Issues silenced via lint-ignore comments

When uncertain, do not flag. False positives erode trust.

### 5. Cross-check pass

Before validation, dispatch a **second-pass reviewer** that explicitly tries to **break** each candidate finding:

- For each candidate, ask: "What is the strongest argument this is *not* a real issue?" Write that argument out.
- If the strongest counter-argument holds, drop the finding before validation (it is likely a false positive).
- If the candidate survives, keep it for validation in step 6.

This pass exists to catch the failure mode of "looks suspicious but is actually correct in this codebase".

### 6. Validate each surviving issue

For each candidate from step 5, dispatch a validator sub-task. Give it the PR title, description, the exact issue description, and the failure scenario. Its job is to verify with high confidence that the issue is real:

- For "variable not defined" → verify it is actually undefined in the relevant scope by reading the imports and surrounding code.
- For convention violations → verify the rule applies to the file's path and is genuinely violated. Quote the rule.
- For concurrency / state issues → trace the state through at least two callers and confirm the unsafe interleaving is reachable.
- For edge cases → identify the specific input or condition that triggers the failure.

For each validated issue, the validator must produce:
1. A re-stated confidence score (0–100). Drop anything below 80.
2. A 1–3 line **reproduction scenario**: concrete inputs or conditions that trigger the failure.
3. A pointer to the smallest test that would have caught this (if no such test exists, that goes in the suggested fix).

Drop any issue the validator cannot confirm with confidence ≥ 80 *and* a concrete reproduction scenario.

### 7. Output

Output a summary to the terminal. For each validated issue include:

- File path and line number
- Severity (Critical / Important)
- Confidence (0–100)
- One-sentence problem statement
- 1–3 line reproduction scenario from step 6
- Concrete fix suggestion (or path to add a missing test)
- The exact rule or bug category

Group by severity. If no issues were validated, output exactly: `No issues found. Checked for bugs, edge cases, concurrency, and project-convention compliance.`

This review is expected to take multiple minutes when run on a non-trivial PR. Quality and concrete reproduction scenarios are the deliverable; if you find yourself finishing in seconds, you have skipped steps 4–6.

### 8. Optional GitHub posting

If the user invoked the review with a `--comment` style instruction (i.e. "post the review on the PR"):

- If no issues found, post the summary as a single PR comment via `gh pr comment`
- If issues found, post one inline comment per issue using the GitHub inline-comment API. Do not duplicate comments. Include a link to the relevant code with the format:
  ```
  https://github.com/<owner>/<repo>/blob/<full-sha>/<path>#L<start>-L<end>
  ```
  Always provide the full SHA (no shell substitution), include 1+ line of context above and below, and use `L<start>-L<end>` format.

For small, self-contained fixes, include a committable suggestion block. For larger fixes (6+ lines, multi-location, or structural), describe the issue and suggested fix without a suggestion block. Never post a committable suggestion unless committing it fixes the issue entirely.

## Notes

- Use `gh` CLI for all GitHub interactions; do not use web fetch
- Keep a todo list for the steps above
- Cite each issue with a link when posting
