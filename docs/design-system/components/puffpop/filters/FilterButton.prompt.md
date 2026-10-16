Catalogue filter control: dropdown (chevron), toggle (check box + count badge), optional flag; pink fill when a value is applied. Puff Pop (default style).

```jsx
<FilterButton label="Group" minWidth="104px" open={menu==="group"} onClick={()=>setMenu("group")}>
  <FilterMenu open={menu==="group"} title="GROUP" options={opts} onSelect={pick} />
</FilterButton>
<FilterButton kind="toggle" label="In album" badge={13} active={album} onClick={()=>setAlbum(!album)} />
```

40px tall (44px on touch). Open = pressed in (2,3) with flat shadow. Min widths from source: Group 104, Nationality 142, Company 128.

Wrap pages in `<div className="pp-page" data-theme="day|night">` — it sets the dot ground and the container for responsive rules.
