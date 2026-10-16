Fact tile for the idol profile panel: black skewed label tab, puffy white value, pink hatching corner; supports flags and position chips. Puff Pop (default style).

```jsx
<div className="ip-panel"><div className="ip-tiles">
  <ProfileTile label="STAGE NAME" value="Sakura" big span="3" />
  <ProfileTile label="NATIONALITY" value="JP" span="2w" flags={[{src:"assets/flags/jp.svg"}]} sub="Japan" />
</div></div>
```

Panel: `.ip-panel` (3px border, 9px ink offset, skewX −3°) wrapping `.ip-tiles` (6-col dense grid; 2-col ≤560).

Wrap pages in `<div className="pp-page" data-theme="day|night">` — it sets the dot ground and the container for responsive rules.
