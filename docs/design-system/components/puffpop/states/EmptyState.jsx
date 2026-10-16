import React from "react";
const COPY = { empty: ["No idols found.", "No matches with these filters.", "Clear search & filters"], error: ["The catalogue couldn’t load.", "Your search is still here.", "Try again"] };
export function EmptyState({ kind = "empty", title, body, cta, onAction, skeletons = 8 }) {
  if (kind === "loading") return <div className="pp-grid" aria-busy="true">{Array.from({ length: skeletons }, (_, i) => <div key={i} className="pp-skeleton"></div>)}</div>;
  const c = COPY[kind] || COPY.empty;
  return (
    <div className="pp-empty" data-puff-anim="" role={kind === "error" ? "alert" : undefined}>
      <div className="pp-empty__title">{title ?? c[0]}</div>
      <div className="pp-empty__body">{body ?? c[1]}</div>
      {onAction ? <button className="pp-pinkbtn" onClick={onAction}>{cta ?? c[2]}</button> : null}
    </div>
  );
}
