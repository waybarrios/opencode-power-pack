# OpenCode Power Pack: Complete Skill Reference

> Purpose, audience, profile membership, dependencies, install command, invocation, and source link for all 54 skills in v0.5.0.

Canonical HTML browser: https://skills.waybarrios.com/docs/skills/

Install any skill at user scope with `npx @waybarrios/opencode-power-pack install <skill-id>`. Add `--project` for repository-local scope or `--dry-run` to preview the resolved changes.

Required companion skills are installed automatically. Invoke an installed workflow as `$<skill-id>` in Codex, `/<skill-id>` in OpenCode, or `/opencode-power-pack:<skill-id>` in Claude Code.

## Core and authoring skills (14)

### agents-md-improver

Audit and improve project-rules files (AGENTS.md, CLAUDE.md, .agents/instructions, local overrides) so the agent keeps accurate project context. Use when the user asks to check, audit, review, update, improve, or fix their AGENTS.md or CLAUDE.md, mentions "project rules maintenance" or "agent context optimization", or when the codebase has changed enough that the rules file may be stale. Scans the repository for every rules file, grades each against a quality rubric, outputs a quality report, and applies targeted edits only after user approval.

- Profiles: `recommended`, `project-memory`
- Automatic companions: None
- Install: `npx @waybarrios/opencode-power-pack install agents-md-improver`
- Codex: `$agents-md-improver`
- OpenCode: `/agents-md-improver`
- Claude Code: `/opencode-power-pack:agents-md-improver`
- HTML details: https://skills.waybarrios.com/docs/skills/#agents-md-improver
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/agents-md-improver

### agents-md-revise

Capture learnings from the current session into the project-rules file (AGENTS.md, CLAUDE.md, or local override) so future sessions benefit. Use when the user says "revise the rules", "update AGENTS.md / CLAUDE.md with what we just learned", "save this to project memory", "remember this for next time", or at the end of a productive session when valuable context has emerged that is not yet documented. This complements agents-md-improver; improver audits, while this one captures.

- Profiles: `recommended`, `project-memory`
- Automatic companions: `agents-md-improver`
- Install: `npx @waybarrios/opencode-power-pack install agents-md-revise`
- Codex: `$agents-md-revise`
- OpenCode: `/agents-md-revise`
- Claude Code: `/opencode-power-pack:agents-md-revise`
- HTML details: https://skills.waybarrios.com/docs/skills/#agents-md-revise
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/agents-md-revise

### ai-slop

Operational rubric that turns "don't make AI slop" into observable properties, severity levels, evidence requirements, and repair actions for interface design. Use as the reference rubric when building or reviewing marketing sites, product interfaces, dashboards, portfolios, or e-commerce pages, especially alongside frontend-design.

- Profiles: `frontend`
- Automatic companions: None
- Install: `npx @waybarrios/opencode-power-pack install ai-slop`
- Codex: `$ai-slop`
- OpenCode: `/ai-slop`
- Claude Code: `/opencode-power-pack:ai-slop`
- HTML details: https://skills.waybarrios.com/docs/skills/#ai-slop
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/ai-slop

### code-architect

Design a feature architecture by analyzing existing codebase patterns and conventions, then provide a comprehensive implementation blueprint with specific files to create or modify, component designs, data flows, and a build sequence. Use this skill when the user asks for an architecture design, an implementation plan for a non-trivial feature, or when dispatched as a sub-task during feature-dev architecture phase.

- Profiles: `recommended`, `feature-dev`
- Automatic companions: None
- Install: `npx @waybarrios/opencode-power-pack install code-architect`
- Codex: `$code-architect`
- OpenCode: `/code-architect`
- Claude Code: `/opencode-power-pack:code-architect`
- HTML details: https://skills.waybarrios.com/docs/skills/#code-architect
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/code-architect

### code-explorer

Deeply analyze an existing codebase feature by tracing execution paths, mapping architecture layers, understanding patterns and abstractions, and documenting dependencies. Use this skill when you need to understand how a feature works before modifying or extending it, when dispatched as a sub-task during feature-dev exploration, or when the user asks "how does X work in this codebase".

- Profiles: `recommended`, `feature-dev`
- Automatic companions: None
- Install: `npx @waybarrios/opencode-power-pack install code-explorer`
- Codex: `$code-explorer`
- OpenCode: `/code-explorer`
- Claude Code: `/opencode-power-pack:code-explorer`
- HTML details: https://skills.waybarrios.com/docs/skills/#code-explorer
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/code-explorer

### code-quality

