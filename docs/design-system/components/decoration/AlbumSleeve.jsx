import React from "react";
import { WashiTape } from "./WashiTape.jsx";
const cx = (...c) => c.filter(Boolean).join(" ");

const coverBg = (h = 340) => `linear-gradient(150deg, oklch(0.64 0.16 ${h}), oklch(0.33 0.136 ${h + 26}))`;

export function AlbumSleeve({ coverSrc, coverHue, note = "Guess the album", showQuestion, tape = true, tilt = -4, width = 300, pixelBlock, className, style }) {
  return (
    <div className={cx("kp-sleeve", className)} style={{ width, transform: `rotate(${tilt}deg)`, ...style }}>
      <div className="kp-sleeve__inner">
        {tape && <><WashiTape className="kp-sleeve__tape kp-sleeve__tape--l" angle={-34.8} width="22%" /><WashiTape className="kp-sleeve__tape kp-sleeve__tape--r" angle={34.8} width="22%" style={{ left: "auto", right: -24 }} /></>}
        <div className="kp-sleeve__cover">
          {coverSrc ? <img src={coverSrc} alt="Album cover" draggable={false} className={pixelBlock ? "kp-pixelated" : undefined} />
            : <div className="kp-cover-ph" style={coverHue != null ? { background: coverBg(coverHue), filter: pixelBlock ? `blur(${pixelBlock / 3}px)` : undefined } : undefined} />}
          {showQuestion && <div className="kp-sleeve__q">?</div>}
          <span className="kp-sleeve__corner kp-sleeve__corner--tl" /><span className="kp-sleeve__corner kp-sleeve__corner--tr" />
          <span className="kp-sleeve__corner kp-sleeve__corner--bl" /><span className="kp-sleeve__corner kp-sleeve__corner--br" />
        </div>
      </div>
      {note && <div className="kp-sleeve__note">{note}</div>}
    </div>
  );
}
