import React from "react";
const cx = (...c) => c.filter(Boolean).join(" ");

const coverBg = (h = 340) => `linear-gradient(150deg, oklch(0.64 0.16 ${h}), oklch(0.33 0.136 ${h + 26}))`;

export function Vinyl({ coverSrc, coverHue, spinning = true, size = 220, pixelated, className, style }) {
  return (
    <div className={className} style={{ width: size, height: size, ...style }}>
      <div className={cx("kp-vinyl", spinning && "is-spinning")}>
        <div className="kp-vinyl__spin">
          <div className="kp-vinyl__label">
            {coverSrc ? <img src={coverSrc} alt="" draggable={false} className={pixelated ? "kp-pixelated" : undefined} />
              : <div className="kp-cover-ph" style={coverHue != null ? { background: coverBg(coverHue) } : undefined} />}
          </div>
        </div>
        <div className="kp-vinyl__light" />
        <div className="kp-vinyl__hole" />
      </div>
    </div>
  );
}
