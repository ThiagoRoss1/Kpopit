The brand's press-down action button — use for the one primary action per view (pink) or secondary actions (outline).

```jsx
<PressButton iconEnd={<Icon name="arrow-right" size={16} />}>Open album</PressButton>
<PressButton variant="outline">Transfer data</PressButton>
<PressButton size="lg" iconStart={<Icon name="copy" size={16} />}>Share Results</PressButton>
```

- primary: neon-pink fill, ink label (contrast fix — never white), 2px ink border, `--press` shadow; hover brightens 1.1 + scales 1.05; active sinks 4px.
- outline: Major Mono Display uppercase, `--offset-md`, shifts 2px and loses its offset on press.
- sizes sm / md / lg (lg = 48px Share Results style). Night: primary loses its border, gains the pink glow press.
- Only ONE primary per view. Wrap in `.kp-tilt-l` / `.kp-tilt-r` when pairing buttons for controlled chaos.
