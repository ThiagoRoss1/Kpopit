import React from "react";
import { cx, usePuffCard, cardMotion } from "./puffCard.js";
import { PuffLetters } from "./PuffLetters.jsx";
export function IdolCard({ name, group, company, img, flags = [], inAlbum = false, index = 0, delay, onClick, className }) {
  const { hv, pr, state, handlers } = usePuffCard(onClick);
  const [broken, setBroken] = React.useState(false);
  const m = cardMotion(index, hv, pr);
  return (
    <div className="pp-card-in" data-puff-anim="" style={{ animationDelay: delay ?? Math.min(260 + index * 45, 900) + "ms" }}>
      <div className={cx("pp-card", hv && "is-hover", pr && "is-press", className)} style={{ transform: m.rot }}>
        <div aria-hidden="true" className="pp-card__side"></div>
        <button className="pp-card__face" aria-label={name} style={{ transform: m.lift, transitionDuration: m.dur }} {...handlers}>
          <div className="pp-card__well">
            <div aria-hidden="true" className="pp-card__wellside"></div>
            <div className="pp-card__photo">
              {!broken ? <img src={img} alt={name} onError={() => setBroken(true)} /> : <div className="pp-card__broken">{name[0]}<small>Photo unavailable</small></div>}
              <div className="pp-card__flags">{flags.map((f, j) => <img key={j} src={f.src} alt={f.label || ""} style={{ marginLeft: j ? "-7px" : 0, transform: `translate3d(0,0,0) rotate(${j ? 6 : -4}deg)` }} />)}</div>
            </div>
          </div>
          <div className="pp-card__name" style={{ transform: m.nameT }}><PuffLetters text={name} state={state} /></div>
          <div className="pp-card__meta"><span>{group || "Soloist"}</span>{company ? <span>· {company}</span> : null}</div>
          {inAlbum ? <span className="pp-tag" style={{ transform: m.tagT, boxShadow: m.tagSh, transitionDuration: m.dur }}>In album</span> : null}
        </button>
      </div>
    </div>
  );
}