Agents should invoke this skill for code reviews, linting/formatting setup, maintainability checks, complexity concerns, warning cleanup, coding standards, or quality gates in Rust, TypeScript, Python, shell, and mixed repos.

- Profiles: `recommended`, `review`
- Automatic companions: None
- Install: `npx @waybarrios/opencode-power-pack install code-quality`
- Codex: `$code-quality`
- OpenCode: `/code-quality`
- Claude Code: `/opencode-power-pack:code-quality`
- HTML details: https://skills.waybarrios.com/docs/skills/#code-quality
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/code-quality

### code-review

Review a pull request or a set of code changes for bugs, logic errors, and project-convention violations using a confidence-filtered, multi-agent process. Use this skill when the user asks to review a PR, audit pending changes, or inspect a diff for problems before merging.

- Profiles: `recommended`, `review`
- Automatic companions: None
- Install: `npx @waybarrios/opencode-power-pack install code-review`
- Codex: `$code-review`
- OpenCode: `/code-review`
- Claude Code: `/opencode-power-pack:code-review`
- HTML details: https://skills.waybarrios.com/docs/skills/#code-review
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/code-review

### code-reviewer

Review code for bugs, logic errors, security vulnerabilities, code quality issues, and adherence to project conventions, using confidence-based filtering to report only high-priority issues that truly matter. Use this skill when reviewing a small set of changes locally (such as unstaged diff), when dispatched as a sub-task during feature-dev quality review, or when the user wants a critique of a specific file or function.

- Profiles: `recommended`, `review`, `feature-dev`
- Automatic companions: None
- Install: `npx @waybarrios/opencode-power-pack install code-reviewer`
- Codex: `$code-reviewer`
- OpenCode: `/code-reviewer`
- Claude Code: `/opencode-power-pack:code-reviewer`
- HTML details: https://skills.waybarrios.com/docs/skills/#code-reviewer
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/code-reviewer

### design-patterns

Agents should invoke this skill when choosing patterns, designing traits/interfaces/components, deciding abstraction boundaries, evaluating dependency injection/callbacks, or comparing implementation approaches in Rust, TypeScript/React, or Django/Python.

- Profiles: None
- Automatic companions: None
- Install: `npx @waybarrios/opencode-power-pack install design-patterns`
- Codex: `$design-patterns`
- OpenCode: `/design-patterns`
- Claude Code: `/opencode-power-pack:design-patterns`
- HTML details: https://skills.waybarrios.com/docs/skills/#design-patterns
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/design-patterns

### feature-dev

Guide a feature implementation through a structured seven-phase workflow with deep codebase understanding, clarifying questions, parallel architecture design, and quality review. Use this skill when the user asks to build a new feature, add functionality, or wants a methodical approach to implementation rather than diving straight to code.

- Profiles: `recommended`, `feature-dev`
- Automatic companions: `code-architect`, `code-explorer`, `code-reviewer`
- Install: `npx @waybarrios/opencode-power-pack install feature-dev`
- Codex: `$feature-dev`
- OpenCode: `/feature-dev`
- Claude Code: `/opencode-power-pack:feature-dev`
- HTML details: https://skills.waybarrios.com/docs/skills/#feature-dev
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/feature-dev

### frontend-design

Create distinctive, production-grade frontend interfaces with high design quality and accessible markup. Use this skill when the user asks to build or beautify web components, pages, applications, landing pages, dashboards, artifacts, or React/HTML/CSS UI. Generates creative, polished code that avoids generic AI aesthetics, then self-checks it against an objective accessibility and quality rubric.

- Profiles: `recommended`, `frontend`
- Automatic companions: None
- Install: `npx @waybarrios/opencode-power-pack install frontend-design`
- Codex: `$frontend-design`
- OpenCode: `/frontend-design`
- Claude Code: `/opencode-power-pack:frontend-design`
- HTML details: https://skills.waybarrios.com/docs/skills/#frontend-design
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/frontend-design

### mcp-builder

Guide the creation of high-quality MCP (Model Context Protocol) servers that enable LLMs to interact with external services through well-designed tools. Use when the user wants to build an MCP server to integrate an external API or service, whether in Python (FastMCP) or Node/TypeScript (MCP SDK).

- Profiles: `recommended`, `authoring`
- Automatic companions: None
- Install: `npx @waybarrios/opencode-power-pack install mcp-builder`
- Codex: `$mcp-builder`
- OpenCode: `/mcp-builder`
- Claude Code: `/opencode-power-pack:mcp-builder`
- HTML details: https://skills.waybarrios.com/docs/skills/#mcp-builder
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/mcp-builder

### paper-summarizer

