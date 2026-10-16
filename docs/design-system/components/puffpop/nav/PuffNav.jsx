import React from "react";
const Moon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 14a8 8 0 0 1-10-10 8.5 8.5 0 1 0 10 10Z"></path></svg>;
const Sun = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"></path></svg>;
export function PuffNav({ word = "· idols", logoSrc, logoHref = "#", onLogoClick, items = [], theme = "day", onToggleTheme, compact = false, className }) {
  return (
    <nav className={"pp-nav" + (compact ? " pp-nav--compact" : "") + (className ? " " + className : "")} data-puff-anim="">
      <a className="pp-nav__logo" href={logoHref} onClick={onLogoClick} aria-label={"KpopIt " + (word || "home").replace(/^[·\s]+/, "")}>
        {logoSrc ? <img src={logoSrc} alt="K" /> : null}{word ? <span className="pp-nav__word">{word}</span> : null}
      </a>
      <div className="pp-nav__items">
        {items.map((it, i) => <button key={i} className="pp-navpill" aria-current={it.active ? "page" : undefined} onClick={it.active ? undefined : it.onClick}>{it.label}</button>)}
        <button className="pp-toggle" onClick={onToggleTheme} aria-label="Switch day and night">{theme === "night" ? <Sun /> : <Moon />}</button>
      </div>
    </nav>
  );
}
