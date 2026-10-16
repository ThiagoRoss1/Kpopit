import React from "react";
export function PuffSearch({ value, defaultValue = "", onChange, placeholder = "Search an idol or group…", ariaLabel = "Search idols or groups", className }) {
  const [inner, setInner] = React.useState(defaultValue);
  const v = value ?? inner;
  const set = x => { if (value === undefined) setInner(x); onChange && onChange(x); };
  return (
    <label className={"pp-search" + (v ? " has-q" : "") + (className ? " " + className : "")}>
      <svg className="pp-search__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><circle cx="10.5" cy="10.5" r="6.5"></circle><path d="m16 16 4 4"></path></svg>
      <input type="search" value={v} onChange={e => set(e.target.value)} aria-label={ariaLabel} placeholder={placeholder} />
      <button type="button" className="pp-search__clear" onClick={() => set("")} aria-label="Clear search" tabIndex={v ? 0 : -1}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="m7 7 10 10M17 7 7 17"></path></svg></button>
    </label>
  );
}