Agents should invoke this skill for academic or technical papers, arXiv/PubMed/IEEE/ACM links, PDFs, methodology review, limitations, practical implications, or extracting findings for engineering decisions.

- Profiles: `authoring`
- Automatic companions: None
- Install: `npx @waybarrios/opencode-power-pack install paper-summarizer`
- Codex: `$paper-summarizer`
- OpenCode: `/paper-summarizer`
- Claude Code: `/opencode-power-pack:paper-summarizer`
- HTML details: https://skills.waybarrios.com/docs/skills/#paper-summarizer
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/paper-summarizer

### skill-creator

Create new skills (SKILL.md files), modify and improve existing skills, and design skill descriptions for accurate triggering. Use when the user wants to create a new skill from scratch, edit an existing skill, optimize a skill's description, or convert a workflow they just demonstrated into a reusable skill.

- Profiles: `recommended`, `authoring`
- Automatic companions: None
- Install: `npx @waybarrios/opencode-power-pack install skill-creator`
- Codex: `$skill-creator`
- OpenCode: `/skill-creator`
- Claude Code: `/opencode-power-pack:skill-creator`
- HTML details: https://skills.waybarrios.com/docs/skills/#skill-creator
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/skill-creator

## Security skills (15)

### agentic-actions-auditor

Audit GitHub Actions that run AI agents for prompt injection, unsafe interpolation, sandbox gaps, and permissive actor rules. Use for agentic CI workflows, not general application code review.

- Profiles: `security`
- Automatic companions: None
- Install: `npx @waybarrios/opencode-power-pack install agentic-actions-auditor`
- Codex: `$agentic-actions-auditor`
- OpenCode: `/agentic-actions-auditor`
- Claude Code: `/opencode-power-pack:agentic-actions-auditor`
- HTML details: https://skills.waybarrios.com/docs/skills/#agentic-actions-auditor
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/agentic-actions-auditor

### codeql

Run CodeQL database creation and security queries, add data-extension models, or process CodeQL SARIF. Use when CodeQL is explicitly requested; use security-review for a broader manual security review.

- Profiles: `security`
- Automatic companions: None
- Install: `npx @waybarrios/opencode-power-pack install codeql`
- Codex: `$codeql`
- OpenCode: `/codeql`
- Claude Code: `/opencode-power-pack:codeql`
- HTML details: https://skills.waybarrios.com/docs/skills/#codeql
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/codeql

### differential-review

Performs security-focused differential review of code changes (PRs, commits, diffs). Adapts analysis depth to codebase size, uses git history for context, calculates blast radius, checks test coverage, and generates comprehensive markdown reports. Automatically detects and prevents security regressions.

- Profiles: `review`, `security`
- Automatic companions: None
- Install: `npx @waybarrios/opencode-power-pack install differential-review`
- Codex: `$differential-review`
- OpenCode: `/differential-review`
- Claude Code: `/opencode-power-pack:differential-review`
- HTML details: https://skills.waybarrios.com/docs/skills/#differential-review
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/differential-review

### fp-check

Systematically verifies suspected security bugs to eliminate false positives. Produces TRUE POSITIVE or FALSE POSITIVE verdicts with documented evidence for each bug.

- Profiles: `security`
- Automatic companions: None
- Install: `npx @waybarrios/opencode-power-pack install fp-check`
- Codex: `$fp-check`
- OpenCode: `/fp-check`
- Claude Code: `/opencode-power-pack:fp-check`
- HTML details: https://skills.waybarrios.com/docs/skills/#fp-check
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/fp-check

### insecure-defaults

Detects fail-open insecure defaults (hardcoded secrets, weak auth, permissive security) that allow apps to run insecurely in production. Use when auditing security, reviewing config management, or analyzing environment variable handling.

- Profiles: `security`
- Automatic companions: None
- Install: `npx @waybarrios/opencode-power-pack install insecure-defaults`
- Codex: `$insecure-defaults`
- OpenCode: `/insecure-defaults`
- Claude Code: `/opencode-power-pack:insecure-defaults`
- HTML details: https://skills.waybarrios.com/docs/skills/#insecure-defaults
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/insecure-defaults

### sarif-parsing

Parses and processes SARIF files from static analysis tools like CodeQL, Semgrep, or other scanners. Triggers on \"parse sarif\", \"read scan results\", \"aggregate findings\", \"deduplicate alerts\", or \"process sarif output\". Handles filtering, deduplication, format conversion, and CI/CD integration of SARIF data. Does NOT run scans; use the Semgrep or CodeQL skills for that.

