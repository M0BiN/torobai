# Benchmark coverage and comparison redesign

## Buyer review

The report selector hides most of the catalog and requires benchmark knowledge
before a buyer can choose a model. Large summary cards repeat information from
the chart and offer cards. The next decision should be: choose 2–4 models for one
task, see their actual results and comparable consumption cost, then open offers.

## Implementation plan

1. Audit every catalog identity against primary model cards or original research.
   Record an evaluation profile for every product, including explicit gaps. Add
   published numeric results without borrowing another version's score. Preserve
   evaluator, tested revision, benchmark version, units, direction and conditions.
2. Replace report-first navigation with task tabs and a searchable model picker.
   A single comparison sheet contains selected models, cost, and aligned results.
   Small in-cell bars make differences visible; exact values remain copyable.
   A cost/performance view and CSV/share actions remain available.
3. Keep all source details in animated disclosures. A shared benchmark name can
   appear on one row, but different evaluator protocols never imply a controlled
   ranking. Only a shared measured cohort can receive a best-result highlight.
4. Preserve file-origin operation, exact billing, workload state, cached instant
   navigation, current GPU planner behavior, keyboard focus and reduced motion.

## Risks resolved before coding

- MMLU and MMLU-Pro, GPQA Main and Diamond, AIME years, LiveCodeBench versions,
  MTEB languages and thinking settings cannot silently become the same metric.
- API aliases need the tested snapshot explicitly displayed; seller deployment
  revision is not established by the model-level evaluation.
- Original hypothetical private listings stay scenario records, never sourced
  reports. Remove the hypothetical score assigned to the real ParsinLU model.
- Unknown results stay null. No winner, zero bar, combined score or rank is
  assigned to a missing result. OCR/TTS/API gaps get specific reasons and sources.
- Restrict a comparison to the same task and billing unit. Model selection order
  remains stable while viewing another metric, changing cost or switching view.
- A modal selection draft commits once; cancel leaves the comparison unchanged.
  Search is local. No artificial waits for already bundled benchmark data.

## Verification

Data tests cover every identity and exact-source anchor values. DOM scenarios
exercise all products, selection limits, filtering, empty/common-only states,
CSV provenance, source links, workload updates, links and legacy cohort routes.
Retain pricing conformance and GPU cancellation/cache/scroll tests. Browser
control is unavailable; do not call structural checks visual browser testing.
