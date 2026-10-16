import React from "react";
export function RelatedCard({ name, img, index = 0, onClick, aria }) {
  return (
    <button className="ip-rcard" onClick={onClick} aria-label={aria || name} style={{ transform: `rotate(${index % 2 ? 1.2 : -1.2}deg)` }}>
      <span className="ip-rcard__photo"><img src={img} alt="" /></span>
      <span className="ip-rcard__name">{name}</span>
    </button>
  );
}
