# Fonts and brand assets

All displayed brand images are downloaded source assets, not newly drawn imitations. Their use identifies the listed maker/seller; it does not imply partnership. Assets are served locally.

| File | Source |
|---|---|
| fonts/Vazirmatn.woff2 | https://github.com/rastikerdar/vazirmatn — official variable webfont, SIL OFL 1.1; complete license in `fonts/Vazirmatn-LICENSE.txt`. |
| brands/openai.svg | https://openrouter.ai/images/icons/OpenAI.svg |
| brands/anthropic.svg | https://openrouter.ai/images/icons/Anthropic.svg |
| brands/google.svg | https://github.com/lobehub/lobe-icons/blob/master/packages/static-svg/icons/gemini-color.svg |
| brands/deepseek.svg | https://github.com/lobehub/lobe-icons/blob/master/packages/static-svg/icons/deepseek-color.svg |
| brands/bfl.svg | https://github.com/lobehub/lobe-icons/blob/master/packages/static-svg/icons/flux.svg |
| brands/qwen.svg | https://github.com/lobehub/lobe-icons/blob/master/packages/static-svg/icons/qwen-color.svg |
| brands/gemma.svg | https://github.com/lobehub/lobe-icons/blob/master/packages/static-svg/icons/gemma-color.svg |
| brands/meta.svg | https://github.com/lobehub/lobe-icons/blob/master/packages/static-svg/icons/meta-color.svg |
| brands/mistral.svg | https://github.com/lobehub/lobe-icons/blob/master/packages/static-svg/icons/mistral-color.svg |
| brands/nvidia.svg | https://cdn.simpleicons.org/nvidia/76B900 |
| brands/one.svg | https://www.1xai.ir/favicon.svg |
| brands/netarz.png | https://netarz.ir/icons/v2/icon-192.png |
| brands/aval.png | https://docs.avalai.ir/assets/logo.C1cqBidQ.png |
| brands/servernet.svg | https://servernet.cloud/favicon.svg |
| brands/ferdowsi.webp | https://ferdowsi.cloud/images/common/logo.webp |
| brands/itp.png | https://client.itpiran.net/assets/img/logo.png |
| brands/gpurun.svg | The unmodified embedded favicon SVG from https://www.gpurun.com/ |
| brands/lexoya.png | https://s3.lexoya.com/landings/Lexoya-cloud.png |

Vazirmatn is bundled and used for Persian prose and numbers. Persian digits are
U+06F0–U+06F9; Latin model identifiers retain Latin digits. No external font request
or local-font override is needed. Previous Yekan/B Yekan files are removed.

The GPU board and geometric model stages are original HTML/CSS artwork, not
product photography. BGE, Laya and Decider use plain text marks. The torobai wordmark remains text. `app/static/logo.svg` uses the four-path Torob
SVG explicitly supplied by the user in the v0.6 request, with fixed red fill
colors replacing the page-specific CSS variables. It is used in the header and
favicon. It is not described as newly drawn original artwork.

## Torob's font and the licensed replacement path

Current Torob HTML/CSS identifies `iranyekan` with regular and bold WOFF2 files.
The publisher distinguishes desktop use from embedding in a website/application:
https://fontiran.com/fonts/iranyekan. No IRANYekan binary from Torob is distributed
here. This package uses the freely redistributable Vazirmatn variable font:
https://github.com/rastikerdar/vazirmatn/blob/master/fonts/webfonts/Vazirmatn%5Bwght%5D.woff2.

When the project has appropriately licensed IRANYekan regular/bold web files:

1. Place them in `app/static/fonts/IRANYekan-Regular.woff2` and
   `app/static/fonts/IRANYekan-Bold.woff2`, retaining the required license files.
2. Add two `@font-face` rules named `IRANYekan`, with URLs under `/static/fonts/`,
   weight 400 for regular and 700 for bold. Use `font-display: swap`.
3. Put `IRANYekan` before `Vazirmatn` in the font declarations in `styles.css`.
   Keep Vazirmatn as the fallback and leave Latin identifier fonts alone.
4. Rebuild with `python scripts/export_catalog.py`; the exporter embeds new
   WOFF2 files automatically. Update the font-byte regression assertion to cover
   both new files, then check rendering at desktop and mobile widths.

The existing tests validate embedded Vazirmatn bytes. Licensing and actual
IRANYekan typography cannot be claimed before the licensed replacement is made.
