---
name: huggingface-vision-trainer
description: Trains and fine-tunes vision models for object detection (D-FINE, RT-DETR v2, DETR, YOLOS), image classification (timm models — MobileNetV3, MobileViT, ResNet, ViT/DINOv3 — plus any Transformers classifier), and SAM/SAM2 segmentation using Hugging Face Transformers on Hugging Face Jobs cloud GPUs. Covers COCO-format dataset preparation, Albumentations augmentation, mAP/mAR evaluation, accuracy metrics, SAM segmentation with bbox/point prompts, DiceCE loss, hardware selection, cost estimation, Trackio monitoring, and Hub persistence. Use when users mention training object detection, image classification, SAM, SAM2, segmentation, image matting, DETR, D-FINE, RT-DETR, ViT, timm, MobileNet, ResNet, bounding box models, or fine-tuning vision models on Hugging Face Jobs.
license: Apache-2.0 (modified; see UPSTREAMS.json)
---

# Vision Model Training on Hugging Face Jobs

Train object detection, image classification, and SAM/SAM2 segmentation models on managed cloud GPUs. No local GPU setup required — results are automatically saved to the Hugging Face Hub. For text/language model fine-tuning (SFT/DPO/GRPO via TRL), use this pack's `huggingface-llm-trainer` skill instead.

## When to Use

Fine-tuning object detection models (D-FINE, RT-DETR v2, DETR, YOLOS), image classification models (any `timm/` model or Transformers classifier), or SAM/SAM2 segmentation models (bbox or point prompts) on custom datasets — locally or on Hugging Face Jobs.

## Local Script Execution

Helper scripts use PEP 723 inline dependencies:
```bash
uv run scripts/dataset_inspector.py --dataset username/dataset-name --split train
uv run scripts/estimate_cost.py --help
```

## Prerequisites Checklist

- Hugging Face account with Pro/Team/Enterprise plan (Jobs require a paid plan). Authenticated login (`hf auth whoami`), token with write permissions passed in job secrets.
- **Object detection**: dataset on the Hub with an `objects` column (`bbox`, `category`, optional `area`). Bboxes in xywh (COCO) or xyxy (Pascal VOC) — auto-detected/converted. Categories can be integers or strings (auto-remapped). `image_id` optional, auto-generated.
- **Image classification**: an `image` column (PIL images) and a `label` column (integer or string class IDs, `ClassLabel` or plain — auto-remapped). Common alt names (`labels`, `class`, `fine_label`) auto-detected.
- **SAM/SAM2 segmentation**: an `image` column, a `mask` column (binary ground-truth mask), and a prompt — either a `prompt` column with JSON (`{"bbox": [...]}` or `{"point": [...]}`), or dedicated `bbox`/`point` columns (xyxy, absolute pixels). Example dataset: `merve/MicroMat-mini`.
- **Always validate unknown datasets first** (see Dataset Validation below).
- Timeout must exceed expected training time — default 30min is too short, use 2-4h minimum for vision training.
- Hub push enabled: `push_to_hub=True`, `hub_model_id="username/model-name"`, token in `secrets`.

## Dataset Validation

Validate BEFORE launching GPU training — the #1 cause of training failures is format mismatches. Skip only for well-known defaults (e.g. `cppe-5`). Run via Jobs (avoids local SSL/dependency issues), locally with `uv run scripts/dataset_inspector.py --dataset ... --split train`, or via `HfApi().run_uv_job(script="scripts/dataset_inspector.py", script_args=[...], flavor="cpu-basic", timeout=300)`. Output markers: `✓ READY` or `✗ NEEDS FORMATTING` (with mapping code).

The object detection training script auto-handles bbox format detection/conversion, sanitization, `image_id` generation, and category remapping — no manual preprocessing needed beyond having `objects.bbox`/`objects.category`.

## Training Workflow