- Profiles: `security`
- Automatic companions: None
- Install: `npx @waybarrios/opencode-power-pack install sarif-parsing`
- Codex: `$sarif-parsing`
- OpenCode: `/sarif-parsing`
- Claude Code: `/opencode-power-pack:sarif-parsing`
- HTML details: https://skills.waybarrios.com/docs/skills/#sarif-parsing
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/sarif-parsing

### security-review

Perform a focused security review of pending git changes to identify high-confidence security vulnerabilities with real exploitation potential. Use this skill when the user asks for a security review, security audit, vulnerability scan, or wants to check pending changes on a branch for security issues before merging. This is NOT a general code review.

- Profiles: `security`
- Automatic companions: None
- Install: `npx @waybarrios/opencode-power-pack install security-review`
- Codex: `$security-review`
- OpenCode: `/security-review`
- Claude Code: `/opencode-power-pack:security-review`
- HTML details: https://skills.waybarrios.com/docs/skills/#security-review
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/security-review

### security-threat-model

Create a repository-grounded AppSec threat model covering assets, trust boundaries, attackers, abuse paths, and mitigations. Use only for explicit threat-modeling requests, not general architecture or code review.

- Profiles: `security`
- Automatic companions: None
- Install: `npx @waybarrios/opencode-power-pack install security-threat-model`
- Codex: `$security-threat-model`
- OpenCode: `/security-threat-model`
- Claude Code: `/opencode-power-pack:security-threat-model`
- HTML details: https://skills.waybarrios.com/docs/skills/#security-threat-model
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/security-threat-model

### semgrep

Run Semgrep static analysis across a codebase, optionally using Semgrep Pro for cross-file taint analysis. Use when Semgrep or a static-analysis scan is requested; use security-review for a manual audit.

- Profiles: `security`
- Automatic companions: None
- Install: `npx @waybarrios/opencode-power-pack install semgrep`
- Codex: `$semgrep`
- OpenCode: `/semgrep`
- Claude Code: `/opencode-power-pack:semgrep`
- HTML details: https://skills.waybarrios.com/docs/skills/#semgrep
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/semgrep

### semgrep-rule-creator

Creates custom Semgrep rules for detecting security vulnerabilities, bug patterns, and code patterns. Use when writing Semgrep rules or building custom static analysis detections.

- Profiles: `security`
- Automatic companions: None
- Install: `npx @waybarrios/opencode-power-pack install semgrep-rule-creator`
- Codex: `$semgrep-rule-creator`
- OpenCode: `/semgrep-rule-creator`
- Claude Code: `/opencode-power-pack:semgrep-rule-creator`
- HTML details: https://skills.waybarrios.com/docs/skills/#semgrep-rule-creator
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/semgrep-rule-creator

### semgrep-rule-variant-creator

Creates language variants of existing Semgrep rules. Use when porting a Semgrep rule to specified target languages. Takes an existing rule and target languages as input, produces independent rule+test directories for each language.

- Profiles: `security`
- Automatic companions: `semgrep-rule-creator`
- Install: `npx @waybarrios/opencode-power-pack install semgrep-rule-variant-creator`
- Codex: `$semgrep-rule-variant-creator`
- OpenCode: `/semgrep-rule-variant-creator`
- Claude Code: `/opencode-power-pack:semgrep-rule-variant-creator`
- HTML details: https://skills.waybarrios.com/docs/skills/#semgrep-rule-variant-creator
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/semgrep-rule-variant-creator

### sharp-edges

Identify error-prone APIs, dangerous configuration, and footgun designs that enable security mistakes. Use for API ergonomics, misuse resistance, secure defaults, or pit-of-success reviews; use code-review for general defects.

- Profiles: `security`
- Automatic companions: None
- Install: `npx @waybarrios/opencode-power-pack install sharp-edges`
- Codex: `$sharp-edges`
- OpenCode: `/sharp-edges`
- Claude Code: `/opencode-power-pack:sharp-edges`
- HTML details: https://skills.waybarrios.com/docs/skills/#sharp-edges
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/sharp-edges

### supply-chain-risk-auditor

Identifies dependencies at heightened risk of exploitation or takeover. Use when assessing supply chain attack surface, evaluating dependency health, or scoping security engagements.

- Profiles: `security`
- Automatic companions: None
- Install: `npx @waybarrios/opencode-power-pack install supply-chain-risk-auditor`
- Codex: `$supply-chain-risk-auditor`
- OpenCode: `/supply-chain-risk-auditor`
- Claude Code: `/opencode-power-pack:supply-chain-risk-auditor`
- HTML details: https://skills.waybarrios.com/docs/skills/#supply-chain-risk-auditor
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/supply-chain-risk-auditor

### variant-analysis

