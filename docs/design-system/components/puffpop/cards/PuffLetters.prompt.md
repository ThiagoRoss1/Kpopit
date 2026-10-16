Stacked puffy lettering (white face, ink stroke, pink body) whose depth animates with translate3d. Puff Pop (default style).

```jsx
<PuffLetters text="Sakura" state="hover" />
```

Used inside IdolCard/AlbumCard names. For static big lettering use `text-shadow: var(--puff-title)` / `var(--puff-value)` instead.

Wrap pages in `<div className="pp-page" data-theme="day|night">` — it sets the dot ground and the container for responsive rules.
