---
name: transformers-js
description: Use Transformers.js to run state-of-the-art machine learning models directly in JavaScript/TypeScript. Supports NLP (text classification, translation, summarization), computer vision (image classification, object detection), audio (speech recognition, audio classification), and multimodal tasks. Works in browsers and server-side runtimes (Node.js, Bun, Deno) with WebGPU/WASM using pre-trained models from Hugging Face Hub.
license: Apache-2.0 (modified; see UPSTREAMS.json)
---

# Transformers.js — Machine Learning for JavaScript

Runs state-of-the-art ML models directly in JavaScript, in browsers and server-side runtimes (Node.js, Bun, Deno), with no Python server required.

## Installation

```bash
npm install @huggingface/transformers
```
```javascript
// Browser (CDN)
import { pipeline } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers';
```

## Core Concepts

**Pipeline API** — groups preprocessing, inference, and postprocessing. Always `dispose()` when done to free memory (see `references/EXAMPLES.md` for cleanup patterns):
```javascript
import { pipeline } from '@huggingface/transformers';
const pipe = await pipeline('sentiment-analysis');
const result = await pipe('I love transformers!');
await pipe.dispose();
```

**Model selection** — pass a model ID as the second argument, e.g. `pipeline('sentiment-analysis', 'Xenova/bert-base-multilingual-uncased-sentiment')`. Browse compatible models at `https://huggingface.co/models?library=transformers.js&sort=trending`, filtered by `pipeline_tag` for a specific task.

**Device**: `{ device: 'webgpu' }` for GPU acceleration (falls back to WASM/CPU when unsupported); omit for CPU/WASM default.

**Quantization**: `{ dtype: 'q4' }` — options `fp32` (largest/most accurate), `fp16`, `q8`, `q4` (smallest, some accuracy loss).

## Supported Tasks

One pipeline call per task, e.g. `await pipeline('image-classification')('https://example.com/image.jpg')`. Task IDs by category:

- **NLP**: `text-classification`/`sentiment-analysis`, `token-classification`/`ner`, `question-answering`, `fill-mask`, `summarization`, `translation`, `text-generation`, `text2text-generation`, `zero-shot-classification`
- **Vision**: `image-classification`, `object-detection`, `image-segmentation`, `depth-estimation`, `zero-shot-image-classification`, `image-to-image`
- **Audio**: `automatic-speech-recognition`, `audio-classification`, `text-to-speech`/`text-to-audio`
- **Multimodal**: `image-to-text`, `document-question-answering`, `zero-shot-object-detection`
- **Embeddings**: `feature-extraction` (add `{ pooling: 'mean', normalize: true }` for sentence embeddings), `sentence-similarity`

For streaming/chat text generation (system/user/assistant roles, `TextStreamer`, generation params), see `references/TEXT_GENERATION.md`.

## Finding and Choosing Models

Filter the Hub by `library=transformers.js` and `pipeline_tag=<task>`, sort by `trending`/`downloads`/`likes`/`modified`. Consider: **size** (<100MB fast/browser-friendly, 100-500MB balanced, >500MB high-accuracy/Node.js), **quantization** (fp32/fp16/q8/q4 trade accuracy for size/speed), **task compatibility** (check the model card for supported tasks, I/O format, language, license), and **performance metrics** on the model card. Start with a smaller model, verify it has ONNX files, and pin a specific `revision` in production for stability.

## Advanced Configuration

**Environment (`env`)** controls caching and model loading globally:
```javascript
import { env, LogLevel } from '@huggingface/transformers';
env.allowRemoteModels = true;   // load from Hugging Face Hub
env.allowLocalModels = false;   // load from file system
env.localModelPath = '/models/';
env.useFSCache = true;          // Node.js disk cache
env.useBrowserCache = true;
env.cacheDir = './.cache';
env.logLevel = LogLevel.INFO;   // default WARNING
env.fetch = (url, options) => fetch(url, { ...options, headers: { ...options?.headers, Authorization: `Bearer ${HF_TOKEN}` } });
```
Typical patterns: development uses remote models + FS cache; production uses local-only models from a fixed path; testing disables both caches. Full option/caching reference: `references/CONFIGURATION.md`.

