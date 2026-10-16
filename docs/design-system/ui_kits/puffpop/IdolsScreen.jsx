// Idols catalogue — IdolsFormV2 defaults (dots ground, puff nav, lettering title, zoom hover, tag inside).
function IdolsScreen({ go, theme, toggle, openIdol }) {
  const { PuffTitle, PuffSearch, FilterButton, FilterMenu, AppliedChip, IdolCard, EmptyState } = PP;
  const [q, setQ] = React.useState(""), [f, setF] = React.useState({ group: "", nat: "", company: "", album: false }), [menu, setMenu] = React.useState(null);
  React.useEffect(() => { const h = e => { if (menu && !(e.target.closest && e.target.closest(".pp-filter"))) setMenu(null); }; document.addEventListener("pointerdown", h); return () => document.removeEventListener("pointerdown", h); }, [menu]);
  const qs = q.trim().toLowerCase();
  const match = (d, skip) => (skip === "group" || !f.group || d.groupLabel === f.group) && (skip === "nat" || !f.nat || d.nat.includes(f.nat)) && (skip === "company" || !f.company || d.company === f.company) && (skip === "album" || !f.album || d.album) && (d.name + " " + (d.group || "")).toLowerCase().includes(qs);
  const list = IDOLS.filter(d => match(d)), count = (skip, fn) => IDOLS.filter(d => match(d, skip) && fn(d)).length;
  const set = p => { setF(o => ({ ...o, ...p })); setMenu(null); };
  const dd = (key, title, w, label, all, values, fn, lab, fl) => (
    <FilterButton key={key} label={f[key] ? lab(f[key]) : label} flagSrc={key === "nat" && f.nat ? flag(f.nat) : undefined} minWidth={w} active={!!f[key]} open={menu === key} onClick={() => setMenu(menu === key ? null : key)}>
      <FilterMenu open={menu === key} title={title} onSelect={v => set({ [key]: v })}
        options={[{ label: all, value: "", count: count(key, () => true), selected: !f[key] }, ...values.map(v => ({ label: lab(v), value: v, count: count(key, d => fn(d, v)), selected: f[key] === v, flagSrc: fl ? flag(v) : undefined }))]} />
    </FilterButton>);
  const applied = [];
  if (f.group) applied.push([f.group, { group: "" }]); if (f.nat) applied.push([NAT[f.nat], { nat: "" }]); if (f.company) applied.push([f.company, { company: "" }]); if (f.album) applied.push(["In album", { album: false }]);
  const reset = () => { setQ(""); setF({ group: "", nat: "", company: "", album: false }); };
  return (
    <div className="pp-wrap">
      <KitNav screen="idols" go={go} theme={theme} toggle={toggle} />
      <PuffTitle title="Idols" ko="아이돌" count={IDOLS.length + " idols · " + IDOLS.filter(d => d.album).length + " in album"} />
      <div className="pp-controls">
        <PuffSearch value={q} onChange={setQ} />
        {dd("group", "GROUP", "104px", "Group", "All groups", uniq(IDOLS.map(d => d.groupLabel)), (d, v) => d.groupLabel === v, v => v)}
        {dd("nat", "NATIONALITY", "142px", "Nationality", "Anywhere", uniq(IDOLS.flatMap(d => d.nat)), (d, v) => d.nat.includes(v), v => NAT[v], true)}
        {dd("company", "COMPANY", "128px", "Company", "All companies", uniq(IDOLS.map(d => d.company)).sort(), (d, v) => d.company === v, v => v)}
        <FilterButton kind="toggle" label="In album" badge={count("album", d => d.album)} active={f.album} onClick={() => set({ album: !f.album })} />
      </div>
      <div className="pp-applied-row">
        <span aria-live="polite" style={{ marginRight: 4 }}>{(list.length === IDOLS.length ? "All " : "") + list.length + (list.length === 1 ? " idol" : " idols")}</span>
        {applied.map(([l, p]) => <AppliedChip key={l} label={l} onRemove={() => set(p)} />)}
        {applied.length + (q ? 1 : 0) > 1 ? <AppliedChip variant="clear" onRemove={reset} /> : null}
      </div>
      {list.length ? (
        <section aria-label="Idols catalogue" className="pp-grid">
          {list.map((d, i) => <IdolCard key={d.id} index={i} name={d.name} group={d.groupLabel} company={d.company} img={d.img} inAlbum={d.album} flags={d.nat.map(n => ({ src: flag(n), label: NAT[n] }))} onClick={() => openIdol(d.id)} />)}
        </section>
      ) : <EmptyState kind="empty" body={q ? "No matches for “" + q + "” with these filters." : "No matches with these filters."} onAction={reset} />}
      <KitFooter right="Sample catalogue · Album states are illustrative" />
    </div>
  );
}
window.IdolsScreen = IdolsScreen;
