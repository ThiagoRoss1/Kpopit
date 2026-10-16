Idol page section tabs (Profile / Career / Status): Major Mono number + caps label + Hangul; active is pink with puffy ink text, lifted and rotated −2°. Puff Pop (default style).

```jsx
<ProfileTabs active={tab} onChange={setTab} />
```

Inactive tabs use --pm-bg (ink by day, cream at night) with a pink offset.

Wrap pages in `<div className="pp-page" data-theme="day|night">` — it sets the dot ground and the container for responsive rules.
