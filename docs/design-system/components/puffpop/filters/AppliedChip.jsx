import React from "react";
export function AppliedChip({ label, onRemove, variant = "chip" }) {
  if (variant === "clear") return <button className="pp-clearall" onClick={onRemove}>{label || "Clear all"}</button>;
  return (
    <button className="pp-applied" onClick={onRemove} aria-label={"Remove " + label}>
      <span>{label}</span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="m7 7 10 10M17 7 7 17"></path></svg>
    </button>
  );
}
