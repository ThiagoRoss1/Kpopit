import React from "react";
const CHIP = [["#FF8AC4", "#1A1418", "inset 0 2px 0 rgba(255,255,255,.55),inset 0 -3px 0 rgba(198,35,104,.3)"], ["#FFFDFA", "#1A1418", "inset 0 2px 0 #FFFFFF,inset 0 -3px 0 rgba(26,20,24,.08)"], ["#1A1418", "#FFFFFF", "inset 0 2px 0 rgba(255,255,255,.2),inset 0 -3px 0 rgba(0,0,0,.4)"]];
export function ProfileTile({ label, value, sub, big = false, flags = [], chips, span = "3", subKorean = false, index = 0, chipOffset = 0 }) {
  return (
    <div className="ip-tile" style={{ gridColumn: `span var(--s-${span})`, animationDelay: 60 + index * 60 + "ms" }}>
      <span aria-hidden="true" className="ip-tile__corner"></span>
      <span className="ip-tile__label"><span>{label}</span></span>
      {chips ? (
        <span className="ip-tile__chips">{chips.map((c, k) => { const t = CHIP[(k + chipOffset) % 3], r = (k + chipOffset) % 3; return <span key={k} className="ip-chip" style={{ background: t[0], color: t[1], transform: `rotate(${r === 0 ? -2 : r === 1 ? 2 : -1}deg)`, boxShadow: "3px 3px 0 #1A1418," + t[2] }}>{c.label}{c.sub ? <small>{c.sub}</small> : null}</span>; })}</span>
      ) : (
        <span className="ip-tile__row">{flags.map((g, k) => <img key={k} src={g.src} alt={g.label || ""} />)}{value ? <span className="ip-tile__value" style={{ fontSize: big ? "var(--fk)" : "var(--fv)" }}>{value}</span> : null}</span>
      )}
      {sub ? <span className="ip-tile__sub" style={subKorean ? { fontFamily: "'Noto Sans KR'" } : undefined}>{sub}</span> : null}
    </div>
  );
}
