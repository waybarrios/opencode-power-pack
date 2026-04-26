---
description: Guide a feature implementation through a structured seven-phase workflow with deep codebase understanding, clarifying questions, parallel architecture design, and quality review. Use this skill when t
---

# Feature Development

Help a developer implement a new feature systematically. Understand the codebase deeply, identify and ask about underspecified details, design elegant architectures, then implement.

## Core principles

- **Ask clarifying questions** — Identify ambiguities, edge cases, and underspecified behaviors. Ask specific, concrete questions rather than making assumptions. Wait for user answers before proceeding.
- **Understand before acting** — Read and comprehend existing code patterns first.
- **Read files identified by sub-tasks** — When dispatching code-explorer sub-tasks, ask them to return lists of the most important files to read. After they complete, read those files yourself to build detailed context.
- **Simple and elegant** — Prioritize readable, maintainable, architecturally sound code.
- **Track progress** — Use a todo list throughout.

## Phase 1: Discovery

Goal: Understand what needs to be built.

1. Create a todo list covering all seven phases.
2. If the feature is unclear, ask the user:
   - What problem are they solving?
   - What should the feature do?
   - Any constraints or requirements?
3. Summarize your understanding and confirm with the user before proceeding.

## Phase 2: Codebase exploration

Goal: Understand relevant existing code at both high and low levels.

1. Dispatch 2–3 `code-explorer` sub-tasks in parallel. Each should:
   - Trace through the code comprehensively, focusing on abstractions, architecture, and control flow.
   - Target a different aspect (similar features, high-level architecture, UX, extension points).
   - Return a list of 5–10 key files to read.
2. After they return, read every file they identified to build deep understanding.
3. Present a comprehensive summary of findings and patterns to the user.

## Phase 3: Clarifying questions

Goal: Fill gaps and resolve ambiguities before designing.

**This is one of the most important phases. Do not skip.**

1. Review the codebase findings and the original feature request.
2. Identify underspecified aspects: edge cases, error handling, integration points, scope boundaries, design preferences, backward compatibility, performance.
3. Present all questions to the user as a clear, organized list.
4. **Wait for answers** before moving to architecture.

If the user says "whatever you think is best", make your recommendation explicit and get confirmation.

## Phase 4: Architecture design

Goal: Design multiple implementation approaches with different trade-offs.

1. Dispatch 2–3 `code-architect` sub-tasks in parallel, each with a different focus:
   - **Minimal changes** — smallest diff, maximum reuse of existing code.
   - **Clean architecture** — maintainability, elegant abstractions.
   - **Pragmatic balance** — speed plus quality.
2. Review all approaches and form an opinion on which fits best for this task. Consider scope (small fix vs. large feature), urgency, complexity, and team context.
3. Present to the user: a brief summary of each approach, a trade-offs comparison, your recommendation with reasoning, and concrete differences in implementation.
4. **Ask the user which approach they prefer.**

## Phase 5: Implementation

Goal: Build the feature.

**Do not start without explicit user approval.**

1. Wait for approval.
2. Re-read all relevant files identified earlier.
3. Implement following the chosen architecture.
4. Strictly follow codebase conventions (naming, style, error-handling patterns).
5. Update todos as you progress.

## Phase 6: Quality review

Goal: Ensure the code is simple, DRY, elegant, readable, and correct.

1. Dispatch 3 `code-reviewer` sub-tasks in parallel, each with a different focus:
   - Simplicity / DRY / elegance
   - Bugs / functional correctness
   - Project conventions and abstractions
2. Consolidate findings and rank issues by severity.
3. Present findings to the user and ask what they want to do (fix now, fix later, proceed as-is).
4. Address issues based on their decision.

## Phase 7: Summary

Goal: Document what was accomplished.

1. Mark all todos complete.
2. Summarize:
   - What was built
   - Key decisions made
   - Files modified
   - Suggested next steps

---

**User arguments:** $ARGUMENTS
