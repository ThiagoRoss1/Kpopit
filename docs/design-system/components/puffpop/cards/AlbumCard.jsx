import React from "react";
import { cx, usePuffCard, cardMotion } from "./puffCard.js";
import { PuffLetters } from "./PuffLetters.jsx";
const TAG = { Japanese: "JP release", English: "EN release" };
export function AlbumCard({ name, artist, type, year, img, lang = "Korean", tag, index = 0, delay, onClick, className }) {
  const { hv, pr, state, handlers } = usePuffCard(onClick);
  const [broken, setBroken] = React.useState(false);
  const m = cardMotion(index, hv, pr);
  const label = tag ?? TAG[lang];
  return (
    <div className="pp-card-in" data-puff-anim="" style={{ animationDelay: delay ?? Math.min(260 + index * 45, 900) + "ms" }}>
      <div className={cx("pp-card pp-card--album", hv && "is-hover", pr && "is-press", className)} style={{ transform: m.rot }}>
        <div aria-hidden="true" className="pp-card__side"></div>
        <button className="pp-card__face" aria-label={`${name}, ${year}`} style={{ transform: m.lift, transitionDuration: m.dur }} {...handlers}>
          <div aria-hidden="true" className="pp-card__dots"><div></div></div>
          <div className="pp-album__box">
            <div aria-hidden="true" className="pp-album__disc">
              <div className="pp-album__grooves"></div><div className="pp-album__shine"></div>
              <div className="pp-album__label"><img src={img} alt="" /></div><div className="pp-album__hole"></div>
            </div>
            <div className="pp-album__cover">
              {!broken ? <img src={img} alt={name + " cover"} onError={() => setBroken(true)} /> : <div className="pp-card__broken">{(name.match(/[A-Za-z0-9]/) || ["♪"])[0]}<small>Cover unavailable</small></div>}
              <div aria-hidden="true" className="pp-album__sweep"></div>
              {year ? <span className="pp-year">{year}</span> : null}
            </div>
          </div>
          <div className="pp-card__name" style={{ transform: m.nameT }}><PuffLetters text={name} state={state} /></div>
          <div className="pp-card__meta"><span>{artist}</span>{type ? <span>· {type}</span> : null}</div>
          {label ? <span className="pp-tag" style={{ transform: m.tagT, boxShadow: m.tagSh, transitionDuration: m.dur }}>{label}</span> : null}
        </button>
      </div>
    </div>
  );
}
