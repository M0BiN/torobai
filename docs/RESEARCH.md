# Research used for v0.4 — 11 October 2026

## Coding-agent setup

- Codex project instructions: https://developers.openai.com/codex/guides/agents-md/
  (currently redirects to https://learn.chatgpt.com/docs/agent-configuration/agents-md).
- Claude project memory and file imports: https://code.claude.com/docs/en/memory.

Use a root AGENTS.md for shared constraints and a CLAUDE.md that imports it.
There is no useful repeatable tool workflow here that needs a separate SKILL.md;
duplicating the same policy in several instruction files would invite drift.
The setup is local to this project and does not modify global agent preferences.

## Torob: several product types, not only the home page

- Home: https://torob.com/
- Search: https://torob.com/search/?query=rtx%204090
- Hyundai TECHNO745 chainsaw:
  https://torob.com/p/16080a39-171a-4b75-8b76-fcd95e26983e/
- ASUS ROG Strix RTX 4090:
  https://torob.com/p/aa3930ea-b53a-4547-aacd-aa03482141eb/
- NVIDIA H200 141 GB:
  https://torob.com/p/3840d9f8-c752-47ed-b275-9a09df10bfde/
- ASUS Dual RTX 5070:
  https://torob.com/p/cee88b64-9507-486a-a68a-d766fa802727/

Retrieved server-rendered pages and three linked CSS files. Compared a retail
item with many merchants, GPU hardware pages with different supply, search
categories, price/seller hierarchy, conditions, specs and related products.
Browser navigation did not produce a usable snapshot or screenshot, so this is
a documented structural/CSS study, not a claim of pixel-level inspection.

| Observed pattern | Decision for HooshBazar |
|---|---|
| Recognizable product before merchant list | Maker stage, task, identifier, facts and price unit on first screen |
| Prominent offer summary and destination | Starting tariff, seller count and seller comparison action |
| Individual merchant rows with conditions | Same-model provider rows; credit, access and rental terms stay visible |
| Dense grouped specifications | Model limits separated from seller API limits; hardware from rented configuration |
| Related products and breadcrumbs | Useful next choices and return to retained catalog filters |
| Merchant trust, location and retail delivery concepts | Do not fabricate scores; adapt to API access and compute constraints |

The visual translation is independent: warm paper, coral controls, lilac decision
artwork, green compute hardware, local logos, and Persian typography. The workload
chart shows calculated scenarios rather than fabricated price history.

## Primary model references

Each new record also stores its own `spec_source` / `weights_url`.

| Model | Primary card |
|---|---|
| Qwen3.5 9B | https://huggingface.co/Qwen/Qwen3.5-9B |
| Qwen3 Coder 30B A3B | https://huggingface.co/Qwen/Qwen3-Coder-30B-A3B-Instruct |
| Gemma 3 12B | https://huggingface.co/google/gemma-3-12b-it |
| Gemma 4 12B | https://huggingface.co/google/gemma-4-12B-it |
| Llama 3.3 70B | https://huggingface.co/meta-llama/Llama-3.3-70B-Instruct |
| Mistral Small 3.1 | https://huggingface.co/mistralai/Mistral-Small-3.1-24B-Instruct-2503 |
| DeepSeek R1 Qwen 32B | https://huggingface.co/deepseek-ai/DeepSeek-R1-Distill-Qwen-32B |
| BGE M3 | https://huggingface.co/BAAI/bge-m3 |
| Qwen3 Embedding 0.6B | https://huggingface.co/Qwen/Qwen3-Embedding-0.6B |
| Whisper v3 Turbo | https://huggingface.co/openai/whisper-large-v3-turbo |
| FLUX.1 Schnell | https://huggingface.co/black-forest-labs/FLUX.1-schnell |
| Laya | https://huggingface.co/convaiinnovations/laya |
| Laya Multilingual | https://huggingface.co/convaiinnovations/laya-multilingual |
| Decider 2B | https://huggingface.co/Mapika/decider-2b |
| Decider 4B | https://huggingface.co/Mapika/decider-4b |

Decision-model implementation reference: https://github.com/Mapika/decider.
Laya and Decider score typed choices; they are not ordinary text-completion APIs.
Their inclusion does not imply tested accuracy, calibrated probabilities on a
buyer's data, or an Iranian provider. Gemma 3's custom terms and Gemma 4's Apache
2.0 card are intentionally separate. Open weights is not one universal license.
