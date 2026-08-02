---
name: huggingface-llm-trainer
description: Train or fine-tune language and vision models using TRL (Transformer Reinforcement Learning) or Unsloth with Hugging Face Jobs infrastructure. Covers SFT, DPO, GRPO and reward modeling training methods, plus GGUF conversion for local deployment. Includes guidance on the TRL Jobs package, UV scripts with PEP 723 format, dataset preparation and validation, hardware selection, cost estimation, Trackio monitoring, Hub authentication, model selection/leaderboards and model persistence. Use for tasks involving cloud GPU training, GGUF conversion, or when users mention training on Hugging Face Jobs without local GPU setup.
license: Apache-2.0 (modified; see UPSTREAMS.json)
---

# TRL Training on Hugging Face Jobs

## Overview

Train language models using TRL (Transformer Reinforcement Learning) on fully managed Hugging Face infrastructure. No local GPU setup required — models train on cloud GPUs and results are automatically saved to the Hugging Face Hub.

**TRL provides multiple training methods:**
- **SFT** (Supervised Fine-Tuning) — standard instruction tuning
- **DPO** (Direct Preference Optimization) — alignment from preference data
- **GRPO** (Group Relative Policy Optimization) — online RL training
- **Reward Modeling** — train reward models for RLHF

See `references/training_methods.md` for method overviews and selection guidance.

### When to Use Unsloth

Use **Unsloth** (`references/unsloth.md`) instead of standard TRL when GPU memory is limited (~60% less VRAM), speed matters (~2x faster), training large models (>13B), or training Vision-Language Models (Unsloth has `FastVisionModel` support). See `scripts/unsloth_sft_example.py` for a production-ready training script.

## Key Directives

1. **Submit jobs via `hf jobs uv run` (CLI) or the `hf_jobs()` MCP tool if the Hugging Face MCP server is configured** — pass the training script inline, don't save to a local file unless the user explicitly requests it. If the user asks to "train a model" or "fine-tune", create the training script AND submit the job immediately.
2. **Always include Trackio** for real-time monitoring — use `scripts/` templates.
3. **Provide job details after submission**: job ID, monitoring URL, estimated time; note the user can request status checks later.
4. **Use example scripts as templates**: `scripts/train_sft_example.py`, `scripts/train_dpo_example.py`, etc.

## Local Script Execution

Repository scripts use PEP 723 inline dependencies. Run them with `uv run`:
```bash
uv run scripts/estimate_cost.py --help
uv run scripts/dataset_inspector.py --help
```

## Prerequisites Checklist

**Account & Authentication:**
- Hugging Face account with Pro/Team/Enterprise plan (Jobs require a paid plan); authenticated login.
- **HF_TOKEN for Hub push is CRITICAL** — the training environment is ephemeral, so results are lost unless pushed to the Hub. Token must have write permissions. Pass `secrets={"HF_TOKEN": "$HF_TOKEN"}` in the job config.

**Dataset Requirements:**
- Must exist on the Hub or be loadable via `datasets.load_dataset()`.
- Format must match the training method (SFT: messages/text/prompt-completion; DPO: chosen/rejected; GRPO: prompt-only). **Always validate unknown datasets first** (see Dataset Validation below).
- Size appropriate for hardware (demo: 50-100 examples on t4-small; production: 1K-10K+ on a10g-large/a100-large).

**Critical Settings:**
- Timeout must exceed expected training time — default 30min is too short; minimum recommended 1-2 hours. The job fails and loses all progress if the timeout is exceeded.
- Hub push must be enabled: `push_to_hub=True`, `hub_model_id="username/model-name"`, `secrets={"HF_TOKEN": "$HF_TOKEN"}`.

## Asynchronous Jobs

Training jobs run in the background and can take hours. After submitting: report the job ID, monitoring URL, and estimated time; wait for the user to request status checks rather than polling. Initial logs can take 30-60 seconds to appear.

## Quick Start

**Sequence length:** TRL config classes use `max_length` (not `max_seq_length`). Default is `max_length=1024` (truncates from right) — override higher for longer context, lower under memory constraints, or `None` for vision models (to avoid cutting image tokens).

### Approach 1: UV Scripts (default choice)

UV scripts use PEP 723 inline dependencies for clean, self-contained training:

```python
hf_jobs("uv", {
    "script": """
# /// script
# dependencies = ["trl>=0.12.0", "peft>=0.7.0", "trackio"]
# ///
from datasets import load_dataset
from peft import LoraConfig
from trl import SFTTrainer, SFTConfig
import trackio

dataset = load_dataset("trl-lib/Capybara", split="train")
dataset_split = dataset.train_test_split(test_size=0.1, seed=42)

trainer = SFTTrainer(
    model="Qwen/Qwen2.5-0.5B",
    train_dataset=dataset_split["train"],
    eval_dataset=dataset_split["test"],
    peft_config=LoraConfig(r=16, lora_alpha=32),
    args=SFTConfig(
        output_dir="my-model", push_to_hub=True, hub_model_id="username/my-model",
        num_train_epochs=3, eval_strategy="steps", eval_steps=50,
        report_to="trackio", project="my_project", run_name="my_run",
    ),
)
trainer.train()
trainer.push_to_hub()
""",
    "flavor": "a10g-large",
    "timeout": "2h",
    "secrets": {"HF_TOKEN": "$HF_TOKEN"},
})
```

The `script` parameter accepts inline code or a publicly-accessible/Hub/GitHub/Gist URL — **local file paths do not work** (jobs run in isolated containers with no access to the local filesystem). To use a local script, upload it to the Hub first (`hf upload ...`) and reference its resolved URL.

### Approach 2: TRL Maintained Scripts

Run TRL's battle-tested example scripts directly from a URL, passing CLI-style `script_args` (`--model_name_or_path`, `--dataset_name`, `--output_dir`, `--push_to_hub`, `--hub_model_id`). Available at https://github.com/huggingface/trl/tree/main/examples/scripts.

### Approach 3: HF Jobs CLI

When no `hf_jobs`-style tool is available, use the `hf jobs` CLI directly. **Flags must come before the script URL**, the subcommand order is `hf jobs uv run` (not `run uv`), and use `--secrets` (plural):

```bash
hf jobs uv run \
  --flavor a10g-large --timeout 2h --secrets HF_TOKEN \
  "https://huggingface.co/user/repo/resolve/main/train.py"
```

Check status: `hf jobs ps`, `hf jobs logs <job-id>`, `hf jobs inspect <job-id>`, `hf jobs cancel <job-id>`.

### Approach 4: TRL Jobs Package

`uvx trl-jobs sft --model_name Qwen/Qwen2.5-0.5B --dataset_name trl-lib/Capybara` gives pre-configured defaults, automatic Trackio integration, and automatic Hub push — best for terminal-only, quick local experimentation. Repository: https://github.com/huggingface/trl-jobs.

## Hardware Selection

| Model Size | Recommended Hardware | Cost (approx/hr) |
|------------|---------------------|------------------|
| <1B params | `t4-small` | ~$0.75 |
| 1-3B params | `t4-medium`, `l4x1` | ~$1.50-2.50 |
| 3-7B params | `a10g-small`, `a10g-large` | ~$3.50-5.00 |
| 7-13B params | `a10g-large`, `a100-large` (LoRA) | ~$5-10 |
| 13B+ params | `a100-large`, `a10g-largex2` (LoRA) | ~$10-20 |

Use LoRA/PEFT for models >7B; multi-GPU is handled automatically by TRL/Accelerate. See `references/hardware_guide.md` for full specs.

## Saving Results to the Hub

**The Jobs environment is ephemeral — everything is deleted when the job ends.** Set `push_to_hub=True` and `hub_model_id="username/model-name"` in the training config, and pass `secrets={"HF_TOKEN": "$HF_TOKEN"}` in the job submission. See `references/hub_saving.md` for troubleshooting.

## Timeout Management

Default is 30 minutes — too short for real training. Set explicitly (`"timeout": "2h"`, formats: `"90m"`, `"2h"`, seconds as integer) with a 20-30% buffer for loading/checkpointing/Hub push. Guideline: quick demo 10-30min, development 1-2h, production (3-7B) 4-6h. On timeout the job is killed immediately and unsaved progress is lost.

## Choosing a Base Model

Use `scripts/hf_benchmarks.py` to find top-performing models for a task, keeping size/hardware constraints in mind: `uv run scripts/hf_benchmarks.py search --query ocr` then `uv run scripts/hf_benchmarks.py leaderboard <benchmark-id>`.

## Cost Estimation

Offer to estimate cost when parameters are known (hardware, dataset size, epochs), with `scripts/estimate_cost.py`:
```bash
uv run scripts/estimate_cost.py --model meta-llama/Llama-2-7b-hf --dataset trl-lib/Capybara --hardware a10g-large --dataset-size 16000 --epochs 3
```

