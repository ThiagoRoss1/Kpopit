import React from "react";
export function FilterMenu({ open = false, title, sub, options = [], onSelect, side }) {
  const ref = React.useRef(null);
  const [mounted, setMounted] = React.useState(open);
  const [auto, setAuto] = React.useState("center");
  React.useEffect(() => { if (open) { setMounted(true); return; } const t = setTimeout(() => setMounted(false), 460); return () => clearTimeout(t); }, [open]);
  React.useLayoutEffect(() => {
    if (!open || side || !ref.current) return;
    const host = ref.current.parentElement, page = host.closest(".pp-page") || document.documentElement;
    const b = host.getBoundingClientRect(), r = page.getBoundingClientRect(), cx = b.left + b.width / 2 - r.left;
    setAuto(cx - 132 < 0 ? "left" : cx + 132 > r.width ? "right" : "center");
  }, [open, side]);
  if (!mounted && !open) return <span ref={ref} hidden></span>;
  return (
    <div ref={ref} aria-hidden={!open} className={"pp-menu pp-menu--" + (side || auto) + (open ? " is-open" : "")}>
      <div className="pp-menu__head"><span>{title}</span><span>{sub ?? (options.length - 1) + " options"}</span></div>
      <div className="pp-menu__list pp-scroll">
        {options.map((o, i) => (
          <button key={o.value ?? i} className="pp-opt" aria-pressed={!!o.selected} onClick={() => onSelect && onSelect(o.value, o)}>
            {o.iconSrc ? <img className="pp-opt__icon" src={o.iconSrc} alt="" /> : null}
            {o.flagSrc ? <img className="pp-opt__flag" src={o.flagSrc} alt="" /> : null}
            <span className="pp-opt__label">{o.label}</span>
            {o.count != null ? <span className="pp-badge">{o.count}</span> : null}
          </button>
        ))}
      </div>
    </div>
  );
}
