Idol page search: skewed white bar with pink offset that sits right-aligned at 400px when closed and slides to full width (transform only) when focused; max 5 results. Puff Pop (default style).

```jsx
<SlideSearch value={q} onChange={setQ} results={hits} />
```

Result hover is var(--chip-hover) (soft grey at night, never pink). Current idol gets an 8px pink dot. List spans the screen on mobile.

Wrap pages in `<div className="pp-page" data-theme="day|night">` — it sets the dot ground and the container for responsive rules.
