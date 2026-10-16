import React from "react";
export function SlideSearch({ value, onChange, results = [], open: forced = false, placeholder = "Idol, group or company...", max = 5 }) {
  const [inner, setInner] = React.useState(""), [focus, setFocus] = React.useState(false);
  const v = value ?? inner, set = x => { if (value === undefined) setInner(x); onChange && onChange(x); };
  const bt = React.useRef(0);
  const open = forced || focus || !!v;
  const list = results.slice(0, max);
  return (
    <div className={"ip-search" + (open ? " is-open" : "")}>
      <div className="ip-search__clip">
        <label className="ip-search__bar">
          <span className="ip-search__icon"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF3399" strokeWidth="3" strokeLinecap="round"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg></span>
          <input value={v} onChange={e => set(e.target.value)} onFocus={() => { clearTimeout(bt.current); setFocus(true); }} onBlur={() => { bt.current = setTimeout(() => setFocus(false), 120); }}
            onKeyDown={e => { if (e.key === "Escape") { set(""); e.currentTarget.blur(); } if (e.key === "Enter" && list[0]) list[0].onPick && list[0].onPick(); }}
            placeholder={placeholder} aria-label="Search idols, groups or companies" />
        </label>
      </div>
      {open ? (
        <div role="listbox" aria-label="Idols" className="ip-results">
          {list.map((r, i) => (
            <button key={i} role="option" aria-selected={!!r.current} className="ip-result" onMouseDown={e => { e.preventDefault(); r.onPick && r.onPick(); }}>
              <img src={r.img} alt="" />
              <span className="ip-result__txt"><span className="ip-result__name">{r.name}</span><span className="ip-result__sub">{r.sub}</span></span>
              {r.current ? <span className="ip-result__here" aria-label="Current idol"></span> : null}
            </button>
          ))}
          {!list.length ? <div className="ip-noresult">No idols found...</div> : null}
        </div>
      ) : null}
    </div>
  );
}
