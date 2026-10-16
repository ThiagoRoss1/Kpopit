import React from "react";
import { Icon } from "../icons/Icon.jsx";
const cx = (...c) => c.filter(Boolean).join(" ");

export function RewardBanner({ level = 1, isNew, groupPhoto, linkLabel = "View your collections", href = "#" }) {
  const headline = isNew ? "New card collected!" : level === 3 ? `Card maxed out! - LV.${level}` : `Card leveled up! — LV.${level}`;
  return (
    <div className={cx("kp-reward", `kp-reward--l${level}`)}>
      <div className="kp-reward__head"><span>{headline}</span><span className="kp-reward__icon"><Icon name="book" size={18} /></span></div>
      {groupPhoto && <p className="kp-reward__photo">Group photo unlocked!</p>}
      <a className="kp-reward__link" href={href}>{linkLabel} <Icon name="arrow-right" size={14} /></a>
    </div>
  );
}
