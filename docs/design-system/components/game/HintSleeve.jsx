import React from "react";
const cx = (...c) => c.filter(Boolean).join(" ");

export function HintSleeve({ label, korean, index, value, tone = "year", remaining = 0, defaultOpen = false }) {
  const [open, setOpen] = React.useState(defaultOpen);
  const unlocked = remaining <= 0;
  const isOpen = unlocked && open;
  return (
    <div className={cx("kp-hint", unlocked && "is-unlocked", isOpen && "is-open")}
      role={unlocked ? "button" : undefined} tabIndex={unlocked ? 0 : undefined}
      aria-label={unlocked ? `${label} hint` : `${label} hint, locked`}
      onClick={() => unlocked && setOpen(!open)}
      onKeyDown={(e) => { if (unlocked && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setOpen(!open); } }}>
      <div className="kp-hint__disc"><div className="kp-hint__label"><span>{isOpen ? value : ""}</span></div></div>
      <div className={cx("kp-hint__sleeve", `kp-hint__sleeve--${tone}`)}>
        <div className="kp-hint__top"><span>Hint</span><span className="kp-hint__idx">{index}</span></div>
        <div>
          <div className="kp-hint__name">{label}</div>
          {korean && <div className="kp-hint__ko">{korean}</div>}
        </div>
        <div className="kp-hint__state">{unlocked ? (isOpen ? "Tap to hide" : "Tap to reveal") : "locked"}</div>
        {!unlocked && <div className="kp-hint__badge">+ {remaining}</div>}
      </div>
    </div>
  );
}