## Example Training Scripts

Production-ready templates: `scripts/train_sft_example.py`, `scripts/train_dpo_example.py`, `scripts/train_grpo_example.py`, `scripts/unsloth_sft_example.py` (Unsloth, faster/less VRAM). Pass their content inline or use as templates.

## Monitoring with Trackio

Add `trackio` to dependencies and configure `report_to="trackio"`, `run_name="meaningful_name"`. Defaults: space ID `{username}/trackio`, minimal config (hyperparameters + model/dataset info), a Project Name to group runs. Apply the user's preferences instead when specified. See `references/trackio_guide.md` for grouping runs across experiments.

## Dataset Validation

**Validate BEFORE launching GPU training** — 50%+ of training failures are format mismatches, and DPO is especially strict about column names (`prompt`, `chosen`, `rejected`). Validation on CPU costs ~$0.01 and takes <1 minute vs. wasting $1-10 and 30-60 minutes on a failed GPU job.

Always validate unknown/custom datasets and any DPO dataset; skip validation only for well-known TRL datasets (`trl-lib/ultrachat_200k`, `trl-lib/Capybara`, etc.). Use the Hub-hosted dataset inspector script (`--dataset name --split train`); output markers are `✓ READY`, `✗ NEEDS MAPPING` (includes copy-paste mapping code), or `✗ INCOMPATIBLE`.

## Converting Models to GGUF

Convert trained models to GGUF for llama.cpp/Ollama/LM Studio/local inference — supports 4/5/8-bit quantization, typically 2-8GB for 7B models vs. 14GB unquantized. See `references/gguf_conversion.md` for the complete conversion script, quantization options, and troubleshooting.

## Common Training Patterns

See `references/training_patterns.md`: quick demo, production with checkpoints, multi-GPU, DPO, GRPO.

## Common Failure Modes

- **Out of memory**: reduce `per_device_train_batch_size` (increase `gradient_accumulation_steps` to compensate, target effective batch size ~128), enable `gradient_checkpointing=True`, or upgrade hardware.
- **Dataset misformatted**: validate first with the dataset inspector, apply the suggested mapping code.
- **Job timeout**: check actual runtime via logs, increase timeout with a 30% buffer, or reduce `num_train_epochs`/dataset size; save checkpoints (`save_strategy="steps"`, `hub_strategy="every_save"`) so partial progress survives.
- **Hub push failures**: confirm `secrets={"HF_TOKEN": "$HF_TOKEN"}`, `push_to_hub=True`, `hub_model_id`, write permissions, and that the target repo exists (or `hub_private_repo=True`).
- **Missing dependencies**: add them to the PEP 723 header.

See `references/troubleshooting.md` for the complete guide.

## Resources

**References:** `references/training_methods.md`, `training_patterns.md`, `unsloth.md`, `gguf_conversion.md`, `trackio_guide.md`, `hardware_guide.md`, `hub_saving.md`, `troubleshooting.md`, `local_training_macos.md`.

**Scripts:** `scripts/train_sft_example.py`, `train_dpo_example.py`, `train_grpo_example.py`, `unsloth_sft_example.py`, `estimate_cost.py`, `convert_to_gguf.py`, `hf_benchmarks.py`.

**External:** [TRL docs](https://huggingface.co/docs/trl), [TRL Jobs training guide](https://huggingface.co/docs/trl/en/jobs_training), [TRL Jobs package](https://github.com/huggingface/trl-jobs), [HF Jobs docs](https://huggingface.co/docs/huggingface_hub/guides/jobs), [UV scripts guide](https://docs.astral.sh/uv/guides/scripts/).

## Key Takeaways

1. Submit scripts inline — no file saving required unless the user asks.
2. Jobs are asynchronous — don't poll; let the user check status when ready.
3. Always set a timeout above the default 30min (1-2h minimum).
4. Always enable Hub push — the environment is ephemeral.
5. Include Trackio for real-time monitoring.
6. Offer cost estimation when parameters are known.
7. Default to UV scripts (Approach 1) or the TRL maintained scripts (Approach 2); fall back to the `hf jobs` CLI (Approach 3) when no job-submission tool is available.
8. Validate dataset format before training, especially for DPO.
9. Choose hardware for model size; use LoRA for models >7B.
