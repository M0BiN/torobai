# Chatbot interaction design

Research date: 2026-10-12. torobai baseline:
`b45d6a7ae52852bc07d4009a2fe3ec87f23222d0`.

**Decision:** keep the existing compact Persian guide and improve the whole turn:
acknowledgement, waiting, cancellation, clarification, recommendation and recovery.
Use one assistant-side activity row, clear result cards and a useful next action.
Keep the current FastAPI and ordinary JavaScript implementation.

This document records the source review, baseline and chosen design. The
implementation and its verification limits are documented in
[the chatbot guide](../chatbot/README.md). Apply
[the chatbot contract](../chatbot/AGENTS.md),
[product contracts](PRODUCT_CONTRACTS.md) and
[secure-development requirements](SECURE_CODING.md) during implementation.

## Review scope

The review examined relevant rendering and state-handling code in **40 distinct
GitHub repositories**, covering **85 source files**. Large files were inspected
at the functions and branches relevant to the interaction. The evidence table
links every selected file at its exact commit.

The sample includes complete chat applications, search assistants, embedded
widgets, templates and UI libraries. Some share components or ancestry; these
are not 40 independent experiments or 40 competing products of equal scope.
Older snapshots, such as Chatbot UI, RealChar and Rasa Webchat, are useful
baselines rather than recommendations to install them.

The projects were not built or run. This is a targeted source review, not a
complete code audit, visual ranking, accessibility certification or user study.
No latency, satisfaction or conversion improvement has been measured. Observations
below describe code; the choices for torobai are design judgments.

## Baseline interface

In [panel.js](../chatbot/static/panel.js), free-text submission immediately adds
the user's message. A footer status shows three animated dots,
**دارم درخواستت را بررسی می‌کنم**, and **توقف**. The send button is disabled;
the textarea can still hold a draft. The client bounds waiting at 25 seconds,
offers explicit retry and ignores superseded replies.

The server makes one non-streaming parse request. The browser then applies
validated needs and synchronously selects catalog offers using
[core.js](../chatbot/static/core.js). There is no web-search tool, streamed
answer or sequence of backend progress events. A timed sequence saying
“searching the web”, “reading sources” and “comparing prices” would not describe
this implementation.

Several foundations already exist and should remain: compact recommendation
rows, price basis in an expandable section, one quick-reply tray outside the
transcript, a separate settings dialog, a new-reply button, reading-position
preservation, session-only history and an immediate offline guided mode.

The useful changes are therefore the presentation and lifecycle of a turn,
clearer recovery, and easier inspection of why a recommendation appeared.

## Chosen experience

### One restrained visual language

Keep the existing assistant mark, Persian font, white surface, dark text and
warm accent. Use the existing `--chat-ink`, `--chat-line` and
`--chat-accent` values instead of adding another theme. Distinguish user
messages from assistant responses with spacing and alignment; avoid a large
colored container around every assistant answer.

Place the waiting row directly after the submitted message, aligned with the
assistant response. It has a static assistant mark and a small speech bubble
with three dots rising in sequence. Announce the writing status to screen readers;
show a short hint below the bubble only if the response takes longer than eight
seconds. Reduced-motion mode keeps the dots still. Remove the waiting row
immediately when the result is ready.

The composer stays at the bottom. During a request its send button becomes
**توقف دریافت پاسخ**, with a square icon and an accessible label. Keep a
44-pixel minimum target. This is the single stop control; do not duplicate it
inside the waiting row. The textarea stays editable for the next draft.
Enter while waiting must neither submit another request nor cancel the current
one. Keep composition input safe.

### Visible states must follow real events

| Actual condition | Proposed Persian copy | Behavior |
| --- | --- | --- |
| Free-text request is pending | Screen-reader status: همراه در حال نوشتن پاسخ است… | One assistant-side three-dot bubble; stop remains available. |
| Still pending after 8 seconds | پاسخ هنوز آماده نشده؛ می‌توانی منتظر بمانی یا دریافتش را متوقف کنی. | Update the same row once. This threshold is a proposed design choice, not a measured performance target. |
| Local catalog decision is ready | An immediate question or recommendation | No delay to expose a “search” or “comparison” animation. |
| A necessary detail is missing | برای برآورد هزینه، مصرف ماهانه‌ات چقدر است؟ | Ask one useful question and show the current quick choices outside the transcript. The exact question follows the missing field. |
| Recommendation is ready | گزینه‌ها بر اساس این شرایط انتخاب شده‌اند. | Show applied criteria, up to three offer cards and expandable price/evidence detail. |
| No matching offer exists | با این شرایط گزینه‌ای پیدا نشد. | Explain the limiting condition where known; offer an explicit edit. Never relax it silently. |
| User stops | دریافت پاسخ متوقف شد. | A neutral interrupted-turn state, distinct from an error; preserve needs and draft. |
| Client deadline expires | دریافت پاسخ طول کشید. دوباره تلاش کن یا با گزینه‌ها ادامه بده. | Stop motion; show explicit retry and guided continuation. |
| Rate limit is returned | درخواست‌ها زیاد شده‌اند؛ کمی بعد دوباره تلاش کن. | Keep current needs and expose recovery without an automatic paid retry. |
| Other request failure | پاسخ آماده نشد. دوباره تلاش کن یا با گزینه‌ها ادامه بده. | A restrained error state on the affected turn; no technical payload or stack trace. |
| Free text is unavailable | با انتخاب گزینه‌ها ادامه بده. | State guided-mode availability plainly and show usable choices immediately. |