Find similar vulnerabilities and bugs across codebases using pattern-based analysis. Use when hunting bug variants, building CodeQL/Semgrep queries, analyzing security vulnerabilities, or performing systematic code audits after finding an initial issue.

- Profiles: `security`
- Automatic companions: None
- Install: `npx @waybarrios/opencode-power-pack install variant-analysis`
- Codex: `$variant-analysis`
- OpenCode: `/variant-analysis`
- Claude Code: `/opencode-power-pack:variant-analysis`
- HTML details: https://skills.waybarrios.com/docs/skills/#variant-analysis
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/variant-analysis

### vuln-report

Turn one confirmed security finding into a disclosure-ready GitHub advisory with root cause, proof of concept, impact, and source evidence. Use for reporting an established vulnerability, not discovering or validating one.

- Profiles: `security`
- Automatic companions: None
- Install: `npx @waybarrios/opencode-power-pack install vuln-report`
- Codex: `$vuln-report`
- OpenCode: `/vuln-report`
- Claude Code: `/opencode-power-pack:vuln-report`
- HTML details: https://skills.waybarrios.com/docs/skills/#vuln-report
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/vuln-report

## ML and Hugging Face skills (25)

### hf-cli

Use the `hf` CLI for Hub authentication, downloads, uploads, repositories, cache, jobs, buckets, webhooks, and endpoint administration. Use for CLI operations, not model recommendations, paper analysis, training design, or building a Space.

- Profiles: `huggingface`
- Automatic companions: None
- Install: `npx @waybarrios/opencode-power-pack install hf-cli`
- Codex: `$hf-cli`
- OpenCode: `/hf-cli`
- Claude Code: `/opencode-power-pack:hf-cli`
- HTML details: https://skills.waybarrios.com/docs/skills/#hf-cli
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/hf-cli

### hf-cloud-aws-context-discovery

Discover the active AWS profile, region, account, and caller identity before SageMaker or AWS work. Use when local AWS context is needed or unspecified; do not use for cloud-agnostic model planning.

- Profiles: `huggingface`
- Automatic companions: None
- Install: `npx @waybarrios/opencode-power-pack install hf-cloud-aws-context-discovery`
- Codex: `$hf-cloud-aws-context-discovery`
- OpenCode: `/hf-cloud-aws-context-discovery`
- Claude Code: `/opencode-power-pack:hf-cloud-aws-context-discovery`
- HTML details: https://skills.waybarrios.com/docs/skills/#hf-cloud-aws-context-discovery
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/hf-cloud-aws-context-discovery

### hf-cloud-python-env-setup

Create an isolated Python environment with a compatible Python version and boto3 for SageMaker or AWS automation. Use before executing AWS Python code; do not use for general Python environment setup.

- Profiles: `huggingface`
- Automatic companions: None
- Install: `npx @waybarrios/opencode-power-pack install hf-cloud-python-env-setup`
- Codex: `$hf-cloud-python-env-setup`
- OpenCode: `/hf-cloud-python-env-setup`
- Claude Code: `/opencode-power-pack:hf-cloud-python-env-setup`
- HTML details: https://skills.waybarrios.com/docs/skills/#hf-cloud-python-env-setup
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/hf-cloud-python-env-setup

### hf-cloud-sagemaker-deployment-planner

Plan and coordinate a model deployment to Amazon SageMaker, including serving stack and real-time versus async inference. Use as the entry point for SageMaker hosting requests, before image, IAM, and endpoint implementation skills.

- Profiles: `huggingface`
- Automatic companions: `hf-cloud-aws-context-discovery`, `hf-cloud-python-env-setup`, `hf-cloud-sagemaker-iam-preflight`, `hf-cloud-serving-image-selection`, `hf-cloud-sagemaker-production-defaults`
- Install: `npx @waybarrios/opencode-power-pack install hf-cloud-sagemaker-deployment-planner`
- Codex: `$hf-cloud-sagemaker-deployment-planner`
- OpenCode: `/hf-cloud-sagemaker-deployment-planner`
- Claude Code: `/opencode-power-pack:hf-cloud-sagemaker-deployment-planner`
- HTML details: https://skills.waybarrios.com/docs/skills/#hf-cloud-sagemaker-deployment-planner
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/hf-cloud-sagemaker-deployment-planner

### hf-cloud-sagemaker-iam-preflight

Verify or select a SageMaker execution role before creating models, endpoints, or training jobs. Use when a role ARN is missing or IAM access fails; inspect existing roles before proposing role creation.

