// Idol profile — Lab 14a defaults (sharp, compact bar, cut tag, peek band, mono header) with the §6 fixes.
function IdolPhoto({ d, puffyName }) {
  const [h, setH] = React.useState(false);
  return (
    <div className="kit-photo" onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}>
      <div aria-hidden="true" className="kit-photo__tone"></div><div aria-hidden="true" className="kit-photo__beam"></div><div aria-hidden="true" className="kit-photo__beam kit-photo__beam--pink"></div>
      <div className="kit-photo__in">
        <div className="kit-photo__frame">
          <img src={d.img} alt={d.name + " photo"} style={{ transform: h ? "skewX(7deg) scale(1.26)" : "skewX(7deg) scale(1.2)" }} />
          <div aria-hidden="true" className="kit-photo__sweep" style={{ transform: h ? "translate3d(42%,0,0)" : "translate3d(0,0,0)", transitionDuration: h ? "1.2s" : ".8s" }}></div>
          <div aria-hidden="true" className="kit-photo__light"></div>
        </div>
      </div>
      <div className="kit-photo__name"><PP.GroupTag group={d.group} ko={d.groupKo} />{puffyName ? <h1 className="kit-puffname">{d.name}</h1> : <PP.CutoutName name={d.name} seed={d.id} />}</div>
    </div>
  );
}
function IdolScreen({ slug, puffyName, go, theme, toggle, openIdol, flash }) {
  const { BackButton, SlideSearch, ProfileTabs, ProfileTile, RelatedBand, RelatedCard } = PP;
  const d = PROFILE[slug] || PROFILES[0];
  const [tab, setTab] = React.useState("profile"), [q, setQ] = React.useState("");
  React.useEffect(() => { setTab("profile"); setQ(""); }, [slug]);
  const ent = v => String(v).replace(/ Entertainment\b/g, " Ent.");
  const qs = q.trim().toLowerCase();
  const results = PROFILES.filter(x => !qs || (x.name + " " + x.group + " " + x.label + " " + x.parent).toLowerCase().includes(qs)).map(x => ({ name: x.name, sub: x.group + " · " + ent(x.label), img: x.img, current: x === d, onPick: () => openIdol(x.slug) }));
  const deb = d.past.length && d.past[0].s < d.since ? "With " + d.past[0].group + " first" : "With " + d.group;
  const T = (label, value, span, o = {}) => ({ label, value, span, ...o });
  const facts = tab === "profile" ? [
    T("STAGE NAME", d.name, "3", { big: true }), T("REAL NAME", d.real, "3"), T("AGE", String(d.age), "2", { big: true, sub: "years old" }), T("HEIGHT", String(d.height), "2", { big: true, sub: "cm" }),
    T(d.natKey, d.nats.map(n => n.code).join(" · "), "2w", { flags: d.nats, sub: d.natText }), T("BORN", d.birthLong, "4"), T("DEBUT", String(d.debut), "2", { sub: deb }),
    T(d.positions.length > 1 ? "POSITIONS" : "POSITION", "", "6", { chips: d.positions.map(p => ({ label: p })) })
  ] : tab === "career" ? [
    T("CURRENT GROUP", d.group, "4", { sub: d.groupKo + " · " + d.groupLine }), T("FANDOM", d.fandom, "2"), T("LABEL", ent(d.label), "3"), T("PARENT COMPANY", ent(d.parent), "3"), T("IDOL COMPANY", ent(d.idolCo), "2"),
    d.past.length ? T(d.past.length > 1 ? "PAST GROUPS" : "PAST GROUP", "", "4", { chips: d.past.map(p => ({ label: p.group, sub: p.years })), chipOffset: 1 }) : T("PAST GROUPS", "None", "4", { sub: "First group" })
  ] : [
    T("AVAILABLE IN", "", "6", { chips: [{ label: "Classic" }, { label: "Blurry" }], sub: "Play a mode to guess " + d.name }), T("ADDED TO KPOPIT", "Dec 26, 2025", "3"), T("KPOPIT ID", d.no, "3")
  ];
  const related = PROFILES.filter(x => x !== d).sort((a, b) => (b.group === d.group) - (a.group === d.group) || Math.abs(a.debut - d.debut) - Math.abs(b.debut - d.debut)).slice(0, 6);
  return (
    <div className="pp-wrap kit-idol">
      <div aria-hidden="true" className="kit-hband"></div><div aria-hidden="true" className="kit-hband kit-hband--pink"></div><div aria-hidden="true" className="kit-hband kit-hband--line"></div>
      <KitNav compact screen="idol" go={go} theme={theme} toggle={toggle} />
      <div className="kit-toolbar">
        <div className="kit-toolbar__back"><BackButton onClick={() => go("idols")} /></div>
        <SlideSearch value={q} onChange={setQ} results={results} />
      </div>
      <section className="kit-hero" key={d.slug}>
        <IdolPhoto d={d} puffyName={puffyName} />
        <div className="kit-info">
          <ProfileTabs active={tab} onChange={setTab} />
          <div className="ip-panel kit-panel" key={tab}><div className="ip-tiles">{facts.map((f, k) => <ProfileTile key={f.label} index={k} {...f} />)}</div></div>
        </div>
      </section>
      <section className="kit-rel">
        <RelatedBand count={related.length + " IDOLS"} />
        <div className="ip-related">{related.map((x, k) => <RelatedCard key={x.slug} index={k} name={x.name} img={x.img} aria={x.name + " of " + x.group} onClick={() => openIdol(x.slug)} />)}</div>
      </section>
      <footer className="kit-idolfoot"><span>KpopIt · Idol data from the KpopIt catalogue</span><span className="kit-idolfoot__r"><span>Wrong info?</span><button className="kit-contact" onClick={() => flash("Contact is outside this kit.")}>Contact me</button></span></footer>
    </div>
  );
}
window.IdolScreen = IdolScreen;
