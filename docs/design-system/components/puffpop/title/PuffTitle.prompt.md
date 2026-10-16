Page title in puffy lettering ("Idols", "Albums") with a tilted Hangul chip and a muted count line. Puff Pop (default style).

```jsx
<PuffTitle title="Idols" ko="아이돌" count="25 idols · 13 in album" />
```

64px (48px mobile), rotate −1.5°, text-shadow var(--puff-title). Titles and names only, never section headers.

Wrap pages in `<div className="pp-page" data-theme="day|night">` — it sets the dot ground and the container for responsive rules.