1. Verify prerequisites (account, token, dataset).
2. Validate dataset format with the inspector, before spending GPU time.
3. Ask the user about dataset size (quick 10% test vs. full) and whether to create a validation split, and which GPU hardware to use — present as explicit options rather than assuming.
4. Prepare the training script: `scripts/object_detection_training.py` (OD), `scripts/image_classification_training.py` (IC), or `scripts/sam_segmentation_training.py` (SAM). All use `HfArgumentParser` — configure via CLI-style `script_args`, not by editing Python variables. See `references/timm_trainer.md` for timm details and `references/finetune_sam2_trainer.md` for SAM2 details.
5. Save the script to `submitted_jobs/<dataset>_<timestamp>.py`, submit the job, and report the job ID, monitoring URL, Trackio dashboard (`https://huggingface.co/spaces/{username}/trackio`), expected time, and estimated cost. Wait for the user to request status checks — don't poll; jobs are asynchronous and can take hours.

## Job Submission

Submit via the `hf jobs uv run` CLI, an `hf_jobs()` MCP tool if the Hugging Face MCP server is configured, or the Python API directly:

```python
from huggingface_hub import HfApi, get_token
api = HfApi()
job_info = api.run_uv_job(
    script="scripts/object_detection_training.py",  # file PATH, not inline content, for the Python API
    script_args=["--dataset_name", "cppe-5", "--push_to_hub", "--hub_model_id", "username/model-name", ...],
    flavor="a10g-large",
    timeout=14400,  # seconds
    env={"PYTHONUNBUFFERED": "1"},
    secrets={"HF_TOKEN": get_token()},  # use get_token(), not the literal string "$HF_TOKEN"
)
print(f"Job ID: {job_info.id}")  # .id, not .job_id or .name
```

If using an MCP `hf_jobs()` tool instead, the `script` parameter accepts inline code or a URL (not local paths), timeout is a string (`"4h"`), and secrets use the literal `"$HF_TOKEN"` placeholder (auto-replaced) rather than `get_token()`. Either way, the training script must include PEP 723 inline dependency metadata and must NOT use `image`/`command` parameters (those belong to a different job type).

**Token injection is required in custom scripts**: the Transformers `Trainer` calls `create_repo(token=self.args.hub_token)` when `push_to_hub=True`, so the script must set `training_args.hub_token` from `os.environ.get("HF_TOKEN")` after parsing args but before constructing `Trainer` — `scripts/object_detection_training.py` already does this; replicate it in custom scripts. Don't call `login()` unless replicating that same pattern, and don't rely on implicit token resolution.

### Required flags per modality

