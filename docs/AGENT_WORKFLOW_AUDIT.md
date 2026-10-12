# What torobai can learn from 60 agentic repositories

Research date: **12 October 2026**. Project snapshot: [`c21ff5c`](https://github.com/M0BiN/torobai/tree/c21ff5c6ce20742c726e1415f58dfa49c3751995).

The main gap is not a missing agent framework. It is the distance between the user's instructions, the context a coding tool actually loads, and the evidence provided when a task is finished. The existing chatbot already has useful boundaries. Keep those; improve instruction maintenance and verification before adding infrastructure.

This report responds to the request to investigate and compare. It adds research documentation only. It does not install the surveyed tools, rewrite application code, change agent permissions, replace the user's rules or claim production certification.

## What was reviewed

**60 distinct repositories and 120 selected file paths**, pinned to commits. Reading focused on instruction discovery, scoped guidance, code ownership, tool permissions, model-output validation, cancellation, testing, evaluations and publication. The appendix identifies what was learned from every repository; the [evidence ledger](evidence/agent-workflow-repositories-20261012.json) records commits, file hashes and the exact ranges read.

These are several different kinds of evidence: official coding tools and their public documentation, SDKs and implementations, evaluation/protocol projects, and established applications with explicit agent guidance. They are not 60 competing implementations of torobai. Public instructions show intended practice; selected source code and tests give narrower implementation evidence. None proves that every contribution follows the rules.

Canonical repositories and archive status were checked. Archived `microsoft/vscode-copilot-chat` and `RooCodeInc/Roo-Code` were excluded. Moved repositories were counted only under `agentsmd/agents.md`, `aaif-goose/goose` and `calcom/cal.diy`. Related projects such as OpenCode/Kilo and Gemini CLI/Qwen Code are identified rather than treated as independent research trials. Stars are retained in the ledger as context, not a correctness ranking.

No third-party project was installed or executed. Some files were read completely; larger files were inspected only in the listed sections. Zed's two paths are symlinks to `.rules`; Agno's `AGENTS.md` resolves to `CLAUDE.md`. There are **119 distinct resolved files**. The ledger records both path and resolved-content hashes, and range links open the actual content. This is a source-based comparative review, not 120 independent full-file audits.

## The supplied Ponytail file was present, but presence was not enough

The uploaded `agents.md(2).txt` was read and compared with the repository. After newline normalization, it exactly matches both [chatbot/AGENTS.md](../chatbot/AGENTS.md) and [docs/ORIGINAL_DEVELOPER_RULES.md](ORIGINAL_DEVELOPER_RULES.md). Its normalized SHA-256 is `0aba9e067ab1dd34ed698b278f67edd04c57a1b77888fead573da8a25e0dde84`.

The root [AGENTS.md, lines 187–209](https://github.com/M0BiN/torobai/blob/c21ff5c6ce20742c726e1415f58dfa49c3751995/AGENTS.md#L187-L209) also summarizes its main principles, and [lines 330–339](https://github.com/M0BiN/torobai/blob/c21ff5c6ce20742c726e1415f58dfa49c3751995/AGENTS.md#L330-L339) explicitly require an ending that states unchecked behavior and material risks. It would therefore be inaccurate to explain every failure as a missing file. The required behavior was already specified; adding another copy would not resolve failure to follow it.

There are two concrete context problems:

1. **Current rules and superseded history are mixed.** The root file is 475 lines and 31,298 bytes. Its v0.14 section preserves pagination scroll and prescribes delays; v0.15 removes unconditional delays; v0.16 restores smooth scrolling to the first item for page-only changes. The later rules explain precedence, but every task must reconstruct that history. Benchmark instructions have similar version layering. The root should state the current contract; historical reasons belong in design/review documents.
2. **Instruction loading has real limits.** Root `AGENTS.md` plus `chatbot/AGENTS.md` totals 34,049 bytes, above Codex's documented default combined project-guidance budget of 32 KiB. A CLI session starting inside `chatbot/` with that default can receive an incomplete chain. The outcome depends on the working directory, overrides, configuration and tool version; this audit did not reproduce earlier sessions or establish that truncation caused them.

The [Codex loading guide](https://developers.openai.com/codex/guides/agents-md) and the implementation reviewed in source **01** support the second finding. The [Claude Code memory guide](https://code.claude.com/docs/en/memory) recommends concise standing instructions and explains that imports organize content without reducing its context cost. Current Claude Code supports AGENTS.md in specified configurations; the existing `CLAUDE.md` with `@AGENTS.md` remains a supported compatibility mechanism. The [GitHub Copilot guide](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions) also documents agent instruction files. Missing a separate filename for every vendor is not automatically a defect. Check the actual client before adding adapters.

Ponytail's practical meaning is to inspect affected callers, reuse existing code, complete the real change, preserve validation and accessibility, check meaningful behavior, and describe the remaining limits. It is not permission to skip a necessary caller or trust-boundary check in pursuit of a short diff.

## What is already sound

| Existing behavior | Project evidence | Why it should stay |
| --- | --- | --- |
| One shared policy entry point with a Claude import | Root `AGENTS.md` and `CLAUDE.md` | Comparable to Sentry's adapter; fix the content rather than creating competing copies. |
| Clear product scope | Root `AGENTS.md:138–146` | Comparison and supplier handoff are explicit. A gateway, wallet or execution agent is a separate product decision. |
| Bounded LLM responsibility | `chatbot/prompt.txt`, `chatbot/api.py:161–190` | The LLM extracts needs into a schema. Existing code owns prices, catalog matching and destinations. |
| Validation at the server boundary | `chatbot/api.py:27–129,193–224` | Strict fields, finite values, body limits, output validation and generic errors reduce what an invalid response can affect. |
| Limited paid work and private context | `chatbot/api.py:132–224`, `chatbot/README.md:129–145` | Server-side key, bounded history, timeouts and process-local limits already exist; no application transcript persistence is introduced. |
| Deterministic contract and interaction tests | `chatbot/tests/test_api.py`, `chatbot/tests/test_chatbot.cjs`, `tests/test_portable.cjs` | Provider wire format, pricing/destination parity and stale replies can be checked without billing or model randomness. |
| Prior rendered UI evidence | `docs/REVIEW_V026.md:34–60`, `docs/VALIDATION_V026_BROWSER.json` | Actual Chromium checks were recorded at desktop and mobile sizes. This is stronger than assuming every past check was only a DOM test. |
| CI before Pages publication | `.github/workflows/checks.yml` | Tests, export and publication are ordered; deployment permissions are separated from the test job. |

These are observed structures and prior recorded checks, not a new live security assessment. In particular, a server-side key and origin checks do not authenticate callers or eliminate all abuse.

## The gaps that matter for this project

P1 means the next relevant improvement; P2 means conditional work when that boundary changes. These are not vulnerability severity labels or claims that the application is currently failing every case.

| Priority | Gap and evidence | Smallest useful change | Acceptance evidence |
| --- | --- | --- | --- |
| P1 | Root instructions mix current behavior and release history; 34,049-byte root/chat chain can exceed default loading budget. | Keep the user's original policy intact, expose it clearly at project entry, consolidate current product rules and move superseded history out of always-loaded guidance. Reuse existing design/review docs. | Clean sessions in the coding tools actually used identify the loaded rules and correctly apply pagination, cache and Ponytail constraints. A small file alone is not acceptance. Sources 01, 02, 12–14, 55, 59. |
| P1 | Saving the policy has been treated as a substitute for following it; the existing finish contract is explicit. | Use a short task-specific scope and completion check in the working process: affected callers, reused implementation, relevant evidence, unchecked behavior. No new agent framework or repetitive report files. | A small fix includes necessary callers and export, introduces no unrelated features, and ends with truthful evidence and limits. Sources 04, 25, 31, 39, 53, 55. |
| P1 | No measured live Persian understanding or conversation-efficiency result. `chatbot/README.md:169–171` explicitly records this. | Add a small versioned buyer-task dataset and an opt-in evaluator around the existing parser/decision path. Separate fixed contract tests from live model runs. | Report constraint retention, correct filtered destination, clarification quality, turns to a usable result, latency and usage, tied to model/prompt/catalog versions. Sources 06, 19, 22, 28, 42, 52. |
| P1 on the next UI change | CI runs Node/Linkedom interactions, while real rendering is documented separately. The CI step title says browser interactions, which can obscure the distinction. | Name checks accurately; reuse a small rendered-browser scenario set for affected flows at desktop/mobile sizes. Extend automation only where it resolves repeated regressions. | Observe RTL layout, overflow, focus, reduced motion, scrolling and pending/cached states in actual rendered pages; distinguish portable and served behavior. Sources 23, 24, 33, 47, 56, 60. |
| P2 before a public paid backend or multiple workers | Rate limits are process-local; key-level spend protection is an operational instruction, not an application-wide budget. `chatbot/api.py:132–152`, `chatbot/README.md:139–145`. | Apply the documented shared edge limits and account spend cap. Add only minimal aggregate request status, latency and usage if operationally needed; do not log message bodies. | Concurrent requests across workers cannot bypass the intended shared limit; configured spend protection is verified; unavailable usage is reported as unknown. Sources 34, 35, 38, 40, 41, 43, 50. |
| P2 on CI maintenance | Actions use moving major tags; direct Python versions are pinned but transitive dependencies are not fully locked. | Pin reviewed action commits with readable version comments. Adopt a reproducible Python resolution only with an update procedure; retain the existing npm lock. | A clean install and the current test/export flow succeed with the recorded resolution. No unrelated version downgrade or dependency migration. Sources 07, 11, 20, 53. |
| P2 when cancellation or state changes | UI cancellation discards replies but does not guarantee upstream billing stops; existing docs correctly say so. | Preserve the limitation and existing stale-response guards. Test any new state transition against late replies and changed catalog revisions. | Cancel, retry, navigation and model-result arrival do not overwrite current intent; no false promise about upstream cancellation. Sources 32, 48, 49. |
| P2 when evidence/data changes | Model benchmark quality, buyer-guide quality and infrastructure uptime are different claims. Existing benchmark provenance and scenario distinctions must remain intact. | Keep measured, cited and scenario data separate; version guide evaluations separately from model benchmark tables. | A parser passes neither a language evaluation nor a model capability benchmark merely because mocks return valid JSON. Sources 06, 28, 42, 51, 52. |

## A minimal instruction structure

Keep the existing stack and files. The intended arrangement is a concise root entry that prioritizes the user's unchanged Ponytail policy, current invariants, code ownership and exact commands. `CLAUDE.md` remains a thin import. Child instructions should contain only genuinely local requirements. Detailed motion, pricing and chatbot contracts belong in the existing relevant documentation and load when the task touches them.

There is a choice to make when implementing consolidation: preserve `docs/ORIGINAL_DEVELOPER_RULES.md` verbatim as the canonical original and require it to be read first, or include that original text directly in the root policy and make the archival location clearly secondary. Do not silently rewrite its meaning, keep several editable authorities, or assume a Markdown link is an automatic import in every client. Confirm actual loading with a clean session and the installed client version. Do not change global agent settings to make a repository-local fix work.

The existing `Makefile` already provides a full check command. Point to it and to relevant focused commands; do not create another wrapper that drifts. Task-specific impact checking should remain lightweight:

| Change | Reach to inspect | Suitable proof |
| --- | --- | --- |
| Price, units or eligibility | Python pricing, compiled catalog, JS evaluator, product details, chat links and export | Existing conformance and destination tests with a meaningful boundary case. |
| Navigation, animation or chat layout | Shared motion/navigation, panel state, keyboard/focus, mobile and export | Focused DOM behavior plus actual rendering of affected states. |
| Prompt, model or needs schema | API validation, prompt, core decision, correction/reference handling and parser fixtures | Deterministic negative/positive cases plus the opt-in Persian evaluation. |
| Text, README or research report | Claims, links, referenced files and images | Readability, link/path and diff checks. Follow existing required export gates without claiming this tests language quality. |

A policy-loading acceptance check should use concrete cases: page-only pagination scrolls to the first item; applying usage preserves position; cached data does not get a new artificial spinner; prices and URLs are computed by existing code; the final response names what was not checked. Correctly listing filenames is useful but insufficient proof of adherence.

## What a Persian guide evaluation should cover

Start with roughly 24–30 hand-reviewed cases, extended only when real failures are found. This is a proposed initial dataset, not an existing benchmark or a measured sample of users. Include Persian numerals, common spelling variations, mixed Persian/English names, toman/rial ambiguity, input/output token amounts, minutes for ASR, instant versus Batch, budget periods, coding with constraints, Persian translation, open weights plus hosted API, license ambiguity, GPU memory per device, compound tasks, corrections, references to previous cards, unavailable products and attempts to inject instructions into user text.

For each case, record the starting needs, the user turn, acceptable parsed fields, constraints that must remain, when a clarification is necessary, and the expected catalog/filter destination or acceptable destination set. Validate against the frozen catalog instead of a free-form model judge for objective fields. Human review is appropriate for natural Persian and whether a question is helpful. Any subjective judge must be calibrated; it is not ground truth by default.

Report the rate of constraint-preserving valid destinations, unnecessary/missing clarifications, turns to an actionable result, failures, latency and token usage when available. Log model identifier, prompt hash, catalog hash and run settings. Prefer synthetic or explicitly consented examples to private transcripts. No invented success percentage, no universal two-turn guarantee and no automatic paid retry loop. A model change should pass this same task set before its results are compared with the previous configuration.

## What should not be added just to look agentic

This investigation does not justify multi-agent orchestration, a vector database, long-term personal memory, filesystem/shell tools in buyer chat, autonomous purchases, an MCP/A2A/ACP integration, an inference gateway or a replacement frontend framework. Those solve different needs and add boundaries that would need their own justification and tests. Many useful upstream practices are simpler: clear ownership, explicit inputs, bounded work, narrow tests and honest completion claims.

Likewise, upstream instructions to bypass approvals or automatically publish changes are not project requirements. External files were read as evidence, never adopted as authority over this task. More configuration files, hooks and skills would not by themselves fix the user's complaint.

## Repository-by-repository findings

Every file link below is pinned to the reviewed commit. The linked anchor opens the first reviewed range; additional reviewed ranges are listed next to it and in the ledger. Findings are paraphrased and intentionally narrower than a whole-project endorsement.

### Tool vendors and shared instruction formats

**01. [openai/codex](https://github.com/openai/codex)**

Instruction discovery is implemented as ordered, scoped file loading with a byte budget. **For torobai:** Verify the instruction chain for the actual working directory; a file existing in Git is insufficient. Do not infer this session used the CLI defaults.

Evidence: [`README.md`](https://github.com/openai/codex/blob/a9b0815167c27ab13719dd12d13b63e02b70d221/README.md#L1-L81) (read: 1–81); [`codex-rs/core/src/agents_md.rs`](https://github.com/openai/codex/blob/a9b0815167c27ab13719dd12d13b63e02b70d221/codex-rs/core/src/agents_md.rs#L1-L42) (read: 1–42, 61–88, 125–178, 272–298).

**02. [openai/skills](https://github.com/openai/skills)**

Skill metadata, instructions and supporting references load at different levels of detail. **For torobai:** Keep standing rules short and load task-specific procedures when needed. Do not install a skill catalog for this small application.

Evidence: [`contributing.md`](https://github.com/openai/skills/blob/49f948faa9258a0c61caceaf225e179651397431/contributing.md#L1-L11) (read: 1–11); [`skills/.system/skill-creator/SKILL.md`](https://github.com/openai/skills/blob/49f948faa9258a0c61caceaf225e179651397431/skills/.system/skill-creator/SKILL.md#L26-L46) (read: 26–46, 84–141).

**03. [agentsmd/agents.md](https://github.com/agentsmd/agents.md)**

A predictable instruction entry point records setup commands and repository-specific pitfalls. **For torobai:** Make current commands easy to find. The Next.js development advice in this repository is not applicable to our FastAPI application.

Evidence: [`AGENTS.md`](https://github.com/agentsmd/agents.md/blob/d001185d792eb6402a58e4cbef1c228b309ec25d/AGENTS.md#L1-L43) (read: 1–43); [`README.md`](https://github.com/agentsmd/agents.md/blob/d001185d792eb6402a58e4cbef1c228b309ec25d/README.md#L1-L49) (read: 1–49).

**04. [openai/openai-agents-python](https://github.com/openai/openai-agents-python)**

Agent contributions are scoped by affected interfaces, trust boundaries and test tiers. **For torobai:** Preserve our existing boundaries and use the smallest relevant checks. A long upstream AGENTS.md is not itself a model of concise instructions.

Evidence: [`AGENTS.md`](https://github.com/openai/openai-agents-python/blob/125efa029b4bfd84238bd2c4fd69c3406f802663/AGENTS.md#L1-L214) (read: 1–214); [`tests/README.md`](https://github.com/openai/openai-agents-python/blob/125efa029b4bfd84238bd2c4fd69c3406f802663/tests/README.md#L23-L46) (read: 23–46).

**05. [openai/openai-cookbook](https://github.com/openai/openai-cookbook)**

Notebook checks target changed files and distinguish structural validation from execution. **For torobai:** Label what a check actually proves; do not describe a DOM check as a rendered browser test or silently run paid examples.

Evidence: [`AGENTS.md`](https://github.com/openai/openai-cookbook/blob/5bd6cb40b6b84b69b2032d810610aa85064102df/AGENTS.md#L1-L50) (read: 1–50); [`.github/scripts/check_notebooks.py`](https://github.com/openai/openai-cookbook/blob/5bd6cb40b6b84b69b2032d810610aa85064102df/.github/scripts/check_notebooks.py#L1-L61) (read: 1–61).

**06. [openai/evals](https://github.com/openai/evals)**

Evaluations combine datasets and scoring; model-graded criteria need calibration against human judgment. **For torobai:** Create a small Persian task set and score decisions against known constraints. Do not reuse historical model choices as current recommendations.

Evidence: [`README.md`](https://github.com/openai/evals/blob/8eac7a7de5215c907fbddc30efdaf316913eccdd/README.md#L1-L100) (read: 1–100); [`docs/build-eval.md`](https://github.com/openai/evals/blob/8eac7a7de5215c907fbddc30efdaf316913eccdd/docs/build-eval.md#L1-L21) (read: 1–21, 64–93).

**07. [anthropics/claude-code](https://github.com/anthropics/claude-code)**

Workflow hardening is backed by a script that checks job-level policy, not only prose. **For torobai:** Enforce critical CI boundaries mechanically where useful. This public distribution repository is not the complete Claude Code implementation.

Evidence: [`CLAUDE.md`](https://github.com/anthropics/claude-code/blob/3deb873687379f0c199a69fdaccc65f0865f7a29/CLAUDE.md#L1-L40) (read: 1–40); [`.github/scripts/check_workflow_hardening.py`](https://github.com/anthropics/claude-code/blob/3deb873687379f0c199a69fdaccc65f0865f7a29/.github/scripts/check_workflow_hardening.py#L231-L275) (read: 231–275, 277–310).

**08. [anthropics/skills](https://github.com/anthropics/skills)**

Skill authoring includes trigger selection, realistic examples and evaluation. **For torobai:** Only extract a reusable procedure after a repeated need exists. This collection is not a blanket security or licensing endorsement.

Evidence: [`README.md`](https://github.com/anthropics/skills/blob/dbd4588f9e1033efb41dad4bef2f7947c8993d44/README.md#L1-L96) (read: 1–96); [`skills/skill-creator/SKILL.md`](https://github.com/anthropics/skills/blob/dbd4588f9e1033efb41dad4bef2f7947c8993d44/skills/skill-creator/SKILL.md#L45-L115) (read: 45–115, 141–162).

**09. [anthropics/claude-agent-sdk-python](https://github.com/anthropics/claude-agent-sdk-python)**

Tool permission callbacks have explicit allow/deny results and invocation context. **For torobai:** Separate coding-agent permissions from buyer-chat capabilities. Our chat should not gain shell or purchase tools to imitate an SDK.

Evidence: [`CLAUDE.md`](https://github.com/anthropics/claude-agent-sdk-python/blob/b6e9d12fe1cc98dde988ab7b7713c1feeee50c6c/CLAUDE.md#L1-L82) (read: 1–82); [`src/claude_agent_sdk/types.py`](https://github.com/anthropics/claude-agent-sdk-python/blob/b6e9d12fe1cc98dde988ab7b7713c1feeee50c6c/src/claude_agent_sdk/types.py#L221-L286) (read: 221–286).

**10. [anthropics/claude-cookbooks](https://github.com/anthropics/claude-cookbooks)**

Cookbook auditing uses specific review criteria and evidence from the submitted work. **For torobai:** Review setup, claims and examples against actual behavior. Do not invent quality scores or copy notebook ceremony into every change.

Evidence: [`CLAUDE.md`](https://github.com/anthropics/claude-cookbooks/blob/9c1e493ddd2b82df399d2a61b9c806c539e18be6/CLAUDE.md#L1-L100) (read: 1–100); [`.claude/skills/cookbook-audit/SKILL.md`](https://github.com/anthropics/claude-cookbooks/blob/9c1e493ddd2b82df399d2a61b9c806c539e18be6/.claude/skills/cookbook-audit/SKILL.md#L8-L38) (read: 8–38, 69–95).

**11. [anthropics/claude-code-action](https://github.com/anthropics/claude-code-action)**

Action cleanup revokes temporary credentials and removes sensitive setup even after failures. **For torobai:** Preserve a separate, narrowly privileged publication job. An autonomous agent in CI is not required for our current workflow.

Evidence: [`CLAUDE.md`](https://github.com/anthropics/claude-code-action/blob/1d6de8cb0c237e7c15e9e1bdf973826ebae490cc/CLAUDE.md#L1-L58) (read: 1–58); [`action.yml`](https://github.com/anthropics/claude-code-action/blob/1d6de8cb0c237e7c15e9e1bdf973826ebae490cc/action.yml#L421-L459) (read: 421–459).

**12. [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official)**

Instruction maintenance looks for actionable commands, architecture guidance and targeted corrections. **For torobai:** Remove superseded instructions instead of appending another version block. Marketplace inclusion does not prove a plugin is safe or suitable.

Evidence: [`README.md`](https://github.com/anthropics/claude-plugins-official/blob/f359d43b406057f1a8cdbc4ea93b827642c162e6/README.md#L1-L90) (read: 1–90); [`plugins/claude-md-management/skills/claude-md-improver/SKILL.md`](https://github.com/anthropics/claude-plugins-official/blob/f359d43b406057f1a8cdbc4ea93b827642c162e6/plugins/claude-md-management/skills/claude-md-improver/SKILL.md#L35-L56) (read: 35–56, 95–119, 144–179).

**13. [google-gemini/gemini-cli](https://github.com/google-gemini/gemini-cli)**

Context is hierarchical and inspectable; project memory supports imports and reloads. **For torobai:** Check the actual loaded instructions in each tool we use. Add a Gemini adapter only when needed, rather than keeping another full policy copy.

Evidence: [`GEMINI.md`](https://github.com/google-gemini/gemini-cli/blob/9b6e0265d16bbd29ca51e33c9e0c01dc4cec5e83/GEMINI.md#L1-L90) (read: 1–90); [`docs/cli/gemini-md.md`](https://github.com/google-gemini/gemini-cli/blob/9b6e0265d16bbd29ca51e33c9e0c01dc4cec5e83/docs/cli/gemini-md.md#L1-L116) (read: 1–116).

**14. [google/adk-python](https://github.com/google/adk-python)**

A short root file routes architecture questions to a dedicated reference. **For torobai:** Use an ownership map for HTTP, pricing, UI, export and chat. Routing to existing documentation is preferable to a new orchestration framework.

Evidence: [`AGENTS.md`](https://github.com/google/adk-python/blob/bca4a425b1b0abccddf8af26735773394a808427/AGENTS.md#L1-L30) (read: 1–30); [`.agents/skills/adk-architecture/SKILL.md`](https://github.com/google/adk-python/blob/bca4a425b1b0abccddf8af26735773394a808427/.agents/skills/adk-architecture/SKILL.md#L1-L77) (read: 1–77).

**15. [google-github-actions/run-gemini-cli](https://github.com/google-github-actions/run-gemini-cli)**

The action passes prompts as data and cleans temporary state; the reviewed invocation also uses --yolo. **For torobai:** Reuse careful input and cleanup handling, not permission bypass. An official example still needs a task-specific review before adoption.

Evidence: [`GEMINI.md`](https://github.com/google-github-actions/run-gemini-cli/blob/387c8ddb7a72078825da941758b811b9153c71e8/GEMINI.md#L1-L39) (read: 1–39); [`action.yml`](https://github.com/google-github-actions/run-gemini-cli/blob/387c8ddb7a72078825da941758b811b9153c71e8/action.yml#L275-L340) (read: 275–340, 417–438).

**16. [github/copilot-cli](https://github.com/github/copilot-cli)**

Public documentation and release notes describe permissions, sandboxing and session behavior. **For torobai:** Record the installed tool version and test local loading. These are documented behaviors, not an audit of a publicly available CLI implementation.

Evidence: [`README.md`](https://github.com/github/copilot-cli/blob/dcdc0273c0250d8b32677ca99bc0e1f5006daa89/README.md#L1-L65) (read: 1–65); [`changelog.md`](https://github.com/github/copilot-cli/blob/dcdc0273c0250d8b32677ca99bc0e1f5006daa89/changelog.md#L1-L35) (read: 1–35, 146–173).

**17. [github/awesome-copilot](https://github.com/github/awesome-copilot)**

The catalog defines scoped instruction files and validates their metadata and structure. **For torobai:** Use narrow file scopes where the client supports them. A security checklist in a catalog does not enforce application security.

Evidence: [`AGENTS.md`](https://github.com/github/awesome-copilot/blob/e2563c8f17b55b50d142fe89a5c6a25a4b70692d/AGENTS.md#L1-L65) (read: 1–65); [`instructions/security-and-owasp.instructions.md`](https://github.com/github/awesome-copilot/blob/e2563c8f17b55b50d142fe89a5c6a25a4b70692d/instructions/security-and-owasp.instructions.md#L1-L65) (read: 1–65).

**18. [github/spec-kit](https://github.com/github/spec-kit)**

Shared instruction content is separated from tool-specific integration and discovery metadata. **For torobai:** Retain one canonical policy with thin adapters. Full specification generation would add unnecessary ceremony to a README or small bug fix.

Evidence: [`AGENTS.md`](https://github.com/github/spec-kit/blob/0443760542e7e5269724744a2ac55c4bd386d095/AGENTS.md#L1-L66) (read: 1–66); [`design/integration.md`](https://github.com/github/spec-kit/blob/0443760542e7e5269724744a2ac55c4bd386d095/design/integration.md#L1-L80) (read: 1–80, 365–384).

**19. [github/copilot-sdk](https://github.com/github/copilot-sdk)**

A test harness starts the runtime with a replay proxy and reports unexpected network behavior. **For torobai:** Keep repeatable contract tests separate from live provider evaluation. There is no reason to migrate our chatbot to this SDK.

Evidence: [`AGENTS.md`](https://github.com/github/copilot-sdk/blob/6be623b01b194a61466385e3f708639ec98ce8ac/AGENTS.md#L1-L90) (read: 1–90); [`test/harness/server.ts`](https://github.com/github/copilot-sdk/blob/6be623b01b194a61466385e3f708639ec98ce8ac/test/harness/server.ts#L1-L69) (read: 1–69).

**20. [github/gh-aw](https://github.com/github/gh-aw)**

Security guidance distinguishes untrusted data from shell code and recommends immutable action references. **For torobai:** Pin CI dependencies deliberately and keep secrets out of untrusted execution. Do not copy upstream automatic-push rules into our authorization policy.

Evidence: [`AGENTS.md`](https://github.com/github/gh-aw/blob/be37249295120450b69bbe8d7de57eae3508781b/AGENTS.md#L1-L90) (read: 1–90); [`.github/skills/developer-security/SKILL.md`](https://github.com/github/gh-aw/blob/be37249295120450b69bbe8d7de57eae3508781b/.github/skills/developer-security/SKILL.md#L21-L68) (read: 21–68, 229–282).

### Coding tools and integrations

**21. [microsoft/vscode](https://github.com/microsoft/vscode)**

The root AGENTS.md is a thin pointer to a shared guide that describes architectural ownership. **For torobai:** Make the relevant subsystem discoverable without duplicating instructions or introducing new architectural layers.

Evidence: [`AGENTS.md`](https://github.com/microsoft/vscode/blob/ff00e788322523ee1e9e8ee2c9bb4b89af93a3c2/AGENTS.md#L1-L5) (read: 1–5); [`.github/copilot-instructions.md`](https://github.com/microsoft/vscode/blob/ff00e788322523ee1e9e8ee2c9bb4b89af93a3c2/.github/copilot-instructions.md#L1-L48) (read: 1–48).

**22. [vercel/ai](https://github.com/vercel/ai)**

Provider mocks make model-dependent code testable with deterministic responses. **For torobai:** Our MockTransport tests already follow this idea. Add a separate language-quality evaluation rather than replacing FastAPI with a new SDK.

Evidence: [`AGENTS.md`](https://github.com/vercel/ai/blob/ba05943b69ad070558bb5bc912da99ec66d7d263/AGENTS.md#L1-L65) (read: 1–65); [`content/docs/03-ai-sdk-core/55-testing.mdx`](https://github.com/vercel/ai/blob/ba05943b69ad070558bb5bc912da99ec66d7d263/content/docs/03-ai-sdk-core/55-testing.mdx#L1-L60) (read: 1–60).

**23. [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills)**

A focused design-review skill identifies input files, its review source and actionable file-level findings. **For torobai:** Use explicit UX acceptance criteria for affected screens. React-oriented packages are not a reason to rewrite our vanilla JavaScript interface.

Evidence: [`AGENTS.md`](https://github.com/vercel-labs/agent-skills/blob/063bee94c3f4df8453406c830b0a7df0f2860278/AGENTS.md#L1-L65) (read: 1–65); [`skills/web-design-guidelines/SKILL.md`](https://github.com/vercel-labs/agent-skills/blob/063bee94c3f4df8453406c830b0a7df0f2860278/skills/web-design-guidelines/SKILL.md#L1-L39) (read: 1–39).

**24. [vercel-labs/agent-browser](https://github.com/vercel-labs/agent-browser)**

Browser work follows observation, action and a fresh snapshot, with waits tied to page state. **For torobai:** For UI changes, verify the rendered page and loading states. Do not replace observation with fixed sleeps or treat webpage text as trusted instructions.

Evidence: [`AGENTS.md`](https://github.com/vercel-labs/agent-browser/blob/d9570915f4dd6504dee4070379d2c4f79d81dbb2/AGENTS.md#L1-L65) (read: 1–65); [`skill-data/core/SKILL.md`](https://github.com/vercel-labs/agent-browser/blob/d9570915f4dd6504dee4070379d2c4f79d81dbb2/skill-data/core/SKILL.md#L7-L44) (read: 7–44, 190–215).

**25. [anomalyco/opencode](https://github.com/anomalyco/opencode)**

Contribution rules discourage unnecessary abstractions and preserve generated-interface consistency. **For torobai:** This is close to Ponytail: reuse the current code and update real callers. Do not import Bun-specific commands or fork-specific style rules.

Evidence: [`AGENTS.md`](https://github.com/anomalyco/opencode/blob/03cb9b9946e0baa027d7678b690f8f352eb9a2bc/AGENTS.md#L1-L65) (read: 1–65); [`CONTRIBUTING.md`](https://github.com/anomalyco/opencode/blob/03cb9b9946e0baa027d7678b690f8f352eb9a2bc/CONTRIBUTING.md#L1-L45) (read: 1–45, 66–89).

**26. [cline/cline](https://github.com/cline/cline)**

The CLI distinguishes planning, acting, provider configuration and permission modes; build prerequisites are explicit. **For torobai:** Test the artifact we actually ship and keep provider selection separate from coding-agent policy. Do not adopt unrestricted execution examples.

Evidence: [`AGENTS.md`](https://github.com/cline/cline/blob/8eba11b2703f5b12d3f415544be37ffc0ca03be1/AGENTS.md#L1-L34) (read: 1–34); [`apps/cli/README.md`](https://github.com/cline/cline/blob/8eba11b2703f5b12d3f415544be37ffc0ca03be1/apps/cli/README.md#L70-L108) (read: 70–108, 130–160).

**27. [Kilo-Org/kilocode](https://github.com/Kilo-Org/kilocode)**

Testing instructions distinguish focused checks from accidentally running a globally installed or stale executable. **For torobai:** Verify the current export and backend, not a previous build. Kilo shares OpenCode lineage, so this is not independent evidence for a separate architecture.

Evidence: [`AGENTS.md`](https://github.com/Kilo-Org/kilocode/blob/6c1596e4f8aa1f703b6452d0968ae3252431efab/AGENTS.md#L1-L65) (read: 1–65); [`TESTING.md`](https://github.com/Kilo-Org/kilocode/blob/6c1596e4f8aa1f703b6452d0968ae3252431efab/TESTING.md#L27-L46) (read: 27–46, 93–110).

**28. [Aider-AI/aider](https://github.com/Aider-AI/aider)**

The coding benchmark runs edits and tests and records first- and second-attempt outcomes with model metadata. **For torobai:** Measure our guide on buyer tasks, not coding benchmark scores. Executing generated code is outside the guide's scope.

Evidence: [`CONTRIBUTING.md`](https://github.com/Aider-AI/aider/blob/5dc9490bb35f9729ef2c95d00a19ccd30c26339c/CONTRIBUTING.md#L1-L65) (read: 1–65); [`benchmark/README.md`](https://github.com/Aider-AI/aider/blob/5dc9490bb35f9729ef2c95d00a19ccd30c26339c/benchmark/README.md#L2-L38) (read: 2–38, 87–113, 141–146).

**29. [aaif-goose/goose](https://github.com/aaif-goose/goose)**

Persistent guidance distinguishes startup context from instructions emphasized throughout work, with a context-size limit. **For torobai:** Prioritize the user's enduring constraints and inspect actual loading. Strong wording in a prompt is not proof that it cannot be ignored.

Evidence: [`AGENTS.md`](https://github.com/aaif-goose/goose/blob/4617040c7b650b37d599bdaa08d3790572c19ae8/AGENTS.md#L1-L65) (read: 1–65); [`documentation/docs/guides/context-engineering/using-persistent-instructions.md`](https://github.com/aaif-goose/goose/blob/4617040c7b650b37d599bdaa08d3790572c19ae8/documentation/docs/guides/context-engineering/using-persistent-instructions.md#L9-L32) (read: 9–32, 115–147).

**30. [QwenLM/qwen-code](https://github.com/QwenLM/qwen-code)**

Memory documentation supports AGENTS.md as well as scoped QWEN.md files and imports. **For torobai:** Do not add a duplicate QWEN.md merely because the tool has that name. Validate the installed client; Qwen Code and Gemini CLI have related lineage.

Evidence: [`AGENTS.md`](https://github.com/QwenLM/qwen-code/blob/e17ad4caef7b7bc69f27c8b751a75ce099a011b8/AGENTS.md#L1-L65) (read: 1–65); [`docs/users/features/memory.md`](https://github.com/QwenLM/qwen-code/blob/e17ad4caef7b7bc69f27c8b751a75ce099a011b8/docs/users/features/memory.md#L10-L72) (read: 10–72).

**31. [continuedev/continue](https://github.com/continuedev/continue)**

Review checks reject needless abstraction, verbose narration and unused state; testing guidance names real user flows. **For torobai:** Favor small complete changes and readable code. Do not copy a tool-specific one-file limit that would leave callers or exports broken.

Evidence: [`TESTING.md`](https://github.com/continuedev/continue/blob/5522c6f44ca0ac3528b37244818fbfa39b5af470/TESTING.md#L1-L30) (read: 1–30); [`.continue/checks/anti-slop.md`](https://github.com/continuedev/continue/blob/5522c6f44ca0ac3528b37244818fbfa39b5af470/.continue/checks/anti-slop.md#L1-L21) (read: 1–21).

**32. [zed-industries/zed](https://github.com/zed-industries/zed)**

Instructions emphasize readable code, meaningful errors and deterministic asynchronous testing. **For torobai:** Preserve validation and failure paths while simplifying code. CLAUDE.md resolves to the same content here; it is not independent evidence.

Evidence: [`AGENTS.md` → `.rules`](https://github.com/zed-industries/zed/blob/93d745668805029476e6d7fbb19652116fed51de/.rules#L1-L65) (read: 1–65); [`CLAUDE.md` → `.rules`](https://github.com/zed-industries/zed/blob/93d745668805029476e6d7fbb19652116fed51de/.rules#L1-L19) (read: 1–19).

**33. [OpenHands/OpenHands](https://github.com/OpenHands/OpenHands)**

Current frontend guidance separates ownership and uses the cheapest test level that exercises the real boundary. **For torobai:** Cover our served and portable paths explicitly. This snapshot describes the current AgentCanvas frontend, not every historical OpenHands backend.

Evidence: [`AGENTS.md`](https://github.com/OpenHands/OpenHands/blob/fa1f724ab5737a17453ad6081129eb91c5a423c6/AGENTS.md#L1-L65) (read: 1–65); [`.agents/skills/e2e-testing/SKILL.md`](https://github.com/OpenHands/OpenHands/blob/fa1f724ab5737a17453ad6081129eb91c5a423c6/.agents/skills/e2e-testing/SKILL.md#L1-L20) (read: 1–20).

### Agent runtimes and application boundaries

**34. [SWE-agent/SWE-agent](https://github.com/SWE-agent/SWE-agent)**

Retry configuration accounts for the remaining overall cost budget across attempts. **For torobai:** Keep paid calls bounded. Our single parser call does not need a retrying autonomous coding loop.

Evidence: [`CONTRIBUTING.md`](https://github.com/SWE-agent/SWE-agent/blob/3ea751c087f32b16e039a2233dd6eefecef325d5/CONTRIBUTING.md#L1-L16) (read: 1–16); [`sweagent/agent/agents.py`](https://github.com/SWE-agent/SWE-agent/blob/3ea751c087f32b16e039a2233dd6eefecef325d5/sweagent/agent/agents.py#L293-L335) (read: 293–335).

**35. [SWE-agent/mini-swe-agent](https://github.com/SWE-agent/mini-swe-agent)**

A small readable loop exposes step and cost limits and validates responses. **For torobai:** Simplicity and explicit termination matter more than a framework. A limit checked after a response does not guarantee zero cost overshoot.

Evidence: [`AGENTS.md`](https://github.com/SWE-agent/mini-swe-agent/blob/04d809ceab9df28f9adaed044884180159172930/AGENTS.md#L1-L65) (read: 1–65); [`src/minisweagent/agents/default.py`](https://github.com/SWE-agent/mini-swe-agent/blob/04d809ceab9df28f9adaed044884180159172930/src/minisweagent/agents/default.py#L19-L38) (read: 19–38, 88–107, 130–163).

**36. [langchain-ai/deepagents](https://github.com/langchain-ai/deepagents)**

Architecture documentation separates the model loop, harness, runtime, middleware and state ownership. **For torobai:** Keep our parser, deterministic decision code and UI responsibilities distinct. Do not migrate to DeepAgents or LangGraph without a concrete need.

Evidence: [`AGENTS.md`](https://github.com/langchain-ai/deepagents/blob/838433b4dcd9efa0bacba67d07e61440b43c4459/AGENTS.md#L1-L65) (read: 1–65); [`libs/ARCHITECTURE.md`](https://github.com/langchain-ai/deepagents/blob/838433b4dcd9efa0bacba67d07e61440b43c4459/libs/ARCHITECTURE.md#L12-L31) (read: 12–31, 49–62, 77–103).

**37. [langchain-ai/langgraph](https://github.com/langchain-ai/langgraph)**

Checkpoint interfaces explicitly represent versions, thread scope and resumable state. **For torobai:** Persisted conversations would need ownership and retention decisions. Session-only chat is an intentional boundary, not automatically a missing feature.

Evidence: [`AGENTS.md`](https://github.com/langchain-ai/langgraph/blob/799c2f04fd3a56186e24e9fb8bbf3568e543cfbe/AGENTS.md#L1-L65) (read: 1–65); [`libs/checkpoint/langgraph/checkpoint/base/__init__.py`](https://github.com/langchain-ai/langgraph/blob/799c2f04fd3a56186e24e9fb8bbf3568e543cfbe/libs/checkpoint/langgraph/checkpoint/base/__init__.py#L39-L58) (read: 39–58, 93–126, 199–225).

**38. [microsoft/autogen](https://github.com/microsoft/autogen)**

Termination conditions explicitly bound message counts or token usage and maintain state. **For torobai:** If repeated model calls are introduced later, specify when they stop. No multi-agent conversation is needed for today's one-call parser.

Evidence: [`CONTRIBUTING.md`](https://github.com/microsoft/autogen/blob/027ecf0a379bcc1d09956d46d12d44a3ad9cee14/CONTRIBUTING.md#L1-L65) (read: 1–65); [`python/packages/autogen-agentchat/src/autogen_agentchat/conditions/_terminations.py`](https://github.com/microsoft/autogen/blob/027ecf0a379bcc1d09956d46d12d44a3ad9cee14/python/packages/autogen-agentchat/src/autogen_agentchat/conditions/_terminations.py#L57-L104) (read: 57–104, 229–280).

**39. [microsoft/agent-framework](https://github.com/microsoft/agent-framework)**

Contribution policy stresses accountable review and evidence; testing guidance separates deterministic and live checks. **For torobai:** Review actual behavior and explain what was verified. Do not adopt an arbitrary upstream coverage threshold as our product-quality score.

Evidence: [`AI_CONTRIBUTIONS.md`](https://github.com/microsoft/agent-framework/blob/fd52de71579162a888fb2dd7510c57c6014dcdfc/AI_CONTRIBUTIONS.md#L1-L65) (read: 1–65); [`python/.github/skills/python-testing/SKILL.md`](https://github.com/microsoft/agent-framework/blob/fd52de71579162a888fb2dd7510c57c6014dcdfc/python/.github/skills/python-testing/SKILL.md#L1-L64) (read: 1–64).

**40. [huggingface/smolagents](https://github.com/huggingface/smolagents)**

Agent execution exposes step limits, final-answer checks and token-usage state. **For torobai:** Track unavailable usage as unknown and verify returned results. A code-execution agent is not a suitable default for buyer assistance.

Evidence: [`AGENTS.md`](https://github.com/huggingface/smolagents/blob/96f33faaf028479119ec8d34507b47694cf14e34/AGENTS.md#L1-L4) (read: 1–4); [`src/smolagents/agents.py`](https://github.com/huggingface/smolagents/blob/96f33faaf028479119ec8d34507b47694cf14e34/src/smolagents/agents.py#L268-L312) (read: 268–312, 499–545).

**41. [crewAIInc/crewAI](https://github.com/crewAIInc/crewAI)**

Typed usage metrics distinguish input, output, cached and reasoning tokens. **For torobai:** Minimal operational metrics could help our paid endpoint. Do not add crews, roles or conversation logging merely to obtain counters.

Evidence: [`AGENTS.md`](https://github.com/crewAIInc/crewAI/blob/753d1923660207989b6974ef414b8d91cd85e57c/AGENTS.md#L1-L45) (read: 1–45); [`lib/crewai/src/crewai/types/usage_metrics.py`](https://github.com/crewAIInc/crewAI/blob/753d1923660207989b6974ef414b8d91cd85e57c/lib/crewai/src/crewai/types/usage_metrics.py#L32-L88) (read: 32–88).

**42. [pydantic/pydantic-ai](https://github.com/pydantic/pydantic-ai)**

Testing guidance explicitly separates fake model responses from real AI and can block accidental model requests. **For torobai:** Preserve deterministic tests and make live evaluation opt-in. Passing mocks cannot establish Persian comprehension.

Evidence: [`AGENTS.md`](https://github.com/pydantic/pydantic-ai/blob/69ea1e57201ed59e7d30fbe4a7590d193acecce0/AGENTS.md#L1-L60) (read: 1–60); [`docs/testing.md`](https://github.com/pydantic/pydantic-ai/blob/69ea1e57201ed59e7d30fbe4a7590d193acecce0/docs/testing.md#L1-L28) (read: 1–28).

**43. [agno-agi/agno](https://github.com/agno-agi/agno)**

A concurrent budget test checks a shared limit and rejects work past its deadline before charging. **For torobai:** Before scaling a paid endpoint, prove a shared limit under contention. This test concerns a cookbook readiness example, not every Agno runtime.

Evidence: [`AGENTS.md` → `CLAUDE.md`](https://github.com/agno-agi/agno/blob/7decd1e45f6a67890ee6a5aa03f3fe9c356be972/CLAUDE.md#L1-L60) (read: 1–60); [`libs/agno/tests/unit/agents/test_readiness_budget.py`](https://github.com/agno-agi/agno/blob/7decd1e45f6a67890ee6a5aa03f3fe9c356be972/libs/agno/tests/unit/agents/test_readiness_budget.py#L1-L48) (read: 1–48).

**44. [mastra-ai/mastra](https://github.com/mastra-ai/mastra)**

Small scoped guides identify schema ownership and narrow validation commands. **For torobai:** Continue validating external data at our existing Python boundary. TypeScript tooling and a new agent framework are unnecessary here.

Evidence: [`AGENTS.md`](https://github.com/mastra-ai/mastra/blob/e0e844d05c01820f19b9f7a541fe0fd4d74bd451/AGENTS.md#L1-L17) (read: 1–17); [`packages/core/AGENTS.md`](https://github.com/mastra-ai/mastra/blob/e0e844d05c01820f19b9f7a541fe0fd4d74bd451/packages/core/AGENTS.md#L1-L18) (read: 1–18).

**45. [BerriAI/litellm](https://github.com/BerriAI/litellm)**

Test guidance prefers behavioral regressions and real evidence over implementation-shaped assertions. **For torobai:** Keep pricing and destination behavior observable. LiteLLM's gateway architecture is not authorization to turn torobai into an inference gateway.

Evidence: [`AGENTS.md`](https://github.com/BerriAI/litellm/blob/102619d47a78d80f0383c9e8f52446046f0ecc6b/AGENTS.md#L1-L60) (read: 1–60); [`tests/unit/AGENTS.md`](https://github.com/BerriAI/litellm/blob/102619d47a78d80f0383c9e8f52446046f0ecc6b/tests/unit/AGENTS.md#L1-L37) (read: 1–37).

### Protocols, evaluation and operational evidence

**46. [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers)**

Filesystem boundary code handles path normalization and directory-boundary lookalikes explicitly. **For torobai:** Security requirements need code at the trust boundary. This helper alone is not proof of complete symlink safety, and our chat needs no filesystem tool.

Evidence: [`AGENTS.md`](https://github.com/modelcontextprotocol/servers/blob/bbb701e7ac1e57f3edd1c2836b94c5457eaf7b9c/AGENTS.md#L1-L60) (read: 1–60); [`src/filesystem/path-validation.ts`](https://github.com/modelcontextprotocol/servers/blob/bbb701e7ac1e57f3edd1c2836b94c5457eaf7b9c/src/filesystem/path-validation.ts#L1-L106) (read: 1–106).

**47. [modelcontextprotocol/inspector](https://github.com/modelcontextprotocol/inspector)**

Testing guidance separates unit, integration, process-boundary and packaged-distribution checks. **For torobai:** Maintain served/export coverage and distinguish each kind of evidence. Its very large root guide is not a useful size target for our small repository.

Evidence: [`AGENTS.md`](https://github.com/modelcontextprotocol/inspector/blob/0d2bc1d91ce177ea8d497ee3efe91bcc59e40a1c/AGENTS.md#L1-L56) (read: 1–56); [`.claude/skills/testing/SKILL.md`](https://github.com/modelcontextprotocol/inspector/blob/0d2bc1d91ce177ea8d497ee3efe91bcc59e40a1c/.claude/skills/testing/SKILL.md#L180-L205) (read: 180–205, 281–307).

**48. [agentclientprotocol/agent-client-protocol](https://github.com/agentclientprotocol/agent-client-protocol)**

Cancellation documentation distinguishes protocol responses from the work being canceled. **For torobai:** Our UI must discard late results; it cannot promise that accepted upstream requests stop billing. No ACP integration is needed.

Evidence: [`AGENTS.md`](https://github.com/agentclientprotocol/agent-client-protocol/blob/b0b0be076fb89b41cb05d9ec9a7875ee1a98d654/AGENTS.md#L1-L65) (read: 1–65); [`docs/protocol/v2/cancellation.mdx`](https://github.com/agentclientprotocol/agent-client-protocol/blob/b0b0be076fb89b41cb05d9ec9a7875ee1a98d654/docs/protocol/v2/cancellation.mdx#L1-L70) (read: 1–70).

**49. [a2aproject/A2A](https://github.com/a2aproject/A2A)**

The protocol distinguishes a stateless message from a task with lifecycle and terminal states. **For torobai:** Define pending, canceled, failed and completed states clearly. A2A is unnecessary for a local catalog recommendation flow.

Evidence: [`CONTRIBUTING.md`](https://github.com/a2aproject/A2A/blob/12e9d2fbb9badfe98f8ab4f660697870eeb1940b/CONTRIBUTING.md#L1-L65) (read: 1–65); [`docs/topics/life-of-a-task.md`](https://github.com/a2aproject/A2A/blob/12e9d2fbb9badfe98f8ab4f660697870eeb1940b/docs/topics/life-of-a-task.md#L1-L32) (read: 1–32, 68–93).

**50. [cloudflare/agents](https://github.com/cloudflare/agents)**

Package guidance separates runtime, browser, end-to-end and evaluation checks and versions telemetry schemas. **For torobai:** Keep validation layers distinct and record useful metadata. Adopting Cloudflare infrastructure is not a prerequisite.

Evidence: [`AGENTS.md`](https://github.com/cloudflare/agents/blob/48d9c36f5f1ff18a91fbf0659b9a8e026d1cac43/AGENTS.md#L1-L65) (read: 1–65); [`packages/agents/AGENTS.md`](https://github.com/cloudflare/agents/blob/48d9c36f5f1ff18a91fbf0659b9a8e026d1cac43/packages/agents/AGENTS.md#L235-L269) (read: 235–269, 337–368).

**51. [promptfoo/promptfoo](https://github.com/promptfoo/promptfoo)**

Test instructions cover provider successes, failures, configuration and usage, with isolation between cases. **For torobai:** Keep stable fixtures and test provider errors. The files reviewed here are testing guidance, not an execution of promptfoo evaluations.

Evidence: [`AGENTS.md`](https://github.com/promptfoo/promptfoo/blob/801428268b5e421b2f6994332f6a06f86b27bb1f/AGENTS.md#L1-L65) (read: 1–65); [`test/AGENTS.md`](https://github.com/promptfoo/promptfoo/blob/801428268b5e421b2f6994332f6a06f86b27bb1f/test/AGENTS.md#L24-L53) (read: 24–53, 205–217).

**52. [UKGovernmentBEIS/inspect_ai](https://github.com/UKGovernmentBEIS/inspect_ai)**

Evaluation logs record model/configuration, samples, scores, usage and failure state. **For torobai:** A Persian evaluation report should identify prompt, catalog and model versions. Do not retain private user transcripts as the default evaluation dataset.

Evidence: [`AGENTS.md`](https://github.com/UKGovernmentBEIS/inspect_ai/blob/a1dbea8db3cc85e04ff532760d0eaaeb64df6d3a/AGENTS.md#L1-L65) (read: 1–65); [`docs/eval-logs.qmd`](https://github.com/UKGovernmentBEIS/inspect_ai/blob/a1dbea8db3cc85e04ff532760d0eaaeb64df6d3a/docs/eval-logs.qmd#L6-L39) (read: 6–39, 185–216).

### Practices in established projects

**53. [astral-sh/uv](https://github.com/astral-sh/uv)**

Contributor guidance favors existing test locations, focused runs and deliberate snapshot/lock changes. **For torobai:** Extend existing tests for real behavior; avoid multiplying fixtures or broad dependency updates for a small fix.

Evidence: [`AGENTS.md`](https://github.com/astral-sh/uv/blob/5cc7f15c359b83eed2c68c5578c1000bfd27e0da/AGENTS.md#L1-L46) (read: 1–46); [`CONTRIBUTING.md`](https://github.com/astral-sh/uv/blob/5cc7f15c359b83eed2c68c5578c1000bfd27e0da/CONTRIBUTING.md#L29-L35) (read: 29–35, 63–91, 102–132).

**54. [astral-sh/ruff](https://github.com/astral-sh/ruff)**

Threat models vary by runtime, command-line tool, package and hosted environment. **For torobai:** Review the boundary touched by the task. Do not turn a documentation edit into a complete application-security exercise.

Evidence: [`AGENTS.md`](https://github.com/astral-sh/ruff/blob/eb625e43e489bc090aae9c4aa4a407cf389f65d0/AGENTS.md#L1-L65) (read: 1–65); [`agents/references/threat-models.md`](https://github.com/astral-sh/ruff/blob/eb625e43e489bc090aae9c4aa4a407cf389f65d0/agents/references/threat-models.md#L1-L14) (read: 1–14).

**55. [obra/superpowers](https://github.com/obra/superpowers)**

Verification guidance requires evidence before completion claims; integration changes need clean-session acceptance. **For torobai:** Prove that coding tools load the rules, not just that files were added. Do not impose full re-testing or a large process framework on every trivial edit.

Evidence: [`AGENTS.md`](https://github.com/obra/superpowers/blob/bb92a77741419a4ab5f06e711a283343f1ada0c3/AGENTS.md#L1-L115) (read: 1–115); [`skills/verification-before-completion/SKILL.md`](https://github.com/obra/superpowers/blob/bb92a77741419a4ab5f06e711a283343f1ada0c3/skills/verification-before-completion/SKILL.md#L1-L120) (read: 1–120).

**56. [vercel/next.js](https://github.com/vercel/next.js)**

Testing distinguishes development, built and deployed environments with isolated application instances. **For torobai:** Our server and standalone HTML are separate delivery paths. Preserve both without migrating to Next.js or using sleeps as readiness checks.

Evidence: [`AGENTS.md`](https://github.com/vercel/next.js/blob/d8c1c1b0002db8ccb63b58095f338e8bf423fa99/AGENTS.md#L1-L65) (read: 1–65); [`contributing/core/testing.md`](https://github.com/vercel/next.js/blob/d8c1c1b0002db8ccb63b58095f338e8bf423fa99/contributing/core/testing.md#L44-L79) (read: 44–79).

**57. [calcom/cal.diy](https://github.com/calcom/cal.diy)**

Contribution rules favor small reviewed changes and comments explaining non-obvious reasons. **For torobai:** Follow Ponytail's readable, complete scope. A numeric upstream file/line limit should not split one necessary fix into incomplete pieces.

Evidence: [`AGENTS.md`](https://github.com/calcom/cal.diy/blob/54343aa685ae8f33159d2f485ec4a57bad5c574a/AGENTS.md#L1-L65) (read: 1–65); [`agents/rules/quality-code-comments.md`](https://github.com/calcom/cal.diy/blob/54343aa685ae8f33159d2f485ec4a57bad5c574a/agents/rules/quality-code-comments.md#L1-L51) (read: 1–51).

**58. [supabase/supabase](https://github.com/supabase/supabase)**

Nested guidance names local UI conventions, state ownership and focused tests. **For torobai:** Reuse existing TorobMotion and state handling. Do not import React components or duplicate derived state in a second store.

Evidence: [`AGENTS.md`](https://github.com/supabase/supabase/blob/369927892fde63d07b199d4e80fe05ae780573d5/AGENTS.md#L1-L65) (read: 1–65); [`apps/studio/AGENTS.md`](https://github.com/supabase/supabase/blob/369927892fde63d07b199d4e80fe05ae780573d5/apps/studio/AGENTS.md#L1-L22) (read: 1–22, 45–76).

**59. [getsentry/sentry](https://github.com/getsentry/sentry)**

CLAUDE.md imports the shared AGENTS.md; the guide emphasizes scoped work and useful verification. **For torobai:** Our root CLAUDE.md already uses this pattern. Another full policy copy would create drift rather than improve compatibility.

Evidence: [`AGENTS.md`](https://github.com/getsentry/sentry/blob/035fd0e68c0a85be84eabe7c5cacbd88d9ae065e/AGENTS.md#L1-L65) (read: 1–65); [`CLAUDE.md`](https://github.com/getsentry/sentry/blob/035fd0e68c0a85be84eabe7c5cacbd88d9ae065e/CLAUDE.md#L1) (read: 1).

**60. [PostHog/posthog](https://github.com/PostHog/posthog)**

Policy assigns responsibility for AI-assisted contributions and expects evidence for interface changes. **For torobai:** A UI change needs rendered evidence and a reviewer who owns the result. Our previous browser review is useful, but should not be confused with every CI run.

Evidence: [`AGENTS.md`](https://github.com/PostHog/posthog/blob/34a467e9862fd10cc7dc9ee8806bf53fdd54b660/AGENTS.md#L1-L65) (read: 1–65); [`AI_POLICY.md`](https://github.com/PostHog/posthog/blob/34a467e9862fd10cc7dc9ee8806bf53fdd54b660/AI_POLICY.md#L1-L44) (read: 1–44).

## Validation and limits of this change

The report and evidence ledger are the only repository changes. Source-ledger checks verify 60 unique repositories, 120 file paths, commit-pinned URLs, file hashes and valid read ranges. Git blob hashes were recomputed and matched for all 119 resolved files; symlink metadata was checked separately. The attachment comparison, local policy byte counts and referenced local files were checked. The required standalone export succeeded with 62 products and 20 embedded local assets; its DOM smoke check passed 62 product routes and 82 scenarios. The resulting HTML is byte-for-byte unchanged, SHA-256 `5abc42dafc2546b79c9e957cfeaeaf95948fa5717a149d6b1d5788fb920bfef3`. These checks do not test third-party projects or live language quality.

Not checked: clean-session loading in installed Codex/Claude/Gemini clients, execution of the 60 third-party projects, live paid OpenRouter language quality, or a new rendered-browser pass for the unchanged interface. The remaining material risks are instruction non-adherence despite correct files, unmeasured Persian recommendation quality, and the documented operational limits before scaling a public paid backend.
