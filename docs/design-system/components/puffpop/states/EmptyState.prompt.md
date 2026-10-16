Catalogue states: empty / error (puffy title, muted line, pink press button) and loading (dashed skeleton grid). Puff Pop (default style).

```jsx
<EmptyState kind="empty" body={'No matches for “zz” with these filters.'} onAction={reset} />
```

Pink button = #FF70B8 with white stroked letters (var(--tag-text)); presses 3,4.

Wrap pages in `<div className="pp-page" data-theme="day|night">` — it sets the dot ground and the container for responsive rules.
