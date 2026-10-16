import React from "react";
const cx = (...c) => c.filter(Boolean).join(" ");

export function PixelCluster({ ok, pop }) {
  return <div className={cx("kp-cluster", ok ? "kp-cluster--ok" : "kp-cluster--no", pop && "is-pop")} role="img" aria-label={ok ? "Correct" : "Incorrect"}><i /><i /><i /><i /></div>;
}
