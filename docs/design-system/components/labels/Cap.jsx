import React from "react";
const cx = (...c) => c.filter(Boolean).join(" ");

export function Cap({ tone = "accent", size = "md", children, className }) {
  return <span className={cx("kp-cap", `kp-cap--${tone}`, size === "sm" && "kp-cap--sm", className)}>{children}</span>;
}
