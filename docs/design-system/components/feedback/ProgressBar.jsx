import React from "react";
const cx = (...c) => c.filter(Boolean).join(" ");

export function ProgressBar({ value, segments = 5, label }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="kp-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={v} aria-label={label}>
      <div className="kp-progress__track"><div className="kp-progress__fill" style={{ width: `${v}%` }} /></div>
      {segments > 0 && (
        <div className="kp-progress__segs">
          {Array.from({ length: segments }, (_, i) => (
            <div key={i} className={cx("kp-progress__seg", v >= ((i + 1) * 100) / segments && "is-on")} />
          ))}
        </div>
      )}
    </div>
  );
}
