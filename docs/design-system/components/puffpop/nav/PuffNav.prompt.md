Puff Pop top bar: tilted K logo + "· idols" word, text pills (active one filled pink), round day/night toggle. Puff Pop (default style).

```jsx
<PuffNav logoSrc="assets/logos/kpopit-icon-svg.svg" theme={theme} onToggleTheme={toggle}
  items={[{label:"Play"},{label:"Idols",active:true},{label:"Album"}]} />
```

112px tall (80px ≤580px container, word hidden). Toggle rotates −14° on hover. Nav word default in the handoff is "Album".

Wrap pages in `<div className="pp-page" data-theme="day|night">` — it sets the dot ground and the container for responsive rules.
