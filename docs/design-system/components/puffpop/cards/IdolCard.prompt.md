Puff Pop idol tile for the Idols catalogue: pink side body, white face, photo well, flags, puffy name, group · company, optional "In album" tag. Puff Pop (default style).

```jsx
<div className="pp-grid">
  <IdolCard index={0} name="Sakura" group="LE SSERAFIM" company="Source Music" img="https://cdn.kpopit.net/images/idols/sakura.webp" flags={[{src:"assets/flags/jp.svg",label:"Japan"}]} inAlbum />
</div>
```

Hover: tilt → 0°, lift (-1,-3), photo ×1.08, face → --face-hover, name extrudes, tag rotates further. Press: face sinks by --depth. Put inside `.pp-grid` (auto-fill minmax(190px,1fr), 150px on mobile).

Wrap pages in `<div className="pp-page" data-theme="day|night">` — it sets the dot ground and the container for responsive rules.
