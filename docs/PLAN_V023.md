# Performance comparison and GPU planning

## Before implementation

Buyer task: choose a model for a specific task, see its published capability and
the cost of buying API access, then decide whether self-hosting is worthwhile.
A second buyer compares individual rental GPUs, not a multi-GPU system total.

Keep the existing FastAPI, declarative billing plans, standalone export, and
referral workflow. Add a small benchmark data file and one vanilla JS module.
No inference, remote evaluation jobs, new dependencies or payment endpoints.

1. Add Performance beside Providers in primary navigation and as a product tab.
2. Organize results into source/protocol cohorts. Switch between model, retrieval,
   Persian task and GPU views. Never merge incompatible tests into one leaderboard.
3. Show metric bars, a quality/cost scatterplot, a complete side-by-side matrix,
   an optional weighted decision score and a downloadable snapshot. Preserve
   sources, dates, conditions and unknown values. All charts have text equivalents.
4. Connect offers through the existing compiled estimate engine. Price period,
   request mode and task unit remain visible. The comparison itself is shareable.
5. Improve the GPU form with presets, concurrent requests, a per-card memory
   breakdown and readable rental results. Estimate GiB consistently, distinguish
   inference from training, and never sum unrelated GPU memories.
6. New normalized calculations show brief progress while previous results remain.
   Cache hits render synchronously without busy state. Scroll to the result
   heading smoothly after a user calculation; initial render does not scroll.

## Failure analysis and design resolutions

| Risk | Resolution before coding |
| --- | --- |
| A generated number appears independently measured | Separate scenario cohorts; explicit source kind and measured=false, no borrowed source URL |
| Different revisions, thinking modes or tasks rank together | Cohort owns exact reported variants, mode, metrics and protocol; cross-cohort ranking unavailable |
| English/multilingual score reads as Persian quality | Dedicated Persian task cohorts; multilingual note explicitly excludes a Persian-specific claim |
| Hardware specification reads as measured inference speed | Separate specifications and execution-scenario views; TGP is not measured wall power |
| Missing result becomes zero or winner | Null remains unavailable, missing metrics excluded from ranking and weighted score |
| Pricing is duplicated or incompatible | Reuse catalogQuote/compiled plans, same cohort unit and one workload, no weight-license price mixing |
| “Best overall” overstates an arbitrary average | Optional user-selected quality/price weighting, visible formula and eligible scope; raw metric remains default |
| GPU name parameter guess is wrong (MoE/E variants) | Editable total parameter count; specific E2B/E4B totals; active parameters never replace total weight size |
| Capacity estimate promises compatibility | Inference-only estimate, quantization/runtime/format caveat, editable KV and overhead, no fit guarantee |
| Stale calculation scrolls after navigation/edit | Snapshot identity, input revision, catalog revision and route guards; cancel on edits/navigation |
| Ready data flashes a spinner | Bounded session cache by canonical numeric inputs and catalog revision, no caching DOM |
| Mobile/chart/keyboard failure | Responsive compact controls, native labels, SVG viewBox, text/table equivalents, focus without jump, reduced motion |

## Research, retrieved 2026-10-11

- Artificial Analysis separates model/endpoint/provider quality, TTFT and output
  speed: https://artificialanalysis.ai/methodology
- Arena reports uncertainty and tied ranking intervals; do not manufacture CI:
  https://arena.ai/blog/ranking-method
- LiveBench separates objectively scored tasks and versions:
  https://github.com/livebench/livebench
- OpenCompass (Chinese/English) separates datasets and evaluation configurations:
  https://github.com/open-compass/opencompass
- Open Arabic LLM Leaderboard uses Arabic-native tasks, translated MMLU, model
  revision, precision and chat-template metadata:
  https://oall-open-arabic-llm-leaderboard.hf.space/
- ParsBench motivates language-native Persian evaluation and normalization:
  https://github.com/ParsBench/ParsBench
- Runpod selects model, engine, token sizes and batch before hardware comparison:
  https://www.runpod.io/gpu-compare
- MLPerf results belong to a specific system/software/scenario; system power is
  distinct from card TGP: https://mlcommons.org/benchmarks/inference-datacenter/

Published values come from the exact Qwen, Google and DeepSeek model cards linked
in benchmarks.json, not from interpolating their names. NVIDIA reference-card
specifications are hardware facts, not inference measurements. Persian and GPU
execution scenarios are illustrative fixtures explicitly separated in the UI.
No confidence intervals, independent certification, seller throughput or live
measurement are invented. Retrieval was text/structure research, not browser QA.

## Acceptance checks

Exercise new routes, group/metric/view changes, share URL, CSV formula safety,
unknown values, lower-is-better metrics, stable source mapping, catalog revisions,
GPU cache hits/new work/edit cancellation/navigation cancellation, reduced motion,
and the actual standalone export. Re-run affected navigation, pricing and product
tests. Browser rendering is unavailable in this managed environment; report that
limit instead of substituting DOM checks for visual inspection.
