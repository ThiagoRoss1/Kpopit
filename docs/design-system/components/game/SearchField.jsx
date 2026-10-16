import React from "react";
import { Icon } from "../icons/Icon.jsx";
const coverBg = (h = 340) => `linear-gradient(150deg, oklch(0.64 0.16 ${h}), oklch(0.33 0.136 ${h + 26}))`;

export function SearchField({ placeholder = "Type an album or group…", value = "", suggestions = [], onSubmit, onPick, disabled }) {
  const [text, setText] = React.useState(value);
  const [picked, setPicked] = React.useState(null);
  const q = text.trim().toLowerCase();
  const list = q && !picked ? suggestions.filter((s) => (s.title + " " + (s.subtitle || "")).toLowerCase().includes(q)) : [];
  return (
    <div className="kp-search">
      <form className="kp-search__shell" onSubmit={(e) => { e.preventDefault(); if (onSubmit) onSubmit(picked || text); setText(""); setPicked(null); }}>
        <input className="kp-search__input" value={text} placeholder={placeholder} disabled={disabled}
          onChange={(e) => { setText(e.target.value); setPicked(null); }} aria-label={placeholder} />
        <button type="submit" className="kp-search__go" disabled={disabled || !q} aria-label="Submit guess"><Icon name="search" size={22} /></button>
      </form>
      {list.length > 0 && (
        <ul className="kp-search__list">
          {list.slice(0, 6).map((s) => (
            <li key={s.title + (s.subtitle || "")} className="kp-search__item" onClick={() => { setText(`${s.title}${s.subtitle ? ` (${s.subtitle})` : ""}`); setPicked(s); if (onPick) onPick(s); }}>
              {s.coverSrc ? <img className="kp-search__thumb" src={s.coverSrc} alt="" style={{ objectFit: "cover" }} /> : <span className="kp-search__thumb" style={{ background: coverBg(s.coverHue ?? 340) }} />}
              <span className="kp-search__txt"><b>{s.title}</b>{s.subtitle && <span>{s.subtitle}</span>}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
