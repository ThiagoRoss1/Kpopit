import React from "react";
export function StatTile({ icon, value, label }) {
  return (
    <div className="kp-stat" tabIndex={0}>
      {typeof icon === "string" ? <img src={icon} alt="" draggable={false} /> : icon}
      <div className="kp-stat__value">{value}</div>
      <div className="kp-stat__label">{label}</div>
    </div>
  );
}
