import React from "react";
import { PixelCluster } from "./PixelCluster.jsx";
const cx = (...c) => c.filter(Boolean).join(" ");

const coverBg = (h = 340) => `linear-gradient(150deg, oklch(0.64 0.16 ${h}), oklch(0.33 0.136 ${h + 26}))`;

export function GuessRow({ title, subtitle, coverSrc, coverHue = 340, correct, tilt = "left", animate }) {
  const left = tilt === "left";
  return (
    <div className={left ? "kp-tilt-l" : "kp-tilt-r"}>
      <div className={cx("kp-guess", animate && "is-enter")}>
        <span className={cx("kp-fabric", left ? "kp-fabric--r" : "kp-fabric--l")} aria-hidden="true" />
        <div className={cx("kp-guess__row", correct ? "is-correct" : "is-incorrect")}>
          <div className="kp-guess__cover">
            {coverSrc ? <img src={coverSrc} alt={`${title} cover`} draggable={false} /> : <div className="kp-guess__ph" style={{ background: coverBg(coverHue) }} />}
          </div>
          <div className="kp-guess__text">
            <div className="kp-guess__title">{title}</div>
            {subtitle && <div className="kp-guess__sub">{subtitle}</div>}
          </div>
          <PixelCluster ok={correct} pop={animate} />
        </div>
      </div>
    </div>
  );
}
