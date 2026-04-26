---
description: Create new skills (SKILL.md files), modify and improve existing skills, and design skill descriptions for accurate triggering. Use when the user wants to create a new skill from scratch, edit an exist
---

# Skill Creator

A skill for creating new skills and iteratively improving them.

At a high level, the process of creating a skill goes like this:

- Decide what the skill should do and roughly how it should do it
- Write a draft of the skill (`SKILL.md`)
- Try the skill on a few realistic test prompts
- Evaluate the results, both qualitatively (does the output look right?) and, where possible, with simple verifiable assertions
- Refine the skill based on what you observed
- Repeat until satisfied
- Optimize the description for accurate triggering

Your job when using this skill is to figure out where the user is in this process and help them progress through the stages. If they say "I want to make a skill for X", help narrow down what they mean, write a draft, try a few realistic prompts, and iterate. If they already have a draft, jump straight to testing and iterating.

If the user just says "vibe with me, no formal evals", do that.

## Communicating with the user

Skill-creator is liable to be used by people across a wide range of familiarity with coding jargon. Pay attention to context cues:

- "evaluation" / "benchmark" — borderline OK
- "JSON" / "assertion" — explain unless the user shows familiarity

It is fine to briefly clarify a term when in doubt.

## Capture intent

Start by understanding what the user wants. The current conversation may already contain the workflow to capture (e.g., they say "turn this into a skill"). If so, extract answers from the conversation history first — the tools used, the sequence of steps, corrections made, the input/output formats observed. The user can fill the gaps and confirm.

Ask:

1. What should this skill enable the model to do?
2. When should this skill trigger? (what user phrases / contexts)
3. What is the expected output format?
4. Should we set up test cases to verify the skill works? Skills with objectively verifiable outputs (file transforms, data extraction, code generation, fixed workflow steps) benefit from test cases. Skills with subjective outputs (writing style, art) often do not. Suggest the appropriate default but let the user decide.

## Interview and research

Proactively ask about edge cases, input/output formats, example files, success criteria, and dependencies. Wait to write test prompts until this is ironed out.

If the platform supports parallel sub-tasks, research in parallel (search docs, find similar skills, check best practices).

## Writing the SKILL.md

Based on the interview, fill in:

- **`name`** — the skill identifier (must match the directory name; lowercase alphanumeric with single hyphens, regex `^[a-z0-9]+(-[a-z0-9]+)*$`).
- **`description`** — when to trigger and what the skill does. **This is the primary triggering mechanism**. Include both what the skill does AND specific contexts for when to use it. All "when to use" info goes here, not in the body. Skills tend to under-trigger, so make descriptions slightly "pushy" — e.g. instead of *"Build a fast dashboard"*, write *"Build a fast dashboard. Make sure to use this skill whenever the user mentions dashboards, data visualization, internal metrics, or wants to display any kind of company data, even if they do not explicitly ask for a 'dashboard.'"*
- **`license`** (optional) — the license under which the skill is distributed.

Then write the body.

## Anatomy of a skill

```
skill-name/
├── SKILL.md (required)
│   ├── YAML frontmatter (name, description required)
│   └── Markdown instructions
└── Bundled resources (optional)
    ├── scripts/    — Executable code for deterministic / repetitive tasks
    ├── references/ — Docs loaded into context as needed
    └── assets/     — Files used in output (templates, icons, fonts)
```

## Progressive disclosure

Skills use a three-level loading system:

1. **Metadata** (name + description) — always in context, ~100 words.
2. **`SKILL.md` body** — in context whenever the skill triggers; aim for under 500 lines.
3. **Bundled resources** — loaded as needed; unlimited size; scripts can execute without loading.

**Key patterns:**

- Keep `SKILL.md` under 500 lines. If approaching the limit, add a layer of hierarchy with clear pointers to follow-up files.
- Reference files clearly from `SKILL.md` with guidance on when to read them.
- For large reference files (>300 lines), include a table of contents.

**Domain organization:** when a skill supports multiple domains/frameworks, organize by variant:

```
cloud-deploy/
├── SKILL.md (workflow + selection)
└── references/
    ├── aws.md
    ├── gcp.md
    └── azure.md
```

The model reads only the relevant reference file.

## Principle of lack of surprise

Skills must not contain malware, exploit code, or any content that could compromise system security. A skill's contents should not surprise the user given its description. Do not create misleading skills or skills designed to facilitate unauthorized access, data exfiltration, or other malicious activities. Roleplay-style skills are fine.

## Writing style

- Use **imperative form** in instructions ("Do X", "Run Y").
- **Explain the why** behind instructions. Today's models are smart and follow reasoning better than rigid rules. If you find yourself writing ALL-CAPS MUSTs and NEVERs, that is a yellow flag. Reframe and explain the reasoning instead.
- Keep instructions general and reusable, not narrowly tied to specific test examples.

**Defining output formats** — use a clear template:

```markdown
## Report structure
ALWAYS use this exact template:
# [Title]
## Executive summary
## Key findings
## Recommendations
```

**Examples pattern** — small, concrete examples help:

```markdown
## Commit message format
**Example 1:**
Input: Added user authentication with JWT tokens
Output: feat(auth): implement JWT-based authentication
```

## Test cases

After drafting, come up with 2–3 realistic test prompts — the kind of thing a real user would actually say. Share them with the user: *"Here are a few test cases I'd like to try. Do these look right, or do you want to add more?"*

Try the skill on each prompt. Read the transcripts (not just the final outputs) to see whether the skill is causing the model to waste effort on unhelpful steps.

## Iterating

- **Generalize from feedback.** Skills will be used many times across many prompts. Avoid overfitting to test cases. If something is stubborn, try a different metaphor or pattern rather than adding more rigid MUSTs.
- **Keep the prompt lean.** Remove instructions that do not pull their weight.
- **Explain the why.** Models follow reasoning better than rote rules.
- **Look for repeated work across test cases.** If multiple runs each independently wrote the same helper script, that is a signal to bundle it under `scripts/` and tell the skill to use it.

After improving the skill, re-run the test prompts and check that the issues are resolved without breaking earlier behavior.

## Description optimization (advanced)

The `description` field is the primary mechanism that determines whether the model invokes a skill. To optimize it:

1. Generate ~20 trigger-eval queries — a mix of should-trigger and should-not-trigger. The should-not-trigger ones should be near-misses, not obvious negatives.
2. Have the user review the eval set.
3. Iterate on the description, testing each version against both train and held-out test queries. Pick the description that performs best on the held-out set, not on train, to avoid overfitting.

## Notes

This is an adapted port of `anthropics/skills/skills/skill-creator`. The upstream version ships bundled scripts and an HTML eval viewer (`scripts/aggregate_benchmark.py`, `eval-viewer/generate_review.py`, etc.) that are not included here. For automated benchmarking infrastructure, see <https://github.com/anthropics/skills/tree/main/skills/skill-creator>.

---

**User arguments:** $ARGUMENTS
