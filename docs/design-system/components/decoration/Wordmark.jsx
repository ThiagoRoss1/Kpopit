import React from "react";
const cx = (...c) => c.filter(Boolean).join(" ");

export function Wordmark({ first = "Kpop", second = "It", size = "md", brand, as: Tag = "h1", className }) {
  return (
    <Tag className={cx("kp-wordmark", `kp-wordmark--${size}`, brand && "kp-wordmark--brand", className)}>
      <span className="kp-wordmark__a">{first}</span><span className="kp-wordmark__b">{second}</span>
    </Tag>
  );
}
