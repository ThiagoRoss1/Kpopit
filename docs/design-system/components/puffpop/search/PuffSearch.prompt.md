Primary catalogue search field: 50px, radius 18, full ink offset that grows on focus; icon tilts, clear button spins in. Puff Pop (default style).

```jsx
<div className="pp-controls"><PuffSearch value={q} onChange={setQ} /></div>
```

Max 400px; 100% on mobile. Lives in `.pp-controls` with the FilterButtons.

Wrap pages in `<div className="pp-page" data-theme="day|night">` — it sets the dot ground and the container for responsive rules.