The slow-response hint does not claim a new processing stage or estimate time
remaining. Clear its timer on completion, cancellation and supersession. Announce
state transitions politely, once; do not announce a ticking timer. Avoid duplicate
announcements from a live transcript and a nested status region.

Future copy such as **در حال جستجو در کاتالوگ…** is appropriate only if catalog
search becomes an observable asynchronous operation. **در حال جستجو در وب…**
requires an actual web-search feature and real operation events. Neither is
needed to polish the present guide. A percentage or multi-step progress timeline
also requires a meaningful total and completed work; elapsed time alone is not
progress.

### Make recommendations easy to assess

Keep the existing maximum of three vertically stacked offer cards. Each card
should show model identity, provider, the price with its correct billing basis,
and one short catalog-derived reason for inclusion. A reason might identify a
required supported capability or published coding evidence. Do not manufacture
a quality score, suitability guarantee or “best model” badge.

Above the cards, summarize only applied criteria. Put **ویرایش شرایط** beside
that summary, opening the existing settings dialog. This helps the user spot a
misunderstanding before following an offer. Keep an unanswered clarification
separate from an unverified essential requirement.

Keep **مبنای قیمت و جزئیات پیشنهادها** as an expandable section rather than a
new side drawer. It should expose the workload, billing mode, relevant evidence
and uncertainties already owned by the catalog. Counts refer to actual returned
options, not invented numbers of sites or models searched. Source links use
existing validated destinations and local assets.

After the answer, show at most three relevant quick actions in the existing tray.
For example, adjusting consumption opens the existing usage dialog; viewing all
matching results uses the existing filtered route. Do not offer an action until
its behavior exists. Only the latest tray is actionable, and previous result
links retain their original criteria.

### Preserve control throughout the conversation

Continue following the latest turn only while the reader is following the
conversation. If they scroll up, a completed answer exposes **پاسخ تازه** without
moving their reading position or the underlying page. Resizing the composer,
opening details and closing/reopening the panel must preserve this behavior.

Retry belongs to the failed request, uses the existing bounded context and does
not add a second identical user bubble. Preserve any different draft typed while
waiting; the current retry path clears the textarea, so this needs deliberate
handling. Stop, a new conversation and changed criteria must prevent late work
from replacing the current turn. Closing the panel alone retains pending work
and must not claim that a provider request or its billing has been canceled.

Use neutral styling for user interruption, a warning tone for delayed service or
rate limiting, and a clear error treatment for failures. State is conveyed by
text and icon as well as color. Keep focus visible, links selectable, RTL layout
intact, and Latin model names isolated. Mobile cards and actions wrap inside the
panel, while the input remains usable above the on-screen keyboard.

## Reference choices and tradeoffs

Open WebUI, shadcn's template and Onyx provide useful examples of activity copy
derived from actual state. assistant-ui, Hugging Face Chat UI and Deep Chat are
useful references for respecting reading position. Morphic, Scira and DocsGPT
show how activity and evidence can be compacted once results arrive.

Do not import those frameworks or copy their whole interfaces. torobai does not
need agent names, raw tool arguments, execution logs, message branches, voice
controls, a queued-message menu or a research sidebar for this task. Some inspected
components also use unconditional scrolling or very small controls; their presence
in a popular project is not a reason to adopt them.

Streaming can improve long generated answers, but this endpoint returns a
validated needs object. Showing partial JSON or adding another paid call merely
to animate an answer would make the product more complicated without helping
the buyer. Ready local answers should remain immediate.

## Implementation order and acceptance

1. **Complete the turn lifecycle.** Update `panel.js` and scoped
   `chatbot.css`: assistant-side pending row, one stop control, a bounded
   slow-response hint, neutral cancellation, contextual retry and draft
   preservation. Retain request and catalog-revision guards.
2. **Clarify the decision.** Add a compact applied-criteria summary and
   catalog-backed reasons while keeping price calculation and selection in
   their existing owners. Keep clarification, no matches and unverified
   requirements distinct. Do not infer provider or model quality from appearance.
3. **Verify the full interaction.** Extend the existing exported-chat test only
   for changed behavior. Check the rendered served application and portable
   guided mode at desktop 1440 px and mobile 390 px, including reduced motion,
   keyboard operation and failure states.

Required scenarios for that implementation:

| Scenario | Acceptance |
| --- | --- |
| Immediate guided choice | Result appears without a fake wait or provider call. |
| Fast free-text response | One user message and one settled assistant turn; no leftover loader. |
| Slow response, then success | Hint appears once, stop works, and no stale timer updates the completed turn. |
| Stop, then late response | Interrupted appearance remains; needs and subsequent turns are not overwritten. |
| Retry with a different draft present | Exactly one retry, no duplicate user bubble, draft retained. |
| Timeout, rate limit or invalid response | Safe recovery copy, no invented success, no hidden paid retry. |
| Read older messages during a reply | Reading position stays stable; new-reply control reaches the latest turn. |
| Close/reopen or edit criteria while pending | Correct pending lifecycle and supersession; no stale recommendation. |
| Long Persian conversation or explicit model correction | Valid bounded requests; named-model needs and corrections remain intact. |
| Missing usage, no matches or unverified condition | A specific next step with no silent relaxation or unsupported claim. |
| Mobile keyboard, keyboard-only and reduced motion | Reachable composer/actions, visible focus, no horizontal overflow or forced animation. |
| Standalone export without the API | Immediate guided choices and valid catalog links; free text stays explicitly unavailable. |

This research made no runtime changes, paid provider calls, deployment changes or
new dependencies. The proposed interface still needs implementation and rendered
verification; source inspection alone does not establish its visual quality.

## Code evidence

