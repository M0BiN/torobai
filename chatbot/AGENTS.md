# Selection guide

Read the root `../AGENTS.md` first. It contains the user's complete Ponytail
policy and project-wide rules; this file adds only chatbot requirements.
Read `README.md` here for the data flow, operational limits and validation scope.

- Keep guide code in this directory. `api.py` validates input/output and makes
  one OpenRouter request; `prompt.txt` extracts needs; `static/core.js` owns
  decisions; `static/panel.js` owns the conversation. Trace the host integration
  in `app/static/app.js` and `scripts/export_catalog.py` when changing interfaces.
- OpenRouter remains the default. Keep its key on the server, bound requests,
  validate returned JSON and preserve error handling. No generated price/URL
  HTML, executable tools, automatic paid repair loop or new runtime framework.
- Reuse the effective catalog, exact quote path and `catalogFilterURL`. All
  requirements must match the same offer; unknown evidence is not verification.
  Keep `usecase=coding`, `max_cost`, workload and Batch/rental terms in links.
  Coding evidence must be published, not a scenario or a suitability guarantee.
- Ask for missing information; preserve corrections and hard needs. Guided
  choices are immediate and local. Portable HTML supports those choices only;
  free text uses the configured server. Navigation requires a user action.
- Preserve pending/retry/cancel, session-only history and catalog-revision
  guards. Old recommendation links retain their original scope. Cancellation
  stops applying a reply; it does not promise upstream billing cancellation.
- Keep quick replies outside messages and usage/requirements in the nested
  native settings dialog. Reuse TorobMotion, focus and cancellation behavior.
  Incoming replies preserve older reading positions and keep the last question
  visible when following the conversation; never scroll the document for chat.
- Scope typography and dialog CSS to chat. On mobile, anchor fixed dialogs from
  the left to avoid RTL/scrollbar-gutter overconstraint. Respect reduced motion.
- Use existing API and exported-chat tests from the root check table. Mocks
  cannot establish Persian quality or a two-turn success rate. Before public
  multi-worker hosting, apply the shared limits and spend cap in README.md.
