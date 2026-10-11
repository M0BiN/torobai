# Product review — v0.8

## Findings from the supplied screenshot and current flows

| Priority | Problem | Decision |
|---|---|---|
| P0 | Long categories force a horizontal scrollbar even on desktop | Replace the rail with a responsive category grid; no clipped navigation |
| P0 | Ten header destinations compete with the primary task | Four market destinations; saved/recent/requests in one personal menu; separate seller action |
| P1 | Repeated banners, access controls and filter rows delay results | One compact introduction, category selector, access/filter row and results |
| P1 | Price sort silently chooses a task | Ask which task to compare when units differ; preserve the selected consumption basis |
| P1 | Persian-only search can incorrectly feel like the whole catalog is empty | Show matching all-model results as a clear scope expansion action |
| P1 | Search ignores base model, dialect and task aliases | Include those fields; accept common ASR/OCR/TTS/RAG names |
| P1 | Public downloads and commercial licenses share ambiguous wording | Name API, local execution and public weights explicitly; flag noncommercial terms |
| P1 | One-offer products duplicate their price range and show an empty seller block | Keep the offer prominent; only show ranges and other offers when useful |
| P1 | Every model receives chat-centric context specifications | Show task-appropriate metadata; omit irrelevant unknown fields |
| P1 | Choosing a seller hides their weights-only products | Match API and weight offers to the same provider filter |
| P1 | Draft work disappears after navigating away | Recover in-progress listing edits; distinguish recovery from explicit draft save |
| P1 | Request export is only developer-oriented JSON | Offer a readable text request as well as JSON |
| P2 | Broad English jargon, repetitive notes and long category titles | Plain Persian task names and concise next-action copy |

## Buyer pass

A first visit must answer: what task, which access method, what price unit, and
what happens after clicking. API usage and model-license price remain separate.
Do not pretend a local request was sent or a draft published. Retain the user's
requested illustrative uptime, with its provenance in data/docs.

## Developer pass

Reuse the existing calculation engine and framework. Replace the conflicting
navigation/category CSS rules at their source instead of hiding a scrollbar.
Preserve old routes, prices, access records and downloadable standalone HTML.
Add behavior checks for changed flows and structural checks for the new layout.
No browser-layout claim without actual browser inspection.

## Product-owner pass

No additional catalogs, metrics, ratings or decorative controls are needed.
Success means fewer ambiguous choices and an intact path from search to product,
license, saved request and listing draft. Preserve all existing core capabilities.

## Completion review

All listed changes are implemented. The CSS cleanup removed 237 conflicting
selector entries for the redesigned components and replaced them with one discovery
section. Only the comparison table retains intentional horizontal scrolling.
Cross-market search expansion also handles GPU queries. The product audit in
REVIEW_V08.fa.md documents decisions and operational gaps for the project owner.
Validation: 43 Python, 12 JS helper and 2 CSS structure checks; 62 product routes,
49 DOM scenarios and 3 served DOM scenarios. All 186 old preset offers/assumptions
are unchanged. Browser rendering remains an explicit, uncompleted release gate.