- Profiles: `huggingface`
- Automatic companions: None
- Install: `npx @waybarrios/opencode-power-pack install hf-cloud-sagemaker-iam-preflight`
- Codex: `$hf-cloud-sagemaker-iam-preflight`
- OpenCode: `/hf-cloud-sagemaker-iam-preflight`
- Claude Code: `/opencode-power-pack:hf-cloud-sagemaker-iam-preflight`
- HTML details: https://skills.waybarrios.com/docs/skills/#hf-cloud-sagemaker-iam-preflight
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/hf-cloud-sagemaker-iam-preflight

### hf-cloud-sagemaker-production-defaults

Implement a production SageMaker endpoint with autoscaling, CloudWatch alarms, and tags. Use after the serving image and IAM role are known; use the deployment planner first when architecture is undecided.

- Profiles: `huggingface`
- Automatic companions: None
- Install: `npx @waybarrios/opencode-power-pack install hf-cloud-sagemaker-production-defaults`
- Codex: `$hf-cloud-sagemaker-production-defaults`
- OpenCode: `/hf-cloud-sagemaker-production-defaults`
- Claude Code: `/opencode-power-pack:hf-cloud-sagemaker-production-defaults`
- HTML details: https://skills.waybarrios.com/docs/skills/#hf-cloud-sagemaker-production-defaults
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/hf-cloud-sagemaker-production-defaults

### hf-cloud-serving-image-selection

Select and verify the current region-specific serving container URI for a SageMaker model deployment. Use after the deployment pathway is chosen and before endpoint code; never infer an image URI from memory.

- Profiles: `huggingface`
- Automatic companions: None
- Install: `npx @waybarrios/opencode-power-pack install hf-cloud-serving-image-selection`
- Codex: `$hf-cloud-serving-image-selection`
- OpenCode: `/hf-cloud-serving-image-selection`
- Claude Code: `/opencode-power-pack:hf-cloud-serving-image-selection`
- HTML details: https://skills.waybarrios.com/docs/skills/#hf-cloud-serving-image-selection
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/hf-cloud-serving-image-selection

### hf-mem

Hugging Face CLI to estimate the required memory to load Safetensors or GGUF model weights for inference from the Hugging Face Hub.

- Profiles: `huggingface`
- Automatic companions: None
- Install: `npx @waybarrios/opencode-power-pack install hf-mem`
- Codex: `$hf-mem`
- OpenCode: `/hf-mem`
- Claude Code: `/opencode-power-pack:hf-mem`
- HTML details: https://skills.waybarrios.com/docs/skills/#hf-mem
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/hf-mem

### huggingface-best

Find and compare recommended Hugging Face models for a task using benchmarks, model size, and device constraints. Use for model selection questions; use huggingface-local-models for GGUF setup and hf-cli for Hub operations.

- Profiles: `huggingface`
- Automatic companions: None
- Install: `npx @waybarrios/opencode-power-pack install huggingface-best`
- Codex: `$huggingface-best`
- OpenCode: `/huggingface-best`
- Claude Code: `/opencode-power-pack:huggingface-best`
- HTML details: https://skills.waybarrios.com/docs/skills/#huggingface-best
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/huggingface-best

### huggingface-community-evals

Run evaluations for Hugging Face Hub models using inspect-ai and lighteval on local hardware. Use for backend selection, local GPU evals, and choosing between vLLM / Transformers / accelerate. Not for HF Jobs orchestration, model-card PRs, .eval_results publication, or community-evals automation.

- Profiles: `huggingface`
- Automatic companions: None
- Install: `npx @waybarrios/opencode-power-pack install huggingface-community-evals`
- Codex: `$huggingface-community-evals`
- OpenCode: `/huggingface-community-evals`
- Claude Code: `/opencode-power-pack:huggingface-community-evals`
- HTML details: https://skills.waybarrios.com/docs/skills/#huggingface-community-evals
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/huggingface-community-evals

### huggingface-datasets

Use this skill for Hugging Face Dataset Viewer API workflows that fetch subset/split metadata, paginate rows, search text, apply filters, download parquet URLs, and read size or statistics.

- Profiles: `huggingface`
- Automatic companions: None
- Install: `npx @waybarrios/opencode-power-pack install huggingface-datasets`
- Codex: `$huggingface-datasets`
- OpenCode: `/huggingface-datasets`
- Claude Code: `/opencode-power-pack:huggingface-datasets`
- HTML details: https://skills.waybarrios.com/docs/skills/#huggingface-datasets
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/huggingface-datasets

### huggingface-gradio

Build Gradio web UIs and demos in Python. Use when creating or editing Gradio apps, components, event listeners, layouts, or chatbots.

