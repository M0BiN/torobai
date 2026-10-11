# v0.6 design plan and review

## Buyer task

Find the least expensive suitable API or GPU; open it; immediately see the
provider, price basis, price spread, reliability and the next action.

## Page hierarchy

1. Catalog: compact categories, task selection, quick/advanced filters, cheapest
   and most-expensive controls, a comparable price summary and compact cards.
2. Product top: compact model identity beside the cheapest eligible provider.
   Show price, period, input/output rates, range, reliability and seller link.
3. Next: other providers, without duplicating the featured one. Preserve source,
   minimum funding, access and billing conditions.
4. Below: optional consumption settings, detailed reliability, specifications,
   scenario chart and related products.

## Implementation decisions

Keep the prior consumption arithmetic and standard scenario. Use one Python
engine for catalog and detail. Choose a comparable task when sorting a mixed
API catalog. Descending price means sorting each model's cheapest offer from
largest to smallest; it does not select a deliberately overpriced vendor.
Unpriced and unavailable estimates remain at the end in both directions.

Use the supplied SVG, a dedicated bold money class and natural Persian copy.
Category targets are 110 px desktop and 88 px narrow mobile. Loading is a short
presentation transition, canceled by navigation through the existing version
check, with reduced-motion support.

## Review outcome

Buyer: the first view now gives a purchase choice and the price basis together.
Developer: the markup regression, sort directions, filtered best offer, delayed
route race and server custom-consumption path are exercised in behavior tests.
Product: every new control has behavior; no review, stock or uptime is fabricated.
The remaining visual gate is actual desktop/mobile browser inspection.
