---
name: paper-summarizer
description: Agents should invoke this skill for academic or technical papers, arXiv/PubMed/IEEE/ACM links, PDFs, methodology review, limitations, practical implications, or extracting findings for engineering decisions.
license: MIT (modified; see UPSTREAMS.json)
---

# Paper Summarizer

Extract actionable insights from academic and technical papers.

## Summary Format

```markdown
# Paper Summary: <Paper Title>

**Authors:** [Author list]
**Published:** [Journal/Conference, Date]
**Link:** [URL]
**Quality:** Peer-reviewed / Preprint / Workshop paper

## TL;DR

[1-2 sentence summary of the key contribution]

## Problem

[What problem does this paper address? Why does it matter?]

## Approach

[Methodology in plain language — what did they do?]

## Key Findings

Anchor each finding to the paper so readers can verify. Use **§** for sections, **Fig.** / **Table** when the evidence is visual or tabular.

1. **[Finding 1]:** [Description with key metrics/numbers] — *Evidence:* §[N] [section name]; [Fig. X / Table Y if applicable]
2. **[Finding 2]:** [Description] — *Evidence:* §[N] …
3. **[Finding 3]:** [Description] — *Evidence:* §[N] …

## Claim–evidence map

| # | Claim (one line) | Where in paper | Type |
|---|------------------|----------------|------|
| 1 | [Claim] | §3.2 Results, Table 2 | Empirical |
| 2 | [Claim] | §1 Introduction | Stated goal |
| 3 | [Claim] | Fig. 4 | Qualitative |

Use this table for citation-audit alignment against the project's own research notes. If the PDF has no section numbers, use **page** or **heading text** instead of §.

## Practical Implications

[What does this mean for practitioners? How can we use these findings?]
- For the current stack: [Specific applicability to Rust/TS/Python work]
- For current projects: [How this might inform current work]

## Limitations

- [Limitation 1: e.g., small sample size, specific domain]
- [Limitation 2: e.g., not replicated, theoretical only]

## Related Work

- [Paper 1] — [How it relates]
- [Paper 2] — [How it relates]

## Verdict

**Reliability:** High / Medium / Low
**Relevance to us:** High / Medium / Low
**Action:** Apply directly / Consider for future / Interesting but not actionable
```

## Process

### Step 1 — Access the Paper

- Check arXiv, PubMed, Google Scholar for open-access versions
- If behind a paywall, note this and work with the abstract and any available supplementary material
- Check for author's personal page (often has preprints)

### Step 2 — Read Strategically

1. **Abstract** — Get the overview
2. **Introduction (last paragraph)** — Usually states the contribution
3. **Figures and tables** — Often convey key results
4. **Conclusion** — Summary of findings and limitations
5. **Methodology** — If the findings are relevant enough to dig deeper

### Step 3 — Extract claims with locations

Before paraphrasing implications, list **atomic claims** the paper makes (results, bounds, contributions). For each: **section / figure / table** reference (or page). Prefer primary evidence (results section) over abstract-only restatement.

### Step 4 — Extract Practical Value

The most important question: "What can we do differently because of this paper?"

- If the answer is "nothing" — still summarize, but note low actionability
- If the answer is specific — tie each implication to a row in **Claim–evidence map** where possible

### Step 5 — Assess Reliability

| Factor | Assessment |
|---|---|
| Peer review status | Published / Preprint / Workshop |
| Replication | Replicated / Single study / Theoretical |
| Sample size | Adequate / Small / N/A |
| Methodology rigor | Strong / Moderate / Weak |
| Author credibility | Established / New / Anonymous |
| Conflicts of interest | None apparent / Funded by [X] / Vendor paper |
