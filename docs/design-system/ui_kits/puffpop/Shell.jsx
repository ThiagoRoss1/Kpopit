// Shared chrome for kit screens: nav + footer + notice.
function KitNav({ screen, go, theme, toggle, compact }) {
  const { PuffNav } = PP;
  return <PuffNav compact={compact} logoSrc={AS + "logos/kpopit-icon-svg.svg"} word={compact ? "" : screen === "albums" ? "· albums" : "· idols"} onLogoClick={e => { e.preventDefault(); go("idols"); }} theme={theme} onToggleTheme={toggle}
    items={[{ label: "Play", onClick: () => go("play") }, { label: "Idols", active: screen === "idols" || screen === "idol", onClick: () => go("idols") }, { label: "Albums", active: screen === "albums", onClick: () => go("albums") }]} />;
}
function KitFooter({ right }) {
  return <footer className="kit-foot"><span>KpopIt</span><span>{right}</span></footer>;
}
Object.assign(window, { KitNav, KitFooter });
