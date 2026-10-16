import React from "react";
const cx = (...c) => c.filter(Boolean).join(" ");

export function WashiTape({ angle = -34.8, width = 88, height = 22, style, className }) {
  return <span aria-hidden="true" className={cx("kp-washi", className)} style={{ width, height, transform: `rotate(${angle}deg)`, ...style }} />;
}
