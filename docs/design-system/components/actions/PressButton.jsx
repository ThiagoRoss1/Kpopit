import React from "react";
const cx = (...c) => c.filter(Boolean).join(" ");

export function PressButton({ variant = "primary", size = "md", block, iconStart, iconEnd, className, children, type = "button", ...rest }) {
  return (
    <button type={type} {...rest} className={cx("kp-press", `kp-press--${variant}`, `kp-press--${size}`, block && "kp-press--block", className)}>
      {iconStart}
      {variant === "outline" ? <span className="kp-press__mono">{children}</span> : children}
      {iconEnd}
    </button>
  );
}