Each row identifies the snapshot, files inspected, observable behavior and its
relevance to this guide. Observations apply to the cited code paths rather than
every mode of the project. Linked filenames may repeat across directories; the
links preserve their full paths and commit hashes.

| # | Repository and commit | Inspected source | Observation | Decision for torobai |
| --- | --- | --- | --- | --- |
| 1 | **open-webui/open-webui** · [f8ae8a6c](https://github.com/open-webui/open-webui/commit/f8ae8a6c328946dc62cd0712961a0632574581bf) | [StatusHistory.svelte](https://github.com/open-webui/open-webui/blob/f8ae8a6c328946dc62cd0712961a0632574581bf/src/lib/components/chat/Messages/ResponseMessage/StatusHistory.svelte); [StatusItem.svelte](https://github.com/open-webui/open-webui/blob/f8ae8a6c328946dc62cd0712961a0632574581bf/src/lib/components/chat/Messages/ResponseMessage/StatusHistory/StatusItem.svelte) | Event-based latest status; expandable history; search queries and retrieved-source counts come from status data. | Adopt one short activity row. Add history only if several real operations exist. |
| 2 | **LibreChat-AI/LibreChat** · [e1dfc104](https://github.com/LibreChat-AI/LibreChat/commit/e1dfc10449ff713faffacd60273fddcfe2c0a698) | [InProgressCall.tsx](https://github.com/LibreChat-AI/LibreChat/blob/e1dfc10449ff713faffacd60273fddcfe2c0a698/client/src/components/Chat/Messages/Content/InProgressCall.tsx); [DuringRunSendButton.tsx](https://github.com/LibreChat-AI/LibreChat/blob/e1dfc10449ff713faffacd60273fddcfe2c0a698/client/src/components/Chat/Input/DuringRunSendButton.tsx) | Incomplete or errored calls render a cancellation icon. During-run composer actions distinguish steering, interruption and queueing. | Keep explicit stop and preserve a draft. The queue/steering menu exceeds this guide's single-request scope. |
| 3 | **lobehub/lobehub** · [aeee141e](https://github.com/lobehub/lobehub/commit/aeee141ec6ba5f6baabc126015e8e69b0ffa9bcd) | [StatusIndicator.tsx](https://github.com/lobehub/lobehub/blob/aeee141ec6ba5f6baabc126015e8e69b0ffa9bcd/src/features/Conversation/components/Thinking/StatusIndicator.tsx); [ContentLoading.tsx](https://github.com/lobehub/lobehub/blob/aeee141ec6ba5f6baabc126015e8e69b0ffa9bcd/src/features/Conversation/Messages/components/ContentLoading.tsx) | Operation-owned loading labels, a delayed elapsed-time display and retry metadata; a distinct compact thinking indicator. | Use a quiet, truthful waiting label. A slow-response hint is sufficient for the present request. |
| 4 | **huggingface/chat-ui** · [8e696f88](https://github.com/huggingface/chat-ui/commit/8e696f8877ca39c1525ce82b3b1f8906cfa76825) | [ToolCallsSummary.svelte](https://github.com/huggingface/chat-ui/blob/8e696f8877ca39c1525ce82b3b1f8906cfa76825/src/lib/components/chat/ToolCallsSummary.svelte); [chatScroll.svelte.ts](https://github.com/huggingface/chat-ui/blob/8e696f8877ca39c1525ce82b3b1f8906cfa76825/src/lib/utils/scroll/chatScroll.svelte.ts) | Completed tool activity collapses behind a count. Scroll management tracks conversation, turn and branch changes separately. | Keep completed detail subordinate to the answer and preserve the reader's position. |
| 5 | **vercel/chatbot** · [c2f8235e](https://github.com/vercel/chatbot/commit/c2f8235e1f3ea903ad8b7f61447c4f74164b5c58) | [messages.tsx](https://github.com/vercel/chatbot/blob/c2f8235e1f3ea903ad8b7f61447c4f74164b5c58/components/chat/messages.tsx); [multimodal-input.tsx](https://github.com/vercel/chatbot/blob/c2f8235e1f3ea903ad8b7f61447c4f74164b5c58/components/chat/multimodal-input.tsx) | Submitted requests get an assistant placeholder; streaming is tied to the last message. The composer exposes a stop action and a scroll-to-bottom control exists. | Use an assistant-side waiting slot and an explicit stop control; retain the existing new-reply button. |
| 6 | **mckaywrigley/chatbot-ui** · [81328b61](https://github.com/mckaywrigley/chatbot-ui/commit/81328b61d2a4ab597a7a057be70e785cf756d9f8) | [use-scroll.tsx](https://github.com/mckaywrigley/chatbot-ui/blob/81328b61d2a4ab597a7a057be70e785cf756d9f8/components/chat/chat-hooks/use-scroll.tsx); [chat-input.tsx](https://github.com/mckaywrigley/chatbot-ui/blob/81328b61d2a4ab597a7a057be70e785cf756d9f8/components/chat/chat-input.tsx) | Generation follows the bottom until manual scrolling. The input switches its send affordance to stop. | Preserve manual scroll and send/stop feedback; use semantic buttons and the project's motion helper. |
| 7 | **ChatGPTNextWeb/NextChat** · [839a24df](https://github.com/ChatGPTNextWeb/NextChat/commit/839a24df5d655eb8c3477fb35e8da578dc206f39) | [chat.tsx](https://github.com/ChatGPTNextWeb/NextChat/blob/839a24df5d655eb8c3477fb35e8da578dc206f39/app/components/chat.tsx); [chat.ts](https://github.com/ChatGPTNextWeb/NextChat/blob/839a24df5d655eb8c3477fb35e8da578dc206f39/app/store/chat.ts) | Tool events update tool badges; streaming switches message actions from retry to stop. Empty streaming messages get a loading view. | Adopt distinct running/success/error states; do not expose raw tool names or error JSON to shoppers. |
| 8 | **chatboxai/chatbox** · [0ac6385a](https://github.com/chatboxai/chatbox/commit/0ac6385ae1ff5bf778777826da3c5edcd55b61b8) | [MessageLoading.tsx](https://github.com/chatboxai/chatbox/blob/0ac6385ae1ff5bf778777826da3c5edcd55b61b8/src/renderer/components/chat/MessageLoading.tsx); [ToolCallPartUI.tsx](https://github.com/chatboxai/chatbox/blob/0ac6385ae1ff5bf778777826da3c5edcd55b61b8/src/renderer/components/message-parts/ToolCallPartUI.tsx) | Loading copy distinguishes file reading, webpage loading and retry. Tool rendering distinguishes stopped, paused, running and failed; durations have a minimum display threshold. | Separate user cancellation from failure. Avoid importing unrelated tool controls or elapsed-time clutter. |
| 9 | **CherryHQ/cherry-studio** · [a3fdea3d](https://github.com/CherryHQ/cherry-studio/commit/a3fdea3d57b6a2b0e279d5f1db40bd27910d4326) | [LoadingState.tsx](https://github.com/CherryHQ/cherry-studio/blob/a3fdea3d57b6a2b0e279d5f1db40bd27910d4326/src/renderer/components/chat/primitives/LoadingState.tsx); [RetryStatusBlock.tsx](https://github.com/CherryHQ/cherry-studio/blob/a3fdea3d57b6a2b0e279d5f1db40bd27910d4326/src/renderer/components/chat/messages/blocks/RetryStatusBlock.tsx) | A shared loading component has spinner/skeleton variants and polite status semantics. Retry status disappears when settled. | Reuse the project's own status surface and announce state changes accessibly; no automatic paid retries. |
| 10 | **langgenius/dify** · [0838e251](https://github.com/langgenius/dify/commit/0838e2511da0ef0953b59d90d5407e0b441e2b32) | [index.tsx](https://github.com/langgenius/dify/blob/0838e2511da0ef0953b59d90d5407e0b441e2b32/web/app/components/base/chat/chat/loading-anim/index.tsx); [agent-content.tsx](https://github.com/langgenius/dify/blob/0838e2511da0ef0953b59d90d5407e0b441e2b32/web/app/components/base/chat/chat/answer/agent-content.tsx) | A small dot loader is separate from agent content. Tool display completion depends on an observation or the responding flag. | Keep activity separate from answer content; never present an internal thought log as the buyer-facing answer. |
| 11 | **Mintplex-Labs/anything-llm** · [2a10d052](https://github.com/Mintplex-Labs/anything-llm/commit/2a10d052a1812d7be12c43f9024072cf26a27a8b) | [index.jsx](https://github.com/Mintplex-Labs/anything-llm/blob/2a10d052a1812d7be12c43f9024072cf26a27a8b/frontend/src/components/WorkspaceChat/ChatContainer/ChatHistory/StatusResponse/index.jsx); [useChatContainerQuickScroll.js](https://github.com/Mintplex-Labs/anything-llm/blob/2a10d052a1812d7be12c43f9024072cf26a27a8b/frontend/src/hooks/useChatContainerQuickScroll.js) | Activity nodes roll into one expandable block. Active status and timings derive from received nodes; chat-scroll shortcuts ignore focused text inputs. | Prefer one compact summary and preserve ordinary text editing shortcuts. |
| 12 | **infiniflow/ragflow** · [deb1235b](https://github.com/infiniflow/ragflow/commit/deb1235be41dbfd379efa9842fb38116d4a121f7) | [index.tsx](https://github.com/infiniflow/ragflow/blob/deb1235be41dbfd379efa9842fb38116d4a121f7/web/src/components/loading-dots/index.tsx); [next.tsx](https://github.com/infiniflow/ragflow/blob/deb1235be41dbfd379efa9842fb38116d4a121f7/web/src/components/message-input/next.tsx) | Three-dot loading has an accessible label. Input guards Enter during composition and prevents duplicate sends; a stop control appears during output. | Preserve IME composition, draft text and consistent keyboard/button behavior. |
| 13 | **onyx-dot-app/onyx** · [6db31b61](https://github.com/onyx-dot-app/onyx/commit/6db31b6183c9b663ffc67177324d8452a8f4f3af) | [StreamingHeader.tsx](https://github.com/onyx-dot-app/onyx/blob/6db31b6183c9b663ffc67177324d8452a8f4f3af/web/src/app/app/message/messageComponents/timeline/headers/StreamingHeader.tsx); [useTimelineHeader.ts](https://github.com/onyx-dot-app/onyx/blob/6db31b6183c9b663ffc67177324d8452a8f4f3af/web/src/app/app/message/messageComponents/timeline/hooks/useTimelineHeader.ts) | Timeline labels derive from typed packets for search, fetch and other operations; user cancellation is separate. Header details include expandable timing. | This is the reference for future real stages; the present parse endpoint cannot support this timeline. |
| 14 | **Chainlit/chainlit** · [190ea742](https://github.com/Chainlit/chainlit/commit/190ea74239d9e84b26e7c91bc2882dd038942564) | [ScrollContainer.tsx](https://github.com/Chainlit/chainlit/blob/190ea74239d9e84b26e7c91bc2882dd038942564/frontend/src/components/chat/ScrollContainer.tsx); [SubmitButton.tsx](https://github.com/Chainlit/chainlit/blob/190ea74239d9e84b26e7c91bc2882dd038942564/frontend/src/components/chat/MessageComposer/SubmitButton.tsx) | The composer switches between submit and stop. Scrolling follows only when the reader is at the bottom, with a return control. | Keep stop available without stealing the reading position. |
| 15 | **FlowiseAI/FlowiseChatEmbed** · [9f6ac519](https://github.com/FlowiseAI/FlowiseChatEmbed/commit/9f6ac5191e7f2dc81aeabd07ca6ebab74fdb9742) | [TypingBubble.tsx](https://github.com/FlowiseAI/FlowiseChatEmbed/blob/9f6ac5191e7f2dc81aeabd07ca6ebab74fdb9742/src/components/TypingBubble.tsx); [AgentReasoningBubble.tsx](https://github.com/FlowiseAI/FlowiseChatEmbed/blob/9f6ac5191e7f2dc81aeabd07ca6ebab74fdb9742/src/components/bubbles/AgentReasoningBubble.tsx) | Typing uses three small dots. A separate agent bubble renders an agent name/message and optional artifacts. | Borrow the compact visual footprint; avoid per-agent messages and unnecessary artifacts. |
| 16 | **langflow-ai/langflow** · [504c02fc](https://github.com/langflow-ai/langflow/commit/504c02fc47e76087b82b0e7cbe4186e9cdd916d4) | [ToolCallCard.tsx](https://github.com/langflow-ai/langflow/blob/504c02fc47e76087b82b0e7cbe4186e9cdd916d4/src/frontend/src/components/core/chatComponents/ToolCallCard.tsx); [toolStatus.ts](https://github.com/langflow-ai/langflow/blob/504c02fc47e76087b82b0e7cbe4186e9cdd916d4/src/frontend/src/components/core/chatComponents/toolStatus.ts) | Tool status prioritizes errors, then a resolved duration. A collapsible header carries name, state and duration; running transitions open its content. | Use explicit status derivation. Do not infer automatic collapse from the file comment: its effect only opens on running. |
| 17 | **CopilotKit/CopilotKit** · [cf326fab](https://github.com/CopilotKit/CopilotKit/commit/cf326fab12f1738f95ba23553634b9ce6fb73227) | [CopilotChatToolCallsView.tsx](https://github.com/CopilotKit/CopilotKit/blob/cf326fab12f1738f95ba23553634b9ce6fb73227/packages/react-core/src/v2/components/chat/CopilotChatToolCallsView.tsx); [CopilotChatInput.tsx](https://github.com/CopilotKit/CopilotKit/blob/cf326fab12f1738f95ba23553634b9ce6fb73227/packages/react-core/src/v2/components/chat/CopilotChatInput.tsx) | Tool output is matched by tool-call ID. The input has separate running/stop behavior and IME-aware keyboard handling. | Preserve request identity and clear control semantics. Do not adopt mid-run submission for this guide. |
| 18 | **assistant-ui/assistant-ui** · [bc7d5bab](https://github.com/assistant-ui/assistant-ui/commit/bc7d5babf991e3985112244c49ed6fe76a20cb82) | [tool-call.tsx](https://github.com/assistant-ui/assistant-ui/blob/bc7d5babf991e3985112244c49ed6fe76a20cb82/packages/ui/src/components/react/assistant-ui/elements/tool-call.tsx); [thread-viewport-auto-scroll.ts](https://github.com/assistant-ui/assistant-ui/blob/bc7d5babf991e3985112244c49ed6fe76a20cb82/packages/store/src/utils/thread-viewport-auto-scroll.ts) | Tool calls have active/completed labels with expandable detail. Scroll following can pause on user input and content resizing preserves intent. | Adopt progressive disclosure and reader control; retain vanilla JavaScript rather than adding this library. |
| 19 | **langchain-ai/agent-chat-ui** · [28cfb43a](https://github.com/langchain-ai/agent-chat-ui/commit/28cfb43a62b7179ed4065dd761e16ece8c29d983) | [tool-calls.tsx](https://github.com/langchain-ai/agent-chat-ui/blob/28cfb43a62b7179ed4065dd761e16ece8c29d983/src/components/thread/messages/tool-calls.tsx); [ai.tsx](https://github.com/langchain-ai/agent-chat-ui/blob/28cfb43a62b7179ed4065dd761e16ece8c29d983/src/components/thread/messages/ai.tsx) | Tool calls display names, IDs and argument tables; results truncate at four lines or 500 characters until expanded. The message layer can hide tool calls. | Useful developer inspection, too technical for this buyer guide. Use a plain-language basis instead. |
| 20 | **shadcn-ui/chatbot-template** · [55c9330d](https://github.com/shadcn-ui/chatbot-template/commit/55c9330d6251052c111cf93cc429efb387609b89) | [web-search-part.tsx](https://github.com/shadcn-ui/chatbot-template/blob/55c9330d6251052c111cf93cc429efb387609b89/components/parts/web-search-part.tsx); [message-scroller.tsx](https://github.com/shadcn-ui/chatbot-template/blob/55c9330d6251052c111cf93cc429efb387609b89/components/ui/message-scroller.tsx); [question-card.tsx](https://github.com/shadcn-ui/chatbot-template/blob/55c9330d6251052c111cf93cc429efb387609b89/components/question-card.tsx); [sources-part.tsx](https://github.com/shadcn-ui/chatbot-template/blob/55c9330d6251052c111cf93cc429efb387609b89/components/parts/sources-part.tsx) | Web search has separate input/output/error states. Sources are URL-filtered and deduplicated; a sticky question card accepts choices or free text. | Adopt short status copy, concise evidence and contextual answers. Keep torobai's current quick-reply tray and nested dialog. |
| 21 | **zaidmukaddam/scira** · [e1692f5b](https://github.com/zaidmukaddam/scira/commit/e1692f5bdec7ec3f6482a24e0c6cf9b483d810f9) | [tool-invocation-list-view.tsx](https://github.com/zaidmukaddam/scira/blob/e1692f5bdec7ec3f6482a24e0c6cf9b483d810f9/components/tool-invocation-list-view.tsx); [use-optimized-scroll.ts](https://github.com/zaidmukaddam/scira/blob/e1692f5bdec7ec3f6482a24e0c6cf9b483d810f9/hooks/use-optimized-scroll.ts); [multi-search.tsx](https://github.com/zaidmukaddam/scira/blob/e1692f5bdec7ec3f6482a24e0c6cf9b483d810f9/components/multi-search.tsx) | Search loading uses per-query completion annotations and received result counts. Sources have a compact header; manual scrolling suspends following. | Use actual counts only. Prefer torobai's vertical RTL cards over a horizontally scrolling query strip. |
| 22 | **miurla/morphic** · [62e0816b](https://github.com/miurla/morphic/commit/62e0816b019c5543ccc280c40ec1f020d5af4669) | [tool-section.tsx](https://github.com/miurla/morphic/blob/62e0816b019c5543ccc280c40ec1f020d5af4669/components/tool-section.tsx); [research-process-section.tsx](https://github.com/miurla/morphic/blob/62e0816b019c5543ccc280c40ec1f020d5af4669/components/research-process-section.tsx); [search-section.tsx](https://github.com/miurla/morphic/blob/62e0816b019c5543ccc280c40ec1f020d5af4669/components/search-section.tsx) | Search loading, completed results and public errors are separate. Research parts group into expandable sections; questions use a dedicated confirmation UI. | Borrow a compact process summary and an explicit missing-information question; no agent-workflow framework. |
| 23 | **ItzCrazyKns/Vane** · [348feca3](https://github.com/ItzCrazyKns/Vane/commit/348feca3e378fb4157b217724ed508dc707f853f) | [MessageBoxLoading.tsx](https://github.com/ItzCrazyKns/Vane/blob/348feca3e378fb4157b217724ed508dc707f853f/src/components/MessageBoxLoading.tsx); [MessageSources.tsx](https://github.com/ItzCrazyKns/Vane/blob/348feca3e378fb4157b217724ed508dc707f853f/src/components/MessageSources.tsx); [MessageBox.tsx](https://github.com/ItzCrazyKns/Vane/blob/348feca3e378fb4157b217724ed508dc707f853f/src/components/MessageBox.tsx) | A reply can show received research steps or a fallback waiting label. A skeleton component reserves answer shape; source cards expose three entries plus more. | Keep one waiting treatment and bounded results. Avoid showing fixed result skeletons before knowing whether a question is needed. |
| 24 | **n4ze3m/dialoqbase** · [79320da7](https://github.com/n4ze3m/dialoqbase/commit/79320da7f45cc4940eff58caef6fedd3c7994f53) | [BotChatBubble.tsx](https://github.com/n4ze3m/dialoqbase/blob/79320da7f45cc4940eff58caef6fedd3c7994f53/app/widget/src/components/BotChatBubble.tsx); [Message.tsx](https://github.com/n4ze3m/dialoqbase/blob/79320da7f45cc4940eff58caef6fedd3c7994f53/app/ui/src/components/Bot/Playground/Message.tsx) | The widget keeps reference links beside the bot answer. Playground sources collapse, while copy feedback is separate from speech controls. | Make recommendation evidence discoverable; speech controls add no necessary value here. |
| 25 | **Nutlope/llamatutor** · [5b88de25](https://github.com/Nutlope/llamatutor/commit/5b88de25bccd33524342f5ee34ca49ca38aca7f3) | [Chat.tsx](https://github.com/Nutlope/llamatutor/blob/5b88de25bccd33524342f5ee34ca49ca38aca7f3/components/Chat.tsx); [Sources.tsx](https://github.com/Nutlope/llamatutor/blob/5b88de25bccd33524342f5ee34ca49ca38aca7f3/components/Sources.tsx) | Source loading, results and source failure have separate views. The chat's loading condition can force scrolling even after the user moves away. | Borrow explicit empty/source states; reject loading-driven forced scrolling and third-party favicon requests. |
| 26 | **assafelovic/gpt-researcher** · [3582a684](https://github.com/assafelovic/gpt-researcher/commit/3582a6841fe7dc801e2a34e34ee408641aea9bce) | [LogMessage.tsx](https://github.com/assafelovic/gpt-researcher/blob/3582a6841fe7dc801e2a34e34ee408641aea9bce/frontend/nextjs/components/ResearchBlocks/elements/LogMessage.tsx); [ChatInterface.tsx](https://github.com/assafelovic/gpt-researcher/blob/3582a6841fe7dc801e2a34e34ee408641aea9bce/frontend/nextjs/components/ResearchBlocks/ChatInterface.tsx) | Received research logs render as cards or accordions. Follow-up chat has loading/error views and scrolls on each rendered-message update. | Summarize observable activity; avoid a wall of research logs and unconditional scroll. |
| 27 | **langchain-ai/open-canvas** · [0310cecd](https://github.com/langchain-ai/open-canvas/commit/0310cecd51f31b3d37a52d6d1060137da3405280) | [messages.tsx](https://github.com/langchain-ai/open-canvas/blob/0310cecd51f31b3d37a52d6d1060137da3405280/apps/web/src/components/chat-interface/messages.tsx); [composer.tsx](https://github.com/langchain-ai/open-canvas/blob/0310cecd51f31b3d37a52d6d1060137da3405280/apps/web/src/components/chat-interface/composer.tsx) | Message actions hide during a run; the composer uses running-dependent send/cancel controls and search-aware placeholders. | Keep actions appropriate to the current turn. Prefer one stable Persian placeholder over randomized slogans. |
| 28 | **chathub-dev/chathub** · [a7a2bd6e](https://github.com/chathub-dev/chathub/commit/a7a2bd6e12050d6a39fcaf30868bdfd7ccf78f22) | [ErrorAction.tsx](https://github.com/chathub-dev/chathub/blob/a7a2bd6e12050d6a39fcaf30868bdfd7ccf78f22/src/app/components/Chat/ErrorAction.tsx); [MessageBubble.tsx](https://github.com/chathub-dev/chathub/blob/a7a2bd6e12050d6a39fcaf30868bdfd7ccf78f22/src/app/components/Chat/MessageBubble.tsx) | Error codes select actionable recovery UI; message bubbles distinguish visual roles. | Map errors to useful next steps for this product, without exposing provider login/configuration flows. |
| 29 | **Shaunwei/RealChar** · [bd452d7a](https://github.com/Shaunwei/RealChar/commit/bd452d7ab164098d251935276c870ddfc14a9046) | [TextMode.js](https://github.com/Shaunwei/RealChar/blob/bd452d7ab164098d251935276c870ddfc14a9046/client/next-web/src/app/conversation/_components/TextMode.js); [Chat.js](https://github.com/Shaunwei/RealChar/blob/bd452d7ab164098d251935276c870ddfc14a9046/client/next-web/src/app/conversation/_components/Chat.js) | Text mode has a dedicated input. The conversation renders interim content, role-specific bubbles and subdued system messages; chat updates force scrolling. | Keep transient feedback visually distinct. Do not adopt forced scrolling or a voice-agent interface. |
| 30 | **e2b-dev/fragments** · [255358e4](https://github.com/e2b-dev/fragments/commit/255358e4705fe5f25c88493984e3df7363afda99) | [chat.tsx](https://github.com/e2b-dev/fragments/blob/255358e4705fe5f25c88493984e3df7363afda99/components/chat.tsx); [chat-input.tsx](https://github.com/e2b-dev/fragments/blob/255358e4705fe5f25c88493984e3df7363afda99/components/chat-input.tsx) | Loading appears as a compact line after messages. Input errors include retry and distinguish rate limits; generating exposes stop. | Borrow compact recovery next to the affected turn; preserve drafts and avoid unconditional scrolling. |
| 31 | **microsoft/BotFramework-WebChat** · [d2e9bbd9](https://github.com/microsoft/BotFramework-WebChat/commit/d2e9bbd9ac652e375e79e302d939792e315e0898) | [StackedLayoutMessageStatus.tsx](https://github.com/microsoft/BotFramework-WebChat/blob/d2e9bbd9ac652e375e79e302d939792e315e0898/packages/component/src/Activity/StackedLayoutMessageStatus.tsx); [MessageStatusLoader.tsx](https://github.com/microsoft/BotFramework-WebChat/blob/d2e9bbd9ac652e375e79e302d939792e315e0898/packages/component/src/Activity/private/MessageStatusLoader.tsx) | Message status has incomplete/published/unset classes, distinct icons and a dedicated loader component. | Distinguish completion from waiting or interruption; color alone must not communicate the state. |
| 32 | **botfront/rasa-webchat** · [d76b096a](https://github.com/botfront/rasa-webchat/commit/d76b096aa6736dfbebe129a366f1d6b560c97b29) | [index.js](https://github.com/botfront/rasa-webchat/blob/d76b096aa6736dfbebe129a366f1d6b560c97b29/src/components/Widget/components/Conversation/components/Messages/index.js); [index.js](https://github.com/botfront/rasa-webchat/blob/d76b096aa6736dfbebe129a366f1d6b560c97b29/src/components/Widget/components/Conversation/components/Sender/index.js) | Typing is a separate transcript item. Input grows up to three rows and has Enter/Shift+Enter behavior; message updates always scroll to the bottom. | Use a compact composer, but reject unconditional scroll. This older snapshot is a baseline, not a dependency recommendation. |
| 33 | **OvidijusParsiunas/deep-chat** · [6da1945e](https://github.com/OvidijusParsiunas/deep-chat/commit/6da1945ed97c8ce7c4b0b81a0072adb596e86fdb) | [scrollButton.ts](https://github.com/OvidijusParsiunas/deep-chat/blob/6da1945ed97c8ce7c4b0b81a0072adb596e86fdb/component/src/views/chat/messages/scrollButton.ts); [messageStream.ts](https://github.com/OvidijusParsiunas/deep-chat/blob/6da1945ed97c8ce7c4b0b81a0072adb596e86fdb/component/src/views/chat/messages/stream/messageStream.ts) | A scroll control can count unseen messages. Stream insertion follows only when already at the bottom and automatic scrolling is allowed. | Keep the existing new-message affordance and follow only with user intent. |
| 34 | **nlkitai/nlux** · [00007d63](https://github.com/nlkitai/nlux/commit/00007d63297151492df5a7d11fb0c78916366ac9) | [updateContentOnStatusChange.ts](https://github.com/nlkitai/nlux/blob/00007d63297151492df5a7d11fb0c78916366ac9/packages/shared/src/components/Message/utils/updateContentOnStatusChange.ts); [updateContentOnStatusChange.ts](https://github.com/nlkitai/nlux/blob/00007d63297151492df5a7d11fb0c78916366ac9/packages/shared/src/components/Composer/utils/updateContentOnStatusChange.ts) | Message rendering distinguishes streaming/completion. Waiting can leave the textarea editable while disabling submission. | Let users prepare the next message without sending a duplicate request. |
| 35 | **react-chatbotify/react-chatbotify** · [0c4779cf](https://github.com/react-chatbotify/react-chatbotify/commit/0c4779cf100ebf33e4fe5ef31d6ee8ec4becf419) | [BotTypingIndicator.tsx](https://github.com/react-chatbotify/react-chatbotify/blob/0c4779cf100ebf33e4fe5ef31d6ee8ec4becf419/src/components/ChatBotBody/BotTypingIndicator/BotTypingIndicator.tsx); [ChatMessagePrompt.tsx](https://github.com/react-chatbotify/react-chatbotify/blob/0c4779cf100ebf33e4fe5ef31d6ee8ec4becf419/src/components/ChatBotBody/ChatMessagePrompt/ChatMessagePrompt.tsx) | Typing has a themed bubble/avatar. The new-message prompt depends on unread count and whether the user is scrolling. | Keep unobtrusive unread feedback; implement actions as keyboard-accessible native buttons. |
| 36 | **enricoros/big-AGI** · [c1cfddfb](https://github.com/enricoros/big-AGI/commit/c1cfddfb6b2213c82d34ca0396662a16df3e554f) | [BlockOpUpstreamResume.tsx](https://github.com/enricoros/big-AGI/blob/c1cfddfb6b2213c82d34ca0396662a16df3e554f/src/apps/chat/components/message/BlockOpUpstreamResume.tsx); [ChatMessageList.tsx](https://github.com/enricoros/big-AGI/blob/c1cfddfb6b2213c82d34ca0396662a16df3e554f/src/apps/chat/components/ChatMessageList.tsx) | Resume, recover, local detach and upstream stop have distinct availability. In-flight state lives above message bubbles and late cleanup is guarded. | Preserve pending work across panel close/reopen; never claim client abort guarantees provider cancellation. |
| 37 | **bionic-gpt/bionic-gpt** · [c155c000](https://github.com/bionic-gpt/bionic-gpt/commit/c155c0005bb0b741288f6ad2c125217d58831206) | [streaming-chat.ts](https://github.com/bionic-gpt/bionic-gpt/blob/c155c0005bb0b741288f6ad2c125217d58831206/crates/web-assets/typescript/console/streaming-chat.ts); [empty_stream.rs](https://github.com/bionic-gpt/bionic-gpt/blob/c155c0005bb0b741288f6ad2c125217d58831206/crates/web-pages/console/empty_stream.rs) | Streaming appends plain-text deltas; final rendering is requested only on a done event. Stop/errors clear busy state; empty chat offers example prompts. | Keep untrusted output as text and show success only after valid completion. Streaming itself is unnecessary for the current JSON parser. |
| 38 | **arc53/DocsGPT** · [9c4251e3](https://github.com/arc53/DocsGPT/commit/9c4251e3bd33637913ba08e2c6f13f21ef200a09) | [ToolCallCard.tsx](https://github.com/arc53/DocsGPT/blob/9c4251e3bd33637913ba08e2c6f13f21ef200a09/frontend/src/conversation/ToolCallCard.tsx); [ResearchProgress.tsx](https://github.com/arc53/DocsGPT/blob/9c4251e3bd33637913ba08e2c6f13f21ef200a09/frontend/src/conversation/ResearchProgress.tsx) | Tool cards constrain/wrap content and actions. Research progress counts completed plan steps and collapses at synthesis/completion. | Borrow compact result hierarchy. A step timeline needs real plan state that torobai does not have. |
| 39 | **khoj-ai/khoj** · [ae229ca8](https://github.com/khoj-ai/khoj/commit/ae229ca894c0b80ad84664afcfdde523b5e87057) | [chatMessage.tsx](https://github.com/khoj-ai/khoj/blob/ae229ca894c0b80ad84664afcfdde523b5e87057/src/interface/web/app/components/chatMessage/chatMessage.tsx); [chatFunctions.ts](https://github.com/khoj-ai/khoj/blob/ae229ca894c0b80ad84664afcfdde523b5e87057/src/interface/web/app/common/chatFunctions.ts) | Received status/thought/reference events have separate processing. End-response marks completion; activity text uses a distinct icon and presentation. | If events are ever added, separate activity and evidence from answer text. Do not render a raw internal reasoning feed. |
| 40 | **baptisteArno/typebot.io** · [e77b21c5](https://github.com/baptisteArno/typebot.io/commit/e77b21c5b385ffe49006a742dd47b52fb6bfa79c) | [LoadingChunk.tsx](https://github.com/baptisteArno/typebot.io/blob/e77b21c5b385ffe49006a742dd47b52fb6bfa79c/packages/embeds/js/src/components/ConversationContainer/LoadingChunk.tsx); [TypingBubble.tsx](https://github.com/baptisteArno/typebot.io/blob/e77b21c5b385ffe49006a742dd47b52fb6bfa79c/packages/embeds/js/src/components/TypingBubble.tsx) | A loading chunk aligns with the host avatar; a separate three-dot component provides a small waiting footprint. | Match waiting to the assistant's visual identity; do not introduce a simulated typing delay. |
