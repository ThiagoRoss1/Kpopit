Icon-only button in four brand treatments — stats (pink), share (circle), close (round), header toggles (toggle).

```jsx
<IconButton variant="pink" label="Your stats"><Icon name="chart" /></IconButton>
<IconButton variant="circle" label="Share on X"><img src="assets/icons/x-logo.svg" width="28" alt="" /></IconButton>
<IconButton variant="round" label="Close"><Icon name="x" /></IconButton>
<IconButton variant="toggle" label="Night mode"><Icon name="moon" /></IconButton>
```

- `label` is required (aria-label + title).
- Night: round gets pink border/offset + pink glyph; toggle goes #1c1f27 with 60% pink border.
