import React from "react";
const BG = ["#FFFFFF", "#1A1418", "#FF3399", "#FAF6F0", "#FF8AC4"], FG = ["#1A1418", "#FFFFFF", "#1A1418", "#1A1418", "#1A1418"];
const ROT = [-6, 4, -3, 7, -5, 3, -7, 5], DY = ["0px", "-5px", "3px", "-2px", "5px", "-4px"];
export function CutoutName({ name, seed = 0 }) {
  const len = name.length, scale = len <= 5 ? 1 : len <= 7 ? .86 : len <= 9 ? .74 : .64;
  return (
    <div className="ip-cutout" role="img" aria-label={name}>
      {name.toUpperCase().split("").map((ch, k) => {
        if (ch === " ") return <i key={k} aria-hidden="true"></i>;
        const c = (k * 3 + seed) % 5;
        return <span key={k} aria-hidden="true" style={{ background: BG[c], color: FG[c], fontSize: `calc(var(--rn) * ${(k % 2 ? scale * .82 : scale).toFixed(3)})`, transform: `rotate(${ROT[k % 8]}deg) translateY(${DY[k % 6]})` }}>{ch}</span>;
      })}
    </div>
  );
}
