import React from "react";
const cx = (...c) => c.filter(Boolean).join(" ");

export function IconButton({ variant = "round", label, className, children, ...rest }) {
  return (
    <button type="button" aria-label={label} title={label} {...rest} className={cx("kp-iconbtn", `kp-iconbtn--${variant}`, className)}>
      {children}
    </button>
  );
}
