import React from "react";
export function PuffTitle({ title, ko, count, as: Tag = "h1", className }) {
  return (
    <header className={"pp-head" + (className ? " " + className : "")} data-puff-anim="">
      <div className="pp-head__l"><Tag className="pp-title">{title}</Tag>{ko ? <span className="pp-kochip" lang="ko">{ko}</span> : null}</div>
      {count ? <span className="pp-head__count">{count}</span> : null}
    </header>
  );
}