- Profiles: `huggingface`
- Automatic companions: None
- Install: `npx @waybarrios/opencode-power-pack install huggingface-gradio`
- Codex: `$huggingface-gradio`
- OpenCode: `/huggingface-gradio`
- Claude Code: `/opencode-power-pack:huggingface-gradio`
- HTML details: https://skills.waybarrios.com/docs/skills/#huggingface-gradio
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/huggingface-gradio

### huggingface-llm-trainer

Train or fine-tune language models with TRL or Unsloth on Hugging Face Jobs, including SFT, DPO, GRPO, reward models, and GGUF conversion. Use for cloud LLM training; use huggingface-vision-trainer for vision tasks.

- Profiles: `huggingface`
- Automatic companions: None
- Install: `npx @waybarrios/opencode-power-pack install huggingface-llm-trainer`
- Codex: `$huggingface-llm-trainer`
- OpenCode: `/huggingface-llm-trainer`
- Claude Code: `/opencode-power-pack:huggingface-llm-trainer`
- HTML details: https://skills.waybarrios.com/docs/skills/#huggingface-llm-trainer
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/huggingface-llm-trainer

### huggingface-local-models

Use to select models to run locally with llama.cpp and GGUF on CPU, Mac Metal, CUDA, or ROCm. Covers finding GGUFs, quant selection, running servers, exact GGUF file lookup, conversion, and OpenAI-compatible local serving.

- Profiles: `huggingface`
- Automatic companions: None
- Install: `npx @waybarrios/opencode-power-pack install huggingface-local-models`
- Codex: `$huggingface-local-models`
- OpenCode: `/huggingface-local-models`
- Claude Code: `/opencode-power-pack:huggingface-local-models`
- HTML details: https://skills.waybarrios.com/docs/skills/#huggingface-local-models
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/huggingface-local-models

### huggingface-lora-space-builder

Build and publish a Gradio Hugging Face Space for a user-provided image or video LoRA, including pipeline selection and model-card settings. Use for LoRA demos; use huggingface-spaces for general Space work.

- Profiles: `huggingface`
- Automatic companions: None
- Install: `npx @waybarrios/opencode-power-pack install huggingface-lora-space-builder`
- Codex: `$huggingface-lora-space-builder`
- OpenCode: `/huggingface-lora-space-builder`
- Claude Code: `/opencode-power-pack:huggingface-lora-space-builder`
- HTML details: https://skills.waybarrios.com/docs/skills/#huggingface-lora-space-builder
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/huggingface-lora-space-builder

### huggingface-paper-publisher

Publish and manage research papers on Hugging Face Hub. Supports creating paper pages, linking papers to models/datasets, claiming authorship, and generating professional markdown-based research articles.

- Profiles: `huggingface`
- Automatic companions: None
- Install: `npx @waybarrios/opencode-power-pack install huggingface-paper-publisher`
- Codex: `$huggingface-paper-publisher`
- OpenCode: `/huggingface-paper-publisher`
- Claude Code: `/opencode-power-pack:huggingface-paper-publisher`
- HTML details: https://skills.waybarrios.com/docs/skills/#huggingface-paper-publisher
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/huggingface-paper-publisher

### huggingface-papers

Look up and read Hugging Face paper pages in markdown, and use the papers API for structured metadata such as authors, linked models/datasets/spaces, Github repo and project page. Use when the user shares a Hugging Face paper page URL, an arXiv URL or ID, or asks to summarize, explain, or analyze an AI research paper.

- Profiles: `huggingface`
- Automatic companions: None
- Install: `npx @waybarrios/opencode-power-pack install huggingface-papers`
- Codex: `$huggingface-papers`
- OpenCode: `/huggingface-papers`
- Claude Code: `/opencode-power-pack:huggingface-papers`
- HTML details: https://skills.waybarrios.com/docs/skills/#huggingface-papers
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/huggingface-papers

### huggingface-spaces

Build, deploy, debug, or maintain a Hugging Face Space using Gradio, Docker, or Static SDKs. Use for general Space hosting and configuration; use huggingface-zerogpu for ZeroGPU runtime constraints and lora-space-builder for LoRA demos.

- Profiles: `huggingface`
- Automatic companions: None
- Install: `npx @waybarrios/opencode-power-pack install huggingface-spaces`
- Codex: `$huggingface-spaces`
- OpenCode: `/huggingface-spaces`
- Claude Code: `/opencode-power-pack:huggingface-spaces`
- HTML details: https://skills.waybarrios.com/docs/skills/#huggingface-spaces
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/huggingface-spaces

### huggingface-tool-builder

