# v0.26 — a readable conversation

## Buyer

The last question must remain visible alongside a short answer. A returning
reader must find earlier text and the original recommendation links. Large
three-card stacks, duplicate button groups and forms inside each reply made
that unnecessarily difficult in v0.25.

## Implementation scope

Keep the existing parser, catalog, pricing and routing. Replace the presentation
in chatbot/static/panel.js and chatbot.css; update short core.js copy and the
header trigger. Run the same export, chatbot and portable regression checks.
No new runtime package, model call, data fixture or framework is needed.

- Draw one compact SVG conversation mark and use it in the launcher/header.
- Plain assistant text and small user bubbles form the transcript.
- Three recommendation rows share one billing-period label and expandable basis.
- Only the current quick replies appear above the composer.
- Usage, budget, requirements and privacy use a separate native dialog, animated
  by TorobMotion. Cancel does not add a message or alter requirements.
- Keep old recommendation URLs with their original filter scope and catalog
  revision. Reject outdated quotes before navigation.
- Anchor a ready reply near the most recent question. Never force a reader down
  from older history. Show a new-message button instead.
- Keep the entire visible conversation in memory until reset; only the bounded
  recent context is sent to the parser. Mobile fills the screen; desktop can widen.

## Risks checked

1. Quick replies in settings must not overwrite the composer's choice mapping.
2. Shared dialog paragraph/textarea styles must not leak into chat colors/RTL.
3. Nested-dialog Escape and focus restoration must leave the conversation open.
4. The page's stable scrollbar gutter must not clip a mobile dialog or sheet.
5. Old recommendation links must not adopt the newest answer's usage/provider.
6. Hidden price details must retain units, assumptions, evidence and unknowns.
7. Free text remains unavailable without a configured server; the portable file
   must not pretend that a live language model is connected.
