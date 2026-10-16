import React from "react";
import { Cap } from "../labels/Cap.jsx";
import { Icon } from "../icons/Icon.jsx";
const coverBg = (h = 340) => `linear-gradient(150deg, oklch(0.64 0.16 ${h}), oklch(0.33 0.136 ${h + 26}))`;

export function ThemedCard({ title, group, description, tag = "THEMED", stickers, hue = 0, cap, locked = true }) {
  return (
    <div className="kp-panel kp-panel--card kp-themed">
      <div className="kp-themed__row">
        <div className="kp-themed__book" style={{ background: coverBg(hue) }}>
          <span className="kp-themed__spine" /><span className="kp-themed__cap">{cap}</span>
        </div>
        <div className="kp-themed__body">
          <Cap tone="pink" size="sm">{tag}</Cap>
          <p className="kp-themed__title">{title}</p>
          {group && stickers !== undefined && <Cap tone="faint" size="sm" className="kp-themed__meta">{group} · {stickers} stk</Cap>}
          {description && <p className="kp-themed__desc">{description}</p>}
        </div>
      </div>
      {locked && <div className="kp-themed__foot"><Cap tone="faint"><Icon name="lock" size={12} /> Coming soon</Cap></div>}
    </div>
  );
}
