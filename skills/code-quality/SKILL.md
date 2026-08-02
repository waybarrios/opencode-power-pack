---
name: code-quality
description: Agents should invoke this skill for code reviews, linting/formatting setup, maintainability checks, complexity concerns, warning cleanup, coding standards, or quality gates in Rust, TypeScript, Python, shell, and mixed repos.
license: MIT (modified; see UPSTREAMS.json)
---

# Code Quality

Structured code review and quality enforcement across common tech stacks. Checklists, linting strategies, and metrics to keep codebases healthy.

## Quick Start

### Run a Code Quality Check

1. **Run static analysis:** Linters, type checkers, formatters
2. **Review against checklist:** Language-specific items below
3. **Check complexity metrics:** Cyclomatic < 25, data flow < 25
4. **Report findings:** Structured output with severity and recommendations

---

## Linting Configurations

### Rust — Clippy Config

Standard clippy configuration (in `Cargo.toml` or `.clippy.toml`):

```toml
[lints.clippy]
cognitive_complexity = "warn"
pedantic = { level = "deny", priority = -1 }
nursery = { level = "deny", priority = -1 }
unwrap_used = "deny"
```

**Standard commands:**

```bash
cargo fmt
cargo clippy --all-targets --all-features -- -D warnings
cargo check
cargo test -- --test-threads=1
```

**Key rules to enforce:**
- No `.unwrap()` in non-test code (use `?` or `.expect("reason")`)
- All public items have rustdoc (`#[warn(missing_docs)]`)
- `#[must_use]` on functions that return values that should be checked
- When using `#[allow(...)]`, always add a comment explaining why
- If no good explanation exists for `#[allow(...)]`, fix the issue instead

### TypeScript — ESLint + Strict Mode

**Recommended `tsconfig.json` strictness:**

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true
  }
}
```

**Key rules to enforce:**
- No `any` — use `unknown` and type guards instead
- No `// @ts-ignore` — fix the type issue or use `// @ts-expect-error` with explanation
- Prefer `const` over `let`, never use `var`
- Use discriminated unions for state modeling
- Explicit return types on exported functions

### Python — Ruff + Mypy

**Recommended `pyproject.toml`:**

```toml
[tool.ruff]
target-version = "py312"
line-length = 88

[tool.ruff.lint]
select = ["E", "F", "W", "I", "N", "UP", "ANN", "B", "A", "C4", "DTZ", "ISC", "PIE", "PT", "RET", "SIM", "TCH", "ARG", "PTH", "ERA"]

[tool.mypy]
strict = true
warn_return_any = true
warn_unreachable = true
```

**Key rules to enforce:**
- Type hints on all public functions and methods
- Docstrings on all public classes, functions, and methods
- Use `pathlib.Path` over `os.path`
- Use `uv` as package manager
- No bare `except:` — always catch specific exceptions

---

## Code Review Checklists

### Universal Checklist (All Languages)

**Correctness:**
- [ ] Does the code do what it claims to do?
- [ ] Are edge cases handled (empty collections, null/None, zero, negative)?
- [ ] Are error paths handled gracefully?
- [ ] Are there any off-by-one errors?

**Clarity:**
- [ ] Can you understand the code without the PR description?
- [ ] Are variable/function names descriptive and consistent?
- [ ] Are complex sections commented with "why" (not "what")?
- [ ] Is the code self-documenting where possible?

**Architecture:**
- [ ] Does this change respect existing module boundaries?
- [ ] Is the change at the right abstraction level?
- [ ] Are dependencies reasonable (not pulling in a huge lib for one function)?

**Testing:**
- [ ] Are new functions/methods covered by tests?
- [ ] Do tests cover edge cases and error paths?
- [ ] Are tests readable and maintainable?

**Security (flag for a security follow-up if concerns found):**
- [ ] No hardcoded secrets or credentials
- [ ] User input is validated before use
- [ ] No SQL injection, XSS, or path traversal vectors

### Rust-Specific Checklist

- [ ] `cargo fmt` applied
- [ ] `cargo clippy` clean (pedantic + nursery)
- [ ] No `.unwrap()` outside tests
- [ ] Error handling uses `?` with proper error types
- [ ] Public items have rustdoc comments
- [ ] `#[allow(...)]` includes explanatory comment
- [ ] New functions have unit tests
- [ ] Cyclomatic complexity < 25 per function
- [ ] Data flow complexity < 25 per function

### TypeScript/React-Specific Checklist

- [ ] No `any` types
- [ ] Strict mode compliance
- [ ] Components have clear prop types
- [ ] Hooks follow rules of hooks
- [ ] No unnecessary re-renders (check memo/callback usage)
- [ ] Bundle impact considered for new dependencies

### Django/Python-Specific Checklist

- [ ] Type hints present on public interfaces
- [ ] Ruff + mypy clean
- [ ] No N+1 queries (use `select_related`/`prefetch_related`)
- [ ] Migrations are reviewed and reversible
- [ ] No business logic in views (use service layer)

---

## Complexity Metrics

### Cyclomatic Complexity

Measures the number of independent paths through code. Recommended threshold: **< 25**.

| Complexity | Risk Level | Action |
|---|---|---|
| 1-10 | Low | Simple, well-structured code |
| 11-20 | Moderate | Consider simplification if growing |
| 21-24 | High | Refactoring recommended |
| 25+ | Violation | Must refactor before merge |

**How to reduce:**
- Extract helper functions for each branch
- Use early returns / guard clauses
- Replace complex conditionals with lookup tables or pattern matching
- Use strategy pattern for variant-dependent behavior

### Data Flow Complexity

Measures how many variables interact within a function. Recommended threshold: **< 25**.

**How to reduce:**
- Extract pure functions that take fewer parameters
- Group related parameters into structs/objects
- Split functions that transform data in multiple stages

### Measurement Tools

| Language | Tool | Command |
|---|---|---|
| Rust | `cargo clippy` (cognitive_complexity) | Built into clippy config |
| TypeScript | `eslint-plugin-sonarjs` | Configure `complexity` rule |
| Python | `radon` | `radon cc <file> -s -a` |
| Python | `ruff` | Rule `C901` (mccabe complexity) |

---

## Review Output Format

When delivering a code review:

```markdown
## Code Review: [PR/File/Module]

**Date:** YYYY-MM-DD

### Summary
[1-2 sentences: overall quality assessment]

### Findings

| # | Severity | File | Line(s) | Finding | Suggestion |
|---|---|---|---|---|---|
| 1 | High | src/app.rs | 45-67 | Cyclomatic complexity 28 (limit: 25) | Extract match arms into helper functions |
| 2 | Medium | src/ui.rs | 120 | Unwrap without context | Use `.expect("reason")` or `?` |

### Positive Observations
[What's well-written — acknowledge good code]

### Metrics
- Linter: [clean / N warnings]
- Tests: [pass / fail]
- Complexity: [within limits / violations noted above]

### Security Notes
[Items to flag for follow-up, if any]
```

---

## Integration

- Can run linters, formatters, and type checkers without asking, per the project's `AGENTS.md`/`CLAUDE.md` execution policies.
- Cross-reference: this pack's `code-reviewer` skill for adversarial review of a focused change set, and `design-patterns` for fixing complexity violations through better structure.