**Object detection**: `--no_remove_unused_columns` (preserves the image column), `--no_eval_do_concat_batches` (variable box counts per image), `--push_to_hub`, `--hub_model_id`, `--metric_for_best_model eval_map`, `--greater_is_better True` (must be explicit — it's `Optional[bool]`), `--do_train`, `--do_eval`.

**Image classification**: `--no_remove_unused_columns`, `--push_to_hub`, `--hub_model_id`, `--metric_for_best_model eval_accuracy`, `--greater_is_better True`, `--do_train`, `--do_eval`.

**SAM/SAM2**: `--remove_unused_columns False` (preserves `input_boxes`/`input_points`), `--push_to_hub`, `--hub_model_id`, `--do_train`, `--prompt_type bbox` (or `point`), `--dataloader_pin_memory False` (avoids pin_memory issues with the custom collator).

Bare `bool` flags (`push_to_hub`, `do_train`) can be negated with `--no_` prefix; `Optional[bool]` fields (`greater_is_better`) require an explicit `True`/`False` value.

## Timeout Management

Default 30min is too short for vision training. Minimum 2-4h, with a 30% buffer for loading/preprocessing/Hub push: quick test (100-200 images) 1h, development (500-1K images) 2-3h, production (1K-5K images) 4-6h, large (5K+) 6-12h.

## Trackio Monitoring

Always enabled in the object detection script (calls `trackio.init()`/`trackio.finish()` automatically, project name from `--output_dir`, run name from `--run_name`). For image classification, pass `--report_to trackio` explicitly. Dashboard: `https://huggingface.co/spaces/{username}/trackio`.

## Model & Hardware Selection

**Object detection** (all under 100M params — `t4-small`, 16GB/$0.40/hr, is sufficient): start with `ustc-community/dfine-small-coco` (10.4M, fast/cheap SOTA), move up to `ustc-community/dfine-large-coco` (31.4M) or `PekingU/rtdetr_v2_r50vd` (43M) for accuracy; `ustc-community/dfine-xlarge-obj365` (63.5M) and `PekingU/rtdetr_v2_r101vd` (76M) for the largest variants.

**Image classification** (`timm/` models work out of the box via `AutoModelForImageClassification`, see `references/timm_trainer.md`): start with `timm/mobilenetv3_small_100.lamb_in1k` (2.5M, mobile/edge), move to `timm/resnet50.a1_in1k` (25.6M) or `timm/vit_base_patch16_dinov3.lvd1689m` (86.6M, best accuracy).

**SAM/SAM2** (only the mask decoder trains by default — vision/prompt encoders frozen): start with `facebook/sam2.1-hiera-small` (46.0M); `facebook/sam2.1-hiera-tiny` (38.9M) for speed, `facebook/sam2.1-hiera-large` (224.4M) or the original `facebook/sam-vit-*` family for best accuracy at higher VRAM cost.

`t4-small` handles all recommended OD/IC models and SAM2 up to `hiera-base-plus`; use `l4x1` ($0.80/hr) or `a10g-large` ($1.50/hr) for `sam2.1-hiera-large` or SAM v1 models, or if you hit OOM (reduce batch size first). Run `scripts/estimate_cost.py` for a cost estimate.

## Checking Job Status

Via MCP tool if available: `hf_jobs("ps")`, `hf_jobs("logs", {"job_id": "..."})`, `hf_jobs("inspect", {"job_id": "..."})`. Via Python API: `HfApi().list_jobs()`, `.get_job_logs(job_id=...)`, `.get_job(job_id=...)`.

## Common Failure Modes

- **CUDA OOM**: reduce `per_device_train_batch_size` (try 4, then 2), reduce image size, or upgrade hardware.
- **Dataset format errors**: run `scripts/dataset_inspector.py` first; ensure `objects.bbox`/`objects.category` are well-formed.
- **Hub push failures (401)**: confirm job secrets include the token, the script sets `training_args.hub_token` before constructing `Trainer`, `push_to_hub=True`, correct `hub_model_id`, and write permissions.
- **Job timeout**: increase timeout, reduce epochs/dataset, or checkpoint with `hub_strategy="every_save"`.
- **`KeyError: 'test'`**: the OD script falls back to the `validation` split automatically — use the latest template.
- **Single-class "iteration over a 0-d tensor"**: `torchmetrics.MeanAveragePrecision` returns scalar tensors for one-class datasets — the OD template already `.unsqueeze(0)`s these.
- **Poor mAP (<0.15)**: more epochs (30-50), 500+ images, check per-class mAP for imbalance, try learning rates 1e-5 to 1e-4, larger image size.

See `references/reliability_principles.md` for the full guide.

## Resources

**Scripts:** `scripts/object_detection_training.py`, `image_classification_training.py`, `sam_segmentation_training.py`, `dataset_inspector.py`, `estimate_cost.py`.

**References:** `references/object_detection_training_notebook.md`, `image_classification_training_notebook.md`, `finetune_sam2_trainer.md`, `timm_trainer.md`, `hub_saving.md`, `reliability_principles.md`.

**External:** [Object Detection Guide](https://huggingface.co/docs/transformers/tasks/object_detection), [Image Classification Guide](https://huggingface.co/docs/transformers/tasks/image_classification), [HF Jobs Guide](https://huggingface.co/docs/huggingface_hub/guides/jobs), [HF Jobs Configuration](https://huggingface.co/docs/hub/en/jobs-configuration), [SAM2 docs](https://huggingface.co/docs/transformers/model_doc/sam2), [SAM docs](https://huggingface.co/docs/transformers/model_doc/sam).
