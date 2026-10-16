Removable applied-filter pill (30px, × icon), or the underlined "Clear all" link. Puff Pop (default style).

```jsx
<div className="pp-applied-row"><span>8 idols</span><AppliedChip label="Japan" onRemove={...} /><AppliedChip variant="clear" onRemove={reset} /></div>
```

Show "Clear all" only when 2+ filters/search are applied.

Wrap pages in `<div className="pp-page" data-theme="day|night">` — it sets the dot ground and the container for responsive rules.
