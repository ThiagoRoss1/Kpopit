import React from "react";
const cx = (...c) => c.filter(Boolean).join(" ");

export function Pill({ tone = "paper", children, className }) {
  return <span className={cx("kp-pill", tone !== "paper" && `kp-pill--${tone}`, className)}>{children}</span>;
}
