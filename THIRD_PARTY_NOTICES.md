# Third-Party Notices

The repository wrapper, plugin integration, packaging, tests, and original
documentation are licensed under the root MIT `LICENSE` unless a file states
otherwise.

The skills are modified derivatives of the sources recorded in
`UPSTREAMS.json`. They are not represented as original work. Every entry
records the immutable upstream commit, source path, Git blob, license, and
adaptation type reviewed for this distribution.

## OMP Designer

The modified `ai-slop` skill derives from the MIT-licensed `LePro10/omp-designer`
repository (`skills/ai-slop.md`, condensed from ~740 to under 500 lines for the
skill-body length limit; core rubric, tests, and severity model preserved).

Copyright 2026 Leandro (LePro10). The upstream notice is available at
`LICENSES/Omp-designer-MIT.txt`.

## Firstpick pi Coding Agent Forge

The modified `code-quality`, `design-patterns`, and `paper-summarizer` skills
derive from the MIT-licensed `Firstp1ck/pi-coding-agent-forge` repository.
Persona-specific footers and cross-references to skills not shipped in this
pack were removed or generalized.

Copyright 2026 Firstpick. The upstream notice is available at
`LICENSES/Firstpick-MIT.txt`.

## Vigolium Piolium

The modified `supply-chain-risk-auditor`, `sharp-edges`, `insecure-defaults`,
`fp-check`, `vuln-report`, `agentic-actions-auditor`, `security-threat-model`,
`differential-review`, `variant-analysis`, `sarif-parsing`,
`semgrep-rule-creator`, `semgrep-rule-variant-creator`, `semgrep`, and `codeql`
skills derive from the MIT-licensed `vigolium/piolium`
repository, including their `references/`, `resources/`, and `workflows/`
support files. Frontmatter `allowed-tools` lists, an unfilled Apache-2.0
license template accidentally left in the `security-threat-model` directory,
and mentions of piolium's own multi-agent orchestration (e.g. a specific
`static-analysis:semgrep-scanner` subagent type) were removed or generalized
to host-agnostic phrasing.

Copyright 2026 Vigolium. The upstream notice is available at
`LICENSES/Piolium-MIT.txt`.

## Hugging Face Skills

The modified `hf-cli`, `hf-cloud-aws-context-discovery`, `hf-cloud-python-env-setup`,
`hf-cloud-sagemaker-deployment-planner`, `hf-cloud-sagemaker-iam-preflight`,
`hf-cloud-sagemaker-production-defaults`, `hf-cloud-serving-image-selection`,
`hf-mem`, `huggingface-best`, `huggingface-community-evals`,
`huggingface-datasets`, `huggingface-gradio`, `huggingface-llm-trainer`,
`huggingface-local-models`, `huggingface-lora-space-builder`,
`huggingface-paper-publisher`, `huggingface-papers`, `huggingface-spaces`,
`huggingface-tool-builder`, `huggingface-trackio`, `huggingface-vision-trainer`,
`huggingface-zerogpu`, `train-sentence-transformers`, `transformers-js`, and
`trl-training` skills derive from the Apache-2.0-licensed `huggingface/skills`
repository, including their `scripts/`, `references/`, `templates/`, and
`examples/` support files. Four skills (`huggingface-llm-trainer`,
`huggingface-paper-publisher`, `huggingface-vision-trainer`, `transformers-js`)
were condensed to fit this pack's skill-body length limit. Dangling
cross-references to a `hugging-face-jobs` skill not present in the upstream
snapshot were generalized to describe the underlying `hf jobs` CLI/API
directly.

Copyright 2026 Hugging Face. Licensed under Apache-2.0. The full license is
available at `LICENSES/Apache-2.0.txt`.

## Anthropic Official Plugins

The following modified skills derive from Apache-2.0 material in
`anthropics/claude-plugins-official`:

- `agents-md-improver`
- `agents-md-revise`
- `code-architect`
- `code-explorer`
- `code-review`
- `code-reviewer`
- `feature-dev`
- `frontend-design`

Copyright 2026 Anthropic, PBC. Licensed under Apache-2.0. The full license is
available at `LICENSES/Apache-2.0.txt`.

## Anthropic Skills

The modified `mcp-builder` and `skill-creator` skills derive from Apache-2.0
material in `anthropics/skills`.

Copyright 2026 Anthropic, PBC. Licensed under Apache-2.0. The full license is
available at `LICENSES/Apache-2.0.txt`.

## Anthropic Security Review

The modified `security-review` skill derives from the MIT-licensed
`anthropics/claude-code-security-review` repository.

Copyright 2025 Anthropic. The upstream notice is available at
`LICENSES/Anthropic-security-review-MIT.txt`.

## Superpowers OpenCode Plugin Pattern

The skill-path registration pattern in `.opencode/plugins/opencode-power-pack.js`
is adapted from the MIT-licensed `obra/superpowers` OpenCode plugin.

Copyright 2025 Jesse Vincent. The upstream notice is available at
`LICENSES/Superpowers-MIT.txt`.

## Modification Notice

All listed skills were changed for OpenCode compatibility, consolidated into
the `SKILL.md` format, and may include additional local workflow, validation,
or safety guidance. Consult Git history for the exact local changes.
