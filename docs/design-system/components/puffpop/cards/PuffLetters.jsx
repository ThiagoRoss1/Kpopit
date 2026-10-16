import React from "react";
const D = { rest: [1.6, 2.2], hover: [2.6, 3.4], press: [0.6, 0.8] };
const t = (x, y) => `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`;
export function PuffLetters({ text, state = "rest", depth, className }) {
  const d = depth || D[state] || D.rest;
  return (
    <span className={"pp-letters" + (className ? " " + className : "")}>
      <span aria-hidden="true" className="pp-letters__back" style={{ transform: t(d[0], d[1]) }}>{text}</span>
      <span aria-hidden="true" className="pp-letters__mid" style={{ transform: t(d[0] * 2 / 3, d[1] * 2 / 3) }}>{text}</span>
      <span aria-hidden="true" className="pp-letters__mid" style={{ transform: t(d[0] / 3, d[1] / 3) }}>{text}</span>
      <span className="pp-letters__face">{text}</span>
    </span>
  );
}
