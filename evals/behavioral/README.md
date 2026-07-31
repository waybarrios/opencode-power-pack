# Behavioral Evaluations

These evaluations are contributor infrastructure, not a guarantee that every model follows every workflow.

## Offline Replay

Run `npm test`. Replay requires no model, network, or credentials and rejects stale skill or case hashes.

## Live Run

Run `OPENCODE_EVAL_MODEL=provider/model npm run eval:behavioral` from a source checkout. The runner uses an empty temporary project, denies model-facing tools, and writes only a redacted report to `.artifacts/behavioral-evals/latest.json`.

## Review And Acceptance

Review the report for complete case coverage, passing oracles, and redaction. Then run `npm run eval:behavioral:accept`. Acceptance is explicit, deterministic, and unavailable for failed, incomplete, stale, duplicate, or partial reports.

## Safety

Fixtures contain only clearly fictitious `sk-eval-*` values. Do not add real credentials, private repository content, raw OpenCode events, or user-project paths to cases, reports, or snapshots.
