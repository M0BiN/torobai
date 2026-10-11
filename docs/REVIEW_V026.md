# v0.26 review

## Buyer

A coding buyer can select API, see three small rows with bold monthly prices,
open the original provider-scoped product or compare performance. The latest
question stays in view when a reply arrives. Earlier text and scoped links remain
available; settings no longer bury the conversation in repeated forms.

## Senior developer

Only the chatbot presentation, short copy, launcher, release metadata and related
tests/docs changed. The backend and pricing/filter rules remain the v0.25 paths.
No runtime dependency was added. OpenRouter remains the default text parser.

Fixed during review:
- Settings now have their own choice list; cancellation cannot remap quick replies.
- General dialog paragraph colors and textarea direction no longer leak into chat.
- Earlier links preserve their own revision, workload and destination filters.
- Hidden panels do not reset saved scroll when a pending reply arrives.
- Mobile dialogs explicitly anchor left, and chat releases the root's reserved
  scrollbar gutter while open. This fixes actual clipping observed in Chromium.
- Native nested-dialog Escape closes settings without dismissing the conversation.
- Price assumptions and coding evidence remain in a shared animated disclosure.

## Product manager

The answer is text first. Results use 65 px rows in the tested sizes. Only current
suggestions occupy the reply tray; its height is bounded. Usage/budget editing,
privacy and requirements stay available outside the transcript. The context bar
retains the task (including coding) and budget. Desktop widening and full-screen
mobile reading are functional, not decorative controls.

## Checks completed

- Python suite: **80 passed** (one pre-existing Starlette/httpx deprecation warning).
- Node suite: **36 passed**, including exact pricing conformance, catalog/export
  routes and chatbot destination parity. After the final hidden-panel scroll
  adjustment, the chatbot and portable suites were rerun successfully.
- Actual Chromium headless rendering, screenshots inspected internally at
  **1440 × 900**, **390 × 844** and **320 × 568**.
- Browser assertions: no horizontal transcript overflow, latest question visible,
  all product rows under 100 px (observed 65), at least 44% of viewport for chat,
  settings inside viewport, no form injected into history, Escape closes only
  settings, cancel preserves scroll, closing/reopening preserves earlier history,
  no root gutter clipping and no page JavaScript errors.
- DOM transport checks retain pending/cancel/retry and stale-response behavior;
  incoming replies preserve reading position, including while the panel is closed.
- Self-contained export uses embedded scripts, SVG and fonts; no API key or new
  external resource was introduced. The original chatbot/AGENTS.md is unchanged.

Validation logs accompany this review. Browser-only test dependencies and internal
screenshots are not included in the application or its runtime requirements.

## Not checked

No paid OpenRouter inference was run; language quality and upstream latency remain
unevaluated here. Chromium viewport checks are not physical iOS/Android keyboard,
Safari/Firefox or screen-reader testing. Portable HTML offers guided choices;
free-text chat requires the configured server as documented in chatbot/README.md.
