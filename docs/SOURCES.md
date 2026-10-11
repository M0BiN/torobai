# Data sources and decisions

The original v0.3 records below were observed on 2026-10-11. They are public observations, not purchase quotes. Facts are attributed to the seller, not independently certified. The v0.4 additions have a separate reference basis described below.

| Source | Used for | Treatment |
|---|---|---|
| https://www.1xai.ir/pricing | Eight model quotes, 1,000 toman minimum credit | Page prices are per 1K tokens and rounded. Multiplied by 1,000 for per-million display; no invented tax or expiry. |
| https://netarz.ir/api/ai/v1/models | Eleven selected model quotes, units, capacities and long-input tiers | API snapshot takes precedence over page tables with conflicting exchange-rate snapshots. Selected evidence is stored in `evidence/netarz-selected-20261011.json`. |
| https://netarz.ir/ai-api/models | 50,000 toman credit minimum, seller-declared 9% wallet tax and 2 USD pre-KYC usage cap | Not represented as general Iranian tax law. Minimum payment derived as 54,500 toman; usage prices exclude tax. |
| https://netarz.ir/docs/ai | API documentation | Direct external link, no claim of a completed API integration test. |
| https://avalai.ir/pricing/ | Two inherited USD quotes | Source could not be revalidated because of a redirect loop. Marked needs_recheck and excluded from estimates. |
| https://servernet.cloud/gpu | Five hourly GPU quotes, 24-hour equivalent initial credit, 8 vCPU / 30 GB RAM / 150 GB temporary disk | Managed applications, no SSH/root; new Jupyter orders suspended in the observed page. Credit is not added to consumed compute. |
| https://www.gpurun.com/ | Daily quotes for five cards; RAM, vCPU, storage, SSH/root | Public starting prices. Daily minimum applies separately to every independent booking. Disk persistence, taxes and stock remain unverified. |
| https://lexoya.com/landings/graphical-server | RTX 3090/4090 monthly entry plans, 16 CPU / 48 GB RAM / 200 GB disk, 1 TB traffic | Monthly quotes remain monthly. Location flag is Iran. SSH is not explicitly established by this page, so the SSH filter excludes these offers. |
| https://ferdowsi.cloud/fa/services/gpu | GPU VM offering and stated disk retention across stop | Generic service entry; exact card, resources and price require inquiry. |
| https://ferdowsi.cloud/blog/how-connect-to-cloud-gpu/ | Linux SSH guidance | Service-level capability, not verification of a quoted machine. |
| https://client.itpiran.net/store/iran-daily-gpu-vps?language=english | GTX 1660 Super daily Windows offer | Current public response showed USD 0.80/day and zero availability; the old toman quote was removed. |

The GPURUN and Lexoya fields add supply for existing GPU groups without pretending that the offers are identical. No advertised uptime, quality score or claimed performance multiplier was imported.

## Product references

- https://torob.com/ — search and merchant comparison as the primary job.
- https://openrouter.ai/models — compact model catalog and separation of input/output rates and context.
- https://openrouter.ai/openai/gpt-4o-mini/providers — a model as the entry point to providers.
- https://getdeploying.com/gpus/nvidia-rtx-3090 — GPU-specific offers; inspection informed the separation of hardware from provider terms.

Research also surfaced older Simorgh posts, IranGPU and Abresfahan pages. Old advertising prices and unreachable pages were not inserted as current offers. GPUCompare was unreachable in this pass and was not used as verified evidence of current behavior.

## v0.4 reference catalog

The 35 added offers use reference tariffs for budgeting. They are not scraped
quotes or evidence of supplier availability. Every such record has
`pricing_basis: planning_catalog`, `price_status: reference_tariff` and
`observed_at: null`; its seller URL is a destination, not verification of supply.
The original feed refresher deliberately skips these records. No fake timestamp,
stock, review, latency measurement or commercial partnership was added.

Four decision models have no Iranian API offers. Their official weights and
model cards provide the access path. Model names, licenses and limits were
checked against primary sources listed in RESEARCH.md and each product record.
