# v0.6 research and evidence — 11 October 2026

## Visual references

All three supplied PNGs were opened and inspected. They show the tall category
panels, visible `<span class="currency">` text in the starting-price summary, and
Torob's prominent seller purchase action alongside the product identity. The
source of the markup bug was confirmed in v0.5: money() returns HTML, while the
summary updater used textContent. The replacement structured offer panel renders
that markup and keeps all untrusted names escaped.

This extends the earlier Torob/marketplace study in RESEARCH.md and
RESEARCH_V05.md. A fresh Torob product-page web open failed; no fresh browser
inspection is claimed. The supplied Torob screenshot is the visual reference for
this revision. Do not invent a price-history plot to mimic its chart.

## Model additions

The owners' Hugging Face model cards and model API identifiers were checked.
See evidence/models-v06.json for the precise identifiers, native contexts and
license labels. Model prices are curated reference tariffs, as already permitted
for this project, rather than observed seller availability or official quotes.

| Family | Added models | Primary source |
|---|---|---|
| Qwen 3.8 | 27B | https://huggingface.co/Qwen/Qwen3.8-27B |
| Qwen 3.8 | Flash Next | https://huggingface.co/Qwen/Qwen3.8-Flash-Next |
| Qwen 3.8 | 2.4T A95B | https://huggingface.co/Qwen/Qwen3.8-2.4T-A95B |
| Qwen 3.6 | 27B | https://huggingface.co/Qwen/Qwen3.6-27B |
| Qwen 3.6 | 35B A3B | https://huggingface.co/Qwen/Qwen3.6-35B-A3B |
| Qwen 3.5 | 0.8B | https://huggingface.co/Qwen/Qwen3.5-0.8B |
| Qwen 3.5 | 2B | https://huggingface.co/Qwen/Qwen3.5-2B |
| Qwen 3.5 | 4B | https://huggingface.co/Qwen/Qwen3.5-4B |
| Qwen 3.5 | 27B | https://huggingface.co/Qwen/Qwen3.5-27B |
| Qwen 3.5 | 35B A3B | https://huggingface.co/Qwen/Qwen3.5-35B-A3B |
| Gemma 4 | E2B | https://huggingface.co/google/gemma-4-E2B-it |
| Gemma 4 | E4B | https://huggingface.co/google/gemma-4-E4B-it |
| Gemma 4 | 26B A4B | https://huggingface.co/google/gemma-4-26B-A4B-it |
| Gemma 4 | 31B | https://huggingface.co/google/gemma-4-31B-it |

Flash Next and the 2.4T model carry their own Qwen licenses, not Apache 2.0.
Their generic API metadata says `other`; the named license comes from the model
card. They remain downloadable weights, with a link to the actual terms. Model
names are not inferred from community quantizations. Failed lookups for guessed
3.8 small variants were not used. Native context is stored separately from any
extended context or hosted-provider limit. The existing Gemma 4 12B specification
now has its published 256K context; its offer tariffs are unchanged.

The catalog now has 49 products: 40 model/API entries and 9 GPU groups, with 112
offers from 8 providers. Thirty entries have downloadable weights. Four decision
models retain their official download paths without fabricated API providers.

## Reliability

The v0.5 source snapshot and scope are unchanged. Featured offers and other seller
rows link to the existing sourced reliability panel. Publisher-reported group
request success is labeled as such; missing uptime remains unknown. Reference
offers do not inherit independently verified model-specific percentages.
