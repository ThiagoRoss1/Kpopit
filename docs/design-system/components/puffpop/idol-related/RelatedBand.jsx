import React from "react";
export function RelatedBand({ title = "related idols", ko = "관련 아이돌", count, font = "mono" }) {
  return (
    <div className="ip-band">
      <div aria-hidden="true" className="ip-band__bar"></div><div aria-hidden="true" className="ip-band__pink"></div><div aria-hidden="true" className="ip-band__line"></div>
      <div className="ip-band__in">
        <h2 className={"ip-band__title" + (font !== "mono" ? " ip-band__title--" + font : "")}>{title}</h2>
        <span className="ip-band__meta">{ko ? <span className="ip-band__ko" lang="ko">{ko}</span> : null}{count ? <span className="ip-band__count">{count}</span> : null}</span>
      </div>
    </div>
  );
}
