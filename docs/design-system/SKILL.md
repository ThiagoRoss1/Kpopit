---
name: kpopit-design
description: Use this skill to generate well-branded interfaces and assets for KpopIt, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for protoyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.
If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out (idol photos and album covers come from `https://cdn.kpopit.net/images/{idols|groups|albums}/<name>.webp`) and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.
If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Style switch
- **Puff Pop is the default.** Wrap pages in `<div class="pp-page" data-theme="day|night">`, use the components in `components/puffpop/` and the tokens in `tokens/puffpop.css`. Read README › "Puff Pop (catalogue)" first: pink roles, lettering recipe, puffy-vs-Major-Mono rules, night rules.
- **Retro-Pop** (the original look) on request: add `data-style="retro"` to the root and use the components outside `puffpop/`.
- Rules that never change: ink outlines + solid offsets (no blurry card shadows), #FF3399 ≈10% of a view, white on pink only with an ink stroke, no Hangul under the idol stage name, no star signs, transform-only motion, reduced-motion respected.
