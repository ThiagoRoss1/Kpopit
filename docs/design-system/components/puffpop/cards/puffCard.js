import React from "react";
export const cx = (...c) => c.filter(Boolean).join(" ");
/** hover/press state shared by IdolCard + AlbumCard (same handlers as the canonical pages). */
export function usePuffCard(onClick) {
  const [hv, setHv] = React.useState(false), [pr, setPr] = React.useState(false);
  React.useEffect(() => { if (!pr) return; const up = () => setPr(false); window.addEventListener("pointerup", up); return () => window.removeEventListener("pointerup", up); }, [pr]);
  const kt = React.useRef(0);
  const handlers = {
    onClick, onMouseEnter: () => setHv(true), onMouseLeave: () => { setHv(false); setPr(false); }, onFocus: () => setHv(true), onBlur: () => { setHv(false); setPr(false); },
    onPointerDown: e => { if (e.button === 0) setPr(true); }, onPointerUp: () => setPr(false), onPointerCancel: () => setPr(false),
    onKeyDown: e => { if (e.key === "Enter" || e.key === " ") { setPr(true); clearTimeout(kt.current); kt.current = setTimeout(() => setPr(false), 140); } }
  };
  return { hv, pr, state: pr ? "press" : hv ? "hover" : "rest", handlers };
}
export function cardMotion(index, hv, pr) {
  const sgn = index % 2 ? 1 : -1, tr = -sgn * 4, trh = -sgn * 9;
  return {
    rot: hv ? "translate3d(0,0,0) rotate(0deg)" : `translate3d(0,0,0) rotate(calc(var(--tilt) * ${sgn}))`,
    lift: pr ? "translate3d(var(--depth),var(--depth),0)" : hv ? "translate3d(-1px,-3px,0)" : "translate3d(0,0,0)",
    nameT: pr ? "translate3d(1px,1.5px,0)" : hv ? "translate3d(-1px,-1px,0)" : "translate3d(0,0,0)",
    tagT: pr ? `translate3d(2px,3px,0) rotate(${tr}deg)` : hv ? `translate3d(1px,-4px,0) rotate(${trh}deg) scale(1.06)` : `translate3d(0,0,0) rotate(${tr}deg)`,
    tagSh: (pr ? "0 0 0 #1A1418" : hv ? "3px 5px 0 #1A1418" : "2px 3px 0 #1A1418") + ",inset 0 1.5px 0 rgba(255,255,255,.6)",
    dur: pr ? ".12s" : undefined
  };
}
