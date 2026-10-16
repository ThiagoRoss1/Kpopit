import React from "react";
export function InfoRow({ icon, title, children }) {
  return (
    <div className="kp-inforow">
      <div className="kp-inforow__icon">{icon}</div>
      <div><p className="kp-inforow__title">{title}</p><p className="kp-inforow__body">{children}</p></div>
    </div>
  );
}