Use this skill when the user wants to build tool/scripts or achieve a task where using data from the Hugging Face API would help. This is especially useful when chaining or combining API calls or the task will be repeated/automated. This Skill creates a reusable script to fetch, enrich or process data.

- Profiles: `huggingface`
- Automatic companions: None
- Install: `npx @waybarrios/opencode-power-pack install huggingface-tool-builder`
- Codex: `$huggingface-tool-builder`
- OpenCode: `/huggingface-tool-builder`
- Claude Code: `/opencode-power-pack:huggingface-tool-builder`
- HTML details: https://skills.waybarrios.com/docs/skills/#huggingface-tool-builder
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/huggingface-tool-builder

### huggingface-trackio

Track and visualize ML training experiments with Trackio. Use when logging metrics during training (Python API), firing alerts for training diagnostics, or retrieving/analyzing logged metrics (CLI). Supports real-time dashboard visualization, alerts with webhooks, HF Space syncing, and JSON output for automation.

- Profiles: `huggingface`
- Automatic companions: None
- Install: `npx @waybarrios/opencode-power-pack install huggingface-trackio`
- Codex: `$huggingface-trackio`
- OpenCode: `/huggingface-trackio`
- Claude Code: `/opencode-power-pack:huggingface-trackio`
- HTML details: https://skills.waybarrios.com/docs/skills/#huggingface-trackio
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/huggingface-trackio

### huggingface-vision-trainer

Train object-detection, image-classification, or SAM segmentation models on Hugging Face Jobs. Use for vision fine-tuning and evaluation; use huggingface-llm-trainer for language models.

- Profiles: `huggingface`
- Automatic companions: None
- Install: `npx @waybarrios/opencode-power-pack install huggingface-vision-trainer`
- Codex: `$huggingface-vision-trainer`
- OpenCode: `/huggingface-vision-trainer`
- Claude Code: `/opencode-power-pack:huggingface-vision-trainer`
- HTML details: https://skills.waybarrios.com/docs/skills/#huggingface-vision-trainer
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/huggingface-vision-trainer

### huggingface-zerogpu

Implement or debug Hugging Face Spaces ZeroGPU code using `@spaces.GPU`, including isolation, state, duration, sizing, and CUDA-wheel constraints. Use for ZeroGPU-specific behavior; use huggingface-spaces for general hosting.

- Profiles: `huggingface`
- Automatic companions: None
- Install: `npx @waybarrios/opencode-power-pack install huggingface-zerogpu`
- Codex: `$huggingface-zerogpu`
- OpenCode: `/huggingface-zerogpu`
- Claude Code: `/opencode-power-pack:huggingface-zerogpu`
- HTML details: https://skills.waybarrios.com/docs/skills/#huggingface-zerogpu
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/huggingface-zerogpu

### train-sentence-transformers

Train or fine-tune SentenceTransformer bi-encoders, CrossEncoder rerankers, or SparseEncoder models, including losses, negatives, evaluation, distillation, LoRA, and Matryoshka. Use for sentence-transformers training tasks.

- Profiles: `huggingface`
- Automatic companions: None
- Install: `npx @waybarrios/opencode-power-pack install train-sentence-transformers`
- Codex: `$train-sentence-transformers`
- OpenCode: `/train-sentence-transformers`
- Claude Code: `/opencode-power-pack:train-sentence-transformers`
- HTML details: https://skills.waybarrios.com/docs/skills/#train-sentence-transformers
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/train-sentence-transformers

### transformers-js

Run Hugging Face models in JavaScript or TypeScript with Transformers.js, WebGPU, or WASM across browser, Node.js, Bun, and Deno. Use for client-side or JS-runtime inference, not Python training.

- Profiles: `huggingface`
- Automatic companions: None
- Install: `npx @waybarrios/opencode-power-pack install transformers-js`
- Codex: `$transformers-js`
- OpenCode: `/transformers-js`
- Claude Code: `/opencode-power-pack:transformers-js`
- HTML details: https://skills.waybarrios.com/docs/skills/#transformers-js
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/transformers-js

### trl-training

Train and fine-tune transformer language models using TRL (Transformers Reinforcement Learning). Supports SFT, DPO, GRPO, KTO, RLOO and Reward Model training via CLI commands.

- Profiles: `huggingface`
- Automatic companions: None
- Install: `npx @waybarrios/opencode-power-pack install trl-training`
- Codex: `$trl-training`
- OpenCode: `/trl-training`
- Claude Code: `/opencode-power-pack:trl-training`
- HTML details: https://skills.waybarrios.com/docs/skills/#trl-training
- Source: https://github.com/waybarrios/opencode-power-pack/tree/main/skills/trl-training
