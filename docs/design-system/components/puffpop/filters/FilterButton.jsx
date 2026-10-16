import React from "react";
export function FilterButton({ label, kind = "dropdown", active = false, open = false, flagSrc, badge, minWidth, onClick, children, className }) {
  const caret = kind === "dropdown";
  const cls = ["pp-fbtn", caret && "pp-fbtn--caret", active && "is-active", open && "is-open", className].filter(Boolean).join(" ");
  return (
    <div className="pp-filter">
      <button className={cls} onClick={onClick} aria-pressed={active} aria-expanded={caret ? open : undefined} style={minWidth ? { minWidth } : undefined}>
        {kind === "toggle" ? <span aria-hidden="true" className="pp-fbtn__box"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"></path></svg></span> : null}
        {flagSrc ? <img className="pp-fbtn__flag" src={flagSrc} alt="" /> : null}
        <span className="pp-fbtn__label">{label}</span>
        {badge != null ? <span className="pp-badge">{badge}</span> : null}
        {caret ? <svg aria-hidden="true" className="pp-fbtn__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"></path></svg> : null}
      </button>
      {children}
    </div>
  );
}
