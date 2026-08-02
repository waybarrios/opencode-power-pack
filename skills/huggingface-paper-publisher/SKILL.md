---
name: huggingface-paper-publisher
description: Publish and manage research papers on Hugging Face Hub. Supports creating paper pages, linking papers to models/datasets, claiming authorship, and generating professional markdown-based research articles.
license: Apache-2.0 (modified; see UPSTREAMS.json)
---

# Overview

Publish, manage, and link research papers on the Hugging Face Hub — arXiv indexing, model/dataset linking, authorship management, and professional markdown research-article generation.

## Integration with the HF Ecosystem

Paper Pages (index/discover), arXiv integration (auto-indexing from arXiv IDs), model/dataset linking via metadata, authorship verification, and a research-article template.

## Dependencies

The included `scripts/paper_manager.py` uses PEP 723 inline dependencies — prefer `uv run` over manual environment setup. Requires `HF_TOKEN` (write access) in the environment. **All paths in the commands below are relative to this skill's directory** — `cd` there first, or use the full path.

## Commands Reference

**Index a paper from arXiv** (or visit `https://huggingface.co/papers/{arxiv-id}` directly):
```bash
uv run scripts/paper_manager.py index --arxiv-id "2301.12345"
uv run scripts/paper_manager.py check --arxiv-id "2301.12345"     # check if already indexed
```

**Link a paper to a model/dataset/space** — the Hub extracts the arXiv ID and adds an `arxiv:<PAPER_ID>` tag, making the repo discoverable from the Paper Page:
```bash
uv run scripts/paper_manager.py link \
  --repo-id "username/repo-name" --repo-type "model|dataset|space" \
  --arxiv-id "2301.12345" [--arxiv-ids "id1,id2,id3"] \
  [--citation "Full citation text"] [--create-pr]
```

**Claim authorship** (or manually: visit the paper page, click your name, "Claim authorship", await admin verification):
```bash
uv run scripts/paper_manager.py claim --arxiv-id "2301.12345" --email "your.email@institution.edu"
uv run scripts/paper_manager.py check-authorship --arxiv-id "2301.12345"
```

**Manage profile visibility** (or via account settings → Papers):
```bash
uv run scripts/paper_manager.py list-my-papers
uv run scripts/paper_manager.py toggle-visibility --arxiv-id "2301.12345" --show true|false
```

**Create a research article** from a template (`standard` — traditional structure; `modern` — Distill-inspired, dynamic TOC, responsive; `arxiv` — arXiv-style; `ml-report` — ML experiment report):
```bash
uv run scripts/paper_manager.py create \
  --template "standard|modern|arxiv|ml-report" --title "Paper Title" \
  [--authors "Author1, Author2"] [--abstract "Abstract text"] [--output "paper.md"]
uv run scripts/paper_manager.py convert --input "paper.md" --output "paper.html" [--style "modern|classic"]
```

**Search, inspect, validate:**
```bash
uv run scripts/paper_manager.py search --query "transformer attention"
uv run scripts/paper_manager.py info --arxiv-id "2301.12345" --format "json"
uv run scripts/paper_manager.py citation --arxiv-id "2301.12345" --format "bibtex"
uv run scripts/paper_manager.py validate --repo-id "username/model-name" --repo-type "model"
```

## Standard Paper Template Structure

```markdown
---
title: Your Paper Title
authors: Jane Doe, John Smith
affiliations: University X, Lab Y
date: 2025-01-15
arxiv: 2301.12345
tags: [machine-learning, nlp, fine-tuning]
---

# Abstract
# 1. Introduction
# 2. Related Work
# 3. Methodology
# 4. Experiments
# 5. Results
# 6. Discussion
# 7. Conclusion
# References
```

The `modern` template adds a dynamic table of contents, responsive layout, code highlighting, interactive figures, LaTeX math, and citation/author-affiliation linking.

## YAML Metadata for Linked Cards

Model and dataset cards need proper frontmatter for the Hub to extract the arXiv tag correctly:

```yaml
---
language: [en]
license: apache-2.0
tags: [text-generation, transformers, llm]
library_name: transformers
---
```

Followed by a `# Model Name` section referencing `[Our Paper](https://arxiv.org/abs/2301.12345)` and a `## Citation` section with a fenced `bibtex` block containing the standard `@article{...}` entry (author, title, journal, year).

Dataset cards follow the same pattern with `task_categories`/`size_categories` instead of `library_name`.

## Common Workflows

**Publish new research:** create the article -> submit to arXiv externally -> `index` -> `link` to the model -> `claim` authorship.

**Link an existing paper to multiple repos:** `check` -> `index` if needed -> `link` once per model/dataset/space repo-id.

**Update a model with a paper reference:** `hf download user/model README.md` -> `link` with `--citation` — the script adds YAML metadata if missing, inserts the arXiv link, adds the formatted citation, and preserves existing content.

**Batch-link multiple papers to one repo:**
```bash
for arxiv_id in "2301.12345" "2302.67890"; do
  uv run scripts/paper_manager.py link --repo-id "username/model-name" --repo-type "model" --arxiv-id "$arxiv_id"
done
```

## Best Practices

Index papers as soon as published; keep citations consistent across related repos. Add YAML frontmatter with correct license and task tags to every card. Claim authorship with an institutional email and keep visibility settings current. Link papers to every relevant model/dataset/Space, with BibTeX citations. Use one template consistently within a project, and include code/data links.

## Error Handling & Troubleshooting

- **Paper not found**: arXiv ID not indexed yet — visit `hf.co/papers/{arxiv-id}` to trigger indexing.
- **Permission denied**: `HF_TOKEN` lacks write access to the repository.
- **Invalid YAML**: malformed frontmatter in the README.
- **Authorship claim failed / not verified**: email doesn't match author records, or awaiting admin review.
- **Already claimed**: another user has claimed authorship — contact HF support with proof if this is wrong.
- **arXiv tag not appearing**: ensure the README includes a properly formatted arXiv URL.
- **Rate limiting**: too many API requests in a short time — space out batch operations.

## Resources

- [Hugging Face Paper Pages](https://huggingface.co/papers)
- [Model Cards Guide](https://huggingface.co/docs/hub/en/model-cards)
- [Dataset Cards Guide](https://huggingface.co/docs/hub/en/datasets-cards)
- [tfrere's research article template](https://huggingface.co/spaces/tfrere/research-article-template) — complements this skill for writing; use this skill to publish/link/manage authorship afterward.
- [arXiv submission guide](https://arxiv.org/help/submit)