**`ModelRegistry` (v4)** inspects model assets before loading — required files, cache status, available dtypes:
```javascript
import { ModelRegistry } from '@huggingface/transformers';
const files = await ModelRegistry.get_pipeline_files(task, modelId, modelOptions);
const cached = await ModelRegistry.is_pipeline_cached(task, modelId, modelOptions);
const dtypes = await ModelRegistry.get_available_dtypes(modelId);
```
See `references/MODEL_REGISTRY.md` for full API coverage.

**Standalone tokenization**: `npm install @huggingface/tokenizers` for fast tokenization without loading a full inference pipeline.

**Manual tokenizer + model** for finer control:
```javascript
import { AutoTokenizer, AutoModel } from '@huggingface/transformers';
const tokenizer = await AutoTokenizer.from_pretrained('bert-base-uncased');
const model = await AutoModel.from_pretrained('bert-base-uncased');
const outputs = await model(await tokenizer('Hello world!'));
```

**Batch processing**: pass an array of inputs to any pipeline, e.g. `classifier(['I love this!', 'This is terrible.'])`.

## Runtime Considerations

WebGPU accelerates browsers and supporting server runtimes — use it when available, fall back to WASM/CPU otherwise. WASM is the most portable backend; combine with `q8`/`q4` quantization for smaller, faster models.

**Progress tracking** for large multi-file downloads — pass `progress_callback` to `pipeline()`; the callback receives `{status: 'initiate'|'download'|'progress'|'progress_total'|'done'|'ready', name, file?, progress?, loaded?, total?}`. Full patterns (browser UI, React, CLI, retries) in `references/PIPELINE_OPTIONS.md#progress-callback`.

## Error Handling & Memory Management

```javascript
try {
  const pipe = await pipeline('sentiment-analysis', 'model-id');
  const result = await pipe('text to analyze');
} catch (error) {
  // error.message mentions 'fetch' -> download/network issue
  // error.message mentions 'ONNX' -> model execution/compatibility issue
}
```

**Always call `pipe.dispose()`** when finished (app shutdown, component unmount, before loading a different model, after batch processing) — models hold 100MB-several GB of memory/GPU resources. See `references/CACHE.md` and `references/EXAMPLES.md` for cache and cleanup patterns across runtimes.

## Troubleshooting

- **Model not found**: verify it exists on the Hub, check spelling, confirm it has ONNX files (an `onnx` folder in the repo).
- **Memory issues**: use a smaller/quantized model (`dtype: 'q4'`), reduce batch size, limit `max_length`.
- **WebGPU errors**: check browser support (Chrome/Edge 113+), try `fp16` if `fp32` fails, or fall back to WASM.

## Best Practices

Always dispose pipelines; prefer the pipeline API unless fine-grained control is needed; test with small inputs first; watch download sizes for web apps; show progress indicators; pin model versions in production; wrap pipeline calls in try/catch; provide fallbacks for unsupported browsers/backends; reuse loaded pipelines rather than recreating them; dispose models on `SIGTERM`/`SIGINT` in servers.

## Resources

**This skill:** `references/PIPELINE_OPTIONS.md`, `CONFIGURATION.md`, `MODEL_REGISTRY.md`, `CACHE.md`, `TEXT_GENERATION.md`, `MODEL_ARCHITECTURES.md`, `EXAMPLES.md`.

**Official:** [docs](https://huggingface.co/docs/transformers.js), [API reference](https://huggingface.co/docs/transformers.js/api/pipelines), [model hub](https://huggingface.co/models?library=transformers.js), [GitHub](https://github.com/huggingface/transformers.js), [examples](https://github.com/huggingface/transformers.js-examples).
