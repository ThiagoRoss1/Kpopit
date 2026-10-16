import React from "react";
const cx = (...c) => c.filter(Boolean).join(" ");

export function Panel({ variant = "card", className, style, children, ...rest }) {
  return <div {...rest} className={cx("kp-panel", `kp-panel--${variant}`, className)} style={style}>{children}</div>;
}
