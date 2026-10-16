Dropdown panel for FilterButton: dashed caps header with option count, 42px options with count badges, pink scrollbar, auto left/center/right placement. Puff Pop (default style).

```jsx
<FilterMenu open title="NATIONALITY" options={[{label:"Anywhere",value:"",selected:true,count:25},{label:"Japan",value:"jp",flagSrc:"assets/flags/jp.svg",count:6}]} />
```

Stays mounted 460ms after closing for the exit transition. Options slide 4px right on a pink tint; selected = pink + ink border.

Wrap pages in `<div className="pp-page" data-theme="day|night">` — it sets the dot ground and the container for responsive rules.
